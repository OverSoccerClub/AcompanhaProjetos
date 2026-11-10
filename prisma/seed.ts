// Seed mínimo de desenvolvimento: 1 usuário STAFF + 1 Intake de exemplo (sem
// Client/Project — simula o estado real logo após o formulário público
// enviar um briefing, antes de qualquer conversão). Idempotente (upsert):
// rodar de novo não duplica nem quebra.
//
// Contas STAFF em produção são criadas SÓ por script de linha de comando
// (regra da arquitetura, seção 2) — este seed é o único lugar em que isso
// acontece neste repo nesta fase; Vega troca por `create-staff` quando o app
// existir.
import { prisma } from "../lib/prisma";

async function main() {
  const staff = await prisma.user.upsert({
    where: { email: "equipe@innovarecode.com.br" },
    update: {},
    create: {
      email: "equipe@innovarecode.com.br",
      name: "Equipe InnovareCode",
      role: "STAFF",
      active: true,
    },
  });
  console.log(`[seed] Staff: ${staff.email} (${staff.id})`);

  // Toda Intake exige um Client (upsert por marca, espelhando o efeito
  // colateral do POST /api/v1/intakes real — ver contrato 4.2).
  const client = await prisma.client.upsert({
    where: { cnpj: "00000000000191" },
    update: {},
    create: {
      name: "Exemplo Comércio e Serviços Ltda",
      cnpj: "00000000000191",
      segment: "Varejo",
      city: "São Paulo",
      state: "SP",
    },
  });

  const intake = await prisma.intake.upsert({
    where: { protocol: "BRF-2026-0001" },
    update: {},
    create: {
      protocol: "BRF-2026-0001",
      schemaVersion: 1,
      source: "solicitar-site",
      status: "NOVO",
      consentAt: new Date(),
      consentTextVersion: "2026-11",
      clientId: client.id,
      payload: {
        schemaVersion: 1,
        source: "solicitar-site",
        consent: { lgpd: true, textVersion: "2026-11" },
        contact: {
          nome: "Maria Exemplo",
          email: "maria@exemplo.com.br",
          whatsapp: "11999990000",
          cargo: "Sócia",
        },
        company: {
          marca: "Exemplo Comércio e Serviços",
          cnpj: "00.000.000/0001-91",
          segmento: "Varejo",
          cidade_uf: "São Paulo/SP",
          descricao_da_empresa: "Loja de produtos para o dia a dia.",
        },
        briefing: {
          objetivo_principal: ["Vender online"],
          estilo_desejado: ["Moderno", "Clean"],
          paginas_desejadas: ["Home", "Produtos", "Contato"],
        },
      },
    },
  });
  console.log(`[seed] Intake: ${intake.protocol} (${intake.id})`);
}

main()
  .catch((err) => {
    console.error("[seed] Falhou:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
