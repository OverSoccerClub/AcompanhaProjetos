// CLI para criar conta STAFF — única forma permitida (seção 2 da
// arquitetura: "Contas STAFF são criadas somente por script de linha de
// comando — nunca por tela", mesmo padrão do `create-admin` do Pontua.me).
//
// Uso: npm run create-staff -- --email=equipe@innovarecode.com.br --name="Equipe InnovareCode"
import "dotenv/config";
import { prisma } from "../lib/prisma";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email?.trim().toLowerCase();
  const name = args.name?.trim();

  if (!email || !email.includes("@") || !name) {
    console.error('Uso: npm run create-staff -- --email="voce@innovarecode.com.br" --name="Seu Nome"');
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: "STAFF", active: true },
    create: { email, name, role: "STAFF", active: true },
  });

  console.log(`[create-staff] STAFF pronto: ${user.email} (${user.id}).`);
  console.log("[create-staff] Peça para ele entrar em /entrar com este e-mail — o login é por link mágico.");
}

main()
  .catch((err) => {
    console.error("[create-staff] Falha:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
