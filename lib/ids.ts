// Geração dos códigos legíveis (protocolo do Intake, código do Project).
// Gerados pela aplicação; o banco só garante unicidade (`@unique` no
// schema). Sempre chamados DENTRO da transação que cria a linha, com retry
// no chamador em caso de colisão (ver lib/intakes.ts e app/actions/intake-admin.ts)
// — contar "quantos já existem este ano" dentro da própria tentativa
// resolve corrida concorrente sem precisar de uma sequência dedicada no
// Postgres, aceitável nesta escala (< 50 projetos/ano).
import type { Prisma } from "@/lib/generated/prisma/client";

export async function generateIntakeProtocol(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const count = await tx.intake.count({ where: { createdAt: { gte: start } } });
  return `BRF-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function generateProjectCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const count = await tx.project.count({ where: { createdAt: { gte: start } } });
  return `IC-${year}-${String(count + 1).padStart(3, "0")}`;
}
