// Mesmo padrão do Painel de Missões: Prisma 7 + driver adapter (@prisma/adapter-pg)
// em runtime — sem binário de engine nativo. Vega herda este arquivo quando
// montar o app Next.js em volta deste Prisma; não deveria precisar reescrevê-lo.
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
