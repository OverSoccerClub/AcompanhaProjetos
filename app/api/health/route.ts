// GET /api/health — health check de deploy (EasyPanel/Docker). Confirma que
// o processo subiu E que o app fala com o banco. Sem dado sensível na
// resposta. Sempre dinâmico.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[health] Falha ao conectar ao banco:", error);
    return NextResponse.json({ status: "error", reason: "database" }, { status: 503 });
  }
}
