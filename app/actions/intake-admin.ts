"use server";

// Server Actions do admin para a fila de intakes (seção 4.3 da
// arquitetura). Toda action aqui chama `requireStaff()` como primeira
// linha — a checagem de ROLE (não só "está logado") é o que impede um
// CLIENT de disparar uma conversão mesmo adivinhando o nome da action.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { IntakeStatus, ProjectStatus, UpdateType, Visibility } from "@/lib/generated/prisma/enums";
import { requireStaff } from "@/lib/session";
import { generateProjectCode } from "@/lib/ids";
import { applyStageTemplate } from "@/lib/stage-template";
import { requestMagicLink } from "@/lib/magic-link";
import { normalizePagination, type PaginationInput } from "@/lib/pagination";

export type ListIntakesInput = PaginationInput & {
  status?: (typeof IntakeStatus)[keyof typeof IntakeStatus];
  /** Busca simples por nome do cliente (contains, case-insensitive) — só
   * filtra, não ordena por relevância. */
  q?: string;
};

/** Fila de triagem — sempre paginada por OFFSET (nunca "todos os intakes").
 * `total` reflete o MESMO `where` da página (filtro/busca preservados), não
 * o total geral da tabela. */
export async function listIntakes(input: ListIntakesInput = {}) {
  await requireStaff();
  const { page, pageSize, skip } = normalizePagination(input);
  const q = input.q?.trim();
  const where: Prisma.IntakeWhereInput = {
    ...(input.status && { status: input.status }),
    ...(q && { client: { name: { contains: q, mode: "insensitive" } } }),
  };

  const [items, total] = await Promise.all([
    prisma.intake.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        protocol: true,
        status: true,
        source: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.intake.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/** Contagem de intakes por status (KPIs e pílulas de filtro do admin — §6.12
 * do design system). Uma única query de agregação, nunca N chamadas de
 * `count()` por status. */
export async function getIntakeStatusCounts(): Promise<Record<string, number>> {
  await requireStaff();
  const groups = await prisma.intake.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<string, number> = {};
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

/** Só a contagem de intakes NOVO — usada no badge da sidebar do admin
 * (`AdminShell`), que precisa ser leve porque renderiza em toda página. */
export async function countNewIntakes(): Promise<number> {
  await requireStaff();
  return prisma.intake.count({ where: { status: IntakeStatus.NOVO } });
}

export async function getIntake(intakeId: string) {
  await requireStaff();
  return prisma.intake.findUnique({
    where: { id: intakeId },
    include: { client: true, project: { select: { id: true, code: true } } },
  });
}

export type ConvertIntakeInput = {
  title: string;
  projectType: "SITE";
  contactName: string;
  contactEmail: string;
};

export type ConvertIntakeResult =
  | { ok: true; projectId: string; projectCode: string }
  | { ok: false; error: string };

/** Erro de validação de negócio ESPERADO dentro da transação de conversão
 * (hoje só o conflito de e-mail de contato). Marcador próprio (em vez de
 * comparar `err.message`) para distinguir, no `catch` abaixo, "a conversão
 * não pode prosseguir por uma regra de negócio" de qualquer outra falha
 * inesperada (conexão caiu etc.) que deve continuar subindo. */
class ConvertIntakeValidationError extends Error {}

/**
 * Converte um Intake em Project (seção 5.3): cria o Project, semeia as
 * etapas do template (§3), cria/reusa o User CLIENT do contato e dispara o
 * link mágico de boas-vindas. Tudo numa única transação, exceto o envio do
 * e-mail (efeito externo — roda só depois do commit, best-effort).
 *
 * IMPORTANTE (causa raiz do "Minified React error #441" relatado em
 * produção): esta action é chamada DIRETO como função (`await
 * convertIntake(...)`) pelo `ConvertIntakeForm`, não via `<form action>`.
 * Nesse modo de chamada, o Next.js trata QUALQUER erro lançado (`throw`) de
 * dentro de uma Server Action como falha inesperada e, em build de
 * PRODUÇÃO, redige a mensagem original por segurança — o cliente recebe só
 * o erro genérico "An error occurred in the Server Components render..."
 * (digest), que o runtime do React exibe como "Minified React error #441".
 * Em dev isso não aparece porque o dev build NÃO redige mensagens — por
 * isso o sintoma só batia em produção. Antes desta correção, toda falha de
 * NEGÓCIO esperada aqui (título curto, e-mail inválido, intake já
 * convertido, e-mail de contato já usado por outro cliente) usava `throw
 * new Error(mensagem amigável)`, e a mensagem amigável nunca chegava ao
 * usuário em produção — só o #441.
 *
 * Correção: erros de validação/regra de negócio ESPERADOS não lançam mais —
 * voltam como `{ ok: false, error }` (união discriminada), que atravessa a
 * ponte de Server Action como DADO comum (nunca é redigido, porque não é um
 * `throw`). Só uma falha genuinamente inesperada (ex.: banco fora do ar)
 * ainda lança — nesse caso é correto que produção esconda o detalhe interno
 * (pode conter informação sensível) e mostre algo genérico.
 */
export async function convertIntake(
  intakeId: string,
  input: ConvertIntakeInput
): Promise<ConvertIntakeResult> {
  const staff = await requireStaff();

  if (typeof input.title !== "string" || input.title.trim().length < 2) {
    return { ok: false, error: "Título do projeto precisa ter ao menos 2 caracteres." };
  }
  const email = input.contactEmail?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "E-mail de contato inválido." };
  }
  if (typeof input.contactName !== "string" || input.contactName.trim().length < 2) {
    return { ok: false, error: "Nome de contato inválido." };
  }

  const intake = await prisma.intake.findUnique({ where: { id: intakeId } });
  if (!intake) return { ok: false, error: "Intake não encontrado." };
  if (intake.status === IntakeStatus.CONVERTIDO) {
    return { ok: false, error: "Este intake já foi convertido em projeto." };
  }

  let project;
  let userId: string;
  try {
    ({ project, userId } = await prisma.$transaction(async (tx) => {
      const code = await generateProjectCode(tx);
      const project = await tx.project.create({
        data: {
          code,
          title: input.title.trim(),
          type: input.projectType,
          status: ProjectStatus.BRIEFING_RECEBIDO,
          clientId: intake.clientId,
        },
      });

      await applyStageTemplate(tx, project.id, input.projectType);

      await tx.intake.update({
        where: { id: intake.id },
        data: { status: IntakeStatus.CONVERTIDO, projectId: project.id },
      });

      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: { email, name: input.contactName.trim(), role: "CLIENT", clientId: intake.clientId },
        });
      } else if (user.role !== "CLIENT" || user.clientId !== intake.clientId) {
        throw new ConvertIntakeValidationError(
          "Este e-mail já está cadastrado para outro papel ou outra empresa."
        );
      }

      await tx.projectUpdate.create({
        data: {
          projectId: project.id,
          authorId: staff.id,
          type: UpdateType.STATUS,
          visibility: Visibility.CLIENTE,
          text: `Projeto criado a partir do briefing ${intake.protocol}.`,
        },
      });

      return { project, userId: user.id };
    }));
  } catch (err) {
    if (err instanceof ConvertIntakeValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }

  // Fora da transação: efeito externo (e-mail). Best-effort — se falhar, o
  // staff pode reenviar o convite via `inviteClientUser` depois.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await requestMagicLink(user.email, null).catch((err) =>
      console.error("[intake-admin] Falha ao enviar convite de boas-vindas (não-crítico).", err)
    );
  }

  return { ok: true, projectId: project.id, projectCode: project.code };
}

