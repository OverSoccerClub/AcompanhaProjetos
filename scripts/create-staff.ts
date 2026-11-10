// CLI para criar/atualizar conta STAFF — única forma permitida (seção 2 da
// arquitetura: "Contas STAFF são criadas somente por script de linha de
// comando — nunca por tela", mesmo padrão do `create-admin` do Pontua.me).
//
// `--password` é OPCIONAL: sem ele, a conta nasce/permanece sem senha (só
// link mágico). Com ele, o upsert grava/TROCA o hash — é também como se
// reseta a senha de um staff existente (o próprio dono roda o comando de
// novo com `--password` novo quando alguém esquece a senha).
//
// Uso:
//   npm run create-staff -- --email=equipe@innovarecode.com.br --name="Equipe InnovareCode"
//   npm run create-staff -- --email=equipe@innovarecode.com.br --name="Equipe InnovareCode" --password="umaSenhaForte123"
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/crypto";

const MIN_PASSWORD_LENGTH = 10;

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
  const password = args.password;

  if (!email || !email.includes("@") || !name) {
    console.error(
      'Uso: npm run create-staff -- --email="voce@innovarecode.com.br" --name="Seu Nome" [--password="senha"]'
    );
    process.exit(1);
  }
  if (password !== undefined && password.length < MIN_PASSWORD_LENGTH) {
    console.error(`[create-staff] --password precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    process.exit(1);
  }

  // Hash calculado ANTES do upsert — nunca gravamos a senha em claro em
  // nenhum passo, nem passageiramente numa variável que vá para log/erro.
  const passwordHash = password !== undefined ? await hashPassword(password) : undefined;

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: "STAFF", active: true, ...(passwordHash !== undefined && { passwordHash }) },
    create: { email, name, role: "STAFF", active: true, ...(passwordHash !== undefined && { passwordHash }) },
  });

  console.log(`[create-staff] STAFF pronto: ${user.email} (${user.id}).`);
  if (passwordHash !== undefined) {
    console.log("[create-staff] Senha definida — peça para ele entrar em /entrar com e-mail e senha.");
  } else {
    console.log(
      "[create-staff] Sem senha definida — peça para ele entrar em /entrar pela opção \"link mágico\", ou rode este comando de novo com --password para definir uma."
    );
  }
}

main()
  .catch((err) => {
    console.error("[create-staff] Falha:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
