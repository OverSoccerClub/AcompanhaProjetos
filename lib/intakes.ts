// Lógica de criação de Intake — chamada só por `POST /api/v1/intakes`
// (route handler cuida de CORS/rate-limit/honeypot/validação de forma; este
// módulo cuida do efeito no banco). Ponto crítico do Cronos: `idempotencyKey`
// é `@unique` → uma violação de unicidade é o CAMINHO FELIZ do reenvio
// (duplo clique, retry de rede), não um erro — devolve o registro já
// existente com 201, nunca 500.
import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { generateIntakeProtocol } from "@/lib/ids";
import type { ValidatedIntakePayload } from "@/lib/intake-validation";

export type CreateIntakeInput = {
  payload: ValidatedIntakePayload;
  idempotencyKey: string | null;
  requestIpHash: string | null;
};

export type CreateIntakeResult = {
  intakeId: string;
  protocol: string;
  /** `false` quando o resultado veio de uma repetição idempotente — útil só
   * para log/observabilidade, a resposta HTTP é 201 nos dois casos. */
  created: boolean;
};

function isUniqueViolationOn(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray(err.meta?.target) &&
    (err.meta!.target as string[]).includes(field)
  );
}

const MAX_PROTOCOL_ATTEMPTS = 5;

/** Acha (por CNPJ) ou cria o `Client` a partir dos dados de empresa do
 * envelope. Sem CNPJ informado, cria um `Client` novo a cada chamada — o
 * schema não tem e-mail na tabela Client para deduplicar por outra chave, e
 * inventar uma heurística por nome (`marca`) arriscaria juntar empresas
 * diferentes com o mesmo nome comercial. Pendência registrada para
 * Nova/Cronos caso o volume real mostre necessidade de um critério melhor. */
async function findOrCreateClient(
  tx: Prisma.TransactionClient,
  company: ValidatedIntakePayload["company"]
) {
  if (company.cnpj) {
    const existing = await tx.client.findUnique({ where: { cnpj: company.cnpj } });
    if (existing) return existing;
  }
  return tx.client.create({
    data: {
      name: company.marca,
      cnpj: company.cnpj ?? null,
      segment: company.segmento,
      city: company.cidade_uf?.split("/")[0]?.trim() || null,
      state: company.cidade_uf?.split("/")[1]?.trim().slice(0, 2) || null,
      currentWebsite: company.site_atual ?? null,
      instagram: company.instagram ?? null,
      facebook: company.facebook ?? null,
      linkedin: company.linkedin ?? null,
    },
  });
}

export async function createIntake(input: CreateIntakeInput): Promise<CreateIntakeResult> {
  const { payload, idempotencyKey, requestIpHash } = input;

  // Caminho rápido: se já existe um Intake com esta chave, devolve direto —
  // evita pagar uma transação inteira (client upsert + geração de
  // protocolo) numa repetição que sabemos de antemão que vai colidir.
  if (idempotencyKey) {
    const existing = await prisma.intake.findUnique({ where: { idempotencyKey } });
    if (existing) return { intakeId: existing.id, protocol: existing.protocol, created: false };
  }

  for (let attempt = 0; attempt < MAX_PROTOCOL_ATTEMPTS; attempt++) {
    try {
      const intake = await prisma.$transaction(async (tx) => {
        const client = await findOrCreateClient(tx, payload.company);
        const protocol = await generateIntakeProtocol(tx);
        return tx.intake.create({
          data: {
            protocol,
            schemaVersion: payload.schemaVersion,
            source: payload.source,
            payload: payload as unknown as Prisma.InputJsonValue,
            consentAt: new Date(),
            consentTextVersion: payload.consent.textVersion,
            requestIpHash,
            idempotencyKey,
            clientId: client.id,
          },
        });
      });
      return { intakeId: intake.id, protocol: intake.protocol, created: true };
    } catch (err) {
      if (isUniqueViolationOn(err, "idempotencyKey") && idempotencyKey) {
        // Corrida: outra requisição com a MESMA chave venceu entre o
        // caminho rápido acima e esta transação. Devolve o resultado dela.
        const existing = await prisma.intake.findUnique({ where: { idempotencyKey } });
        if (existing) return { intakeId: existing.id, protocol: existing.protocol, created: false };
      }
      if (isUniqueViolationOn(err, "protocol") && attempt < MAX_PROTOCOL_ATTEMPTS - 1) {
        // Colisão de protocolo por corrida concorrente (dois Intakes do
        // mesmo ano criados ao mesmo tempo) — tenta de novo, o próximo
        // `count()` já reflete a linha que acabou de ganhar a corrida.
        continue;
      }
      throw err;
    }
  }
  throw new Error("Falha ao gerar protocolo único após várias tentativas.");
}
