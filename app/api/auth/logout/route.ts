// POST /api/auth/logout — revoga a sessão atual (carimba `revokedAt`,
// nunca deleta a linha), limpa o cookie, redireciona para /entrar.
import { NextResponse, type NextRequest } from "next/server";
import { revokeCurrentSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await revokeCurrentSession();
  return NextResponse.redirect(new URL("/entrar", request.url), { status: 303 });
}