export type DeleteIntakeResult = { ok: true; id: string; protocol: string } | { ok: false; error: string };

/** Exclui um Intake (descartado por engano, lixo de teste, etc). Diferente
 * de `deleteProject`: aqui é o INTAKE que some, não o Project. O schema não
 * tem nenhuma FK apontando PARA Intake — é Intake.projectId → Project
 * (onDelete: SetNull, migração `20261110121453_init`), sentido contrário —
 * então um Project já convertido a partir deste intake NUNCA é tocado por
 * este delete; ele só perde a origem histórica (o `project.projectId` do
 * intake deixa de existir junto com a linha, mas o Project não referencia o
 * Intake de volta, então não há nada para desvincular nele).
 *
 * Idempotente por convergência (mesmo padrão de `deleteProject`): a primeira
 * chamada apaga; um retry/duplo-clique encontra o registro já ausente e
 * falha com "Intake não encontrado" — nunca um efeito duplicado.
 *
 * Erros esperados (id inválido, registro não encontrado) voltam como
 * `{ ok: false, error }`, nunca `throw` — mesma correção do #441 aplicada em
 * `convertIntake` (ver nota lá): esta action é chamada direto por
 * `RowDeleteButton` (`deleteIntake.bind(null, intake.id)`), e um `throw`
 * aqui seria redigido pelo Next.js em produção. */
export async function deleteIntake(intakeId: string): Promise<DeleteIntakeResult> {
  await requireStaff();

  if (typeof intakeId !== "string" || intakeId.trim().length < 1) {
    return { ok: false, error: "Id de intake inválido." };
  }

  try {
    const deleted = await prisma.intake.delete({
      where: { id: intakeId },
      select: { id: true, protocol: true },
    });
    return { ok: true, ...deleted };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, error: "Intake não encontrado." };
    }
    throw err;
  }
}
