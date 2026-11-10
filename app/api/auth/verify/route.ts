// POST /api/auth/verify { token } — passo 2 do login (seção 5.1/5.2).
// SÓ este POST consome o token (nunca o GET de /entrar, que só exibe a
// página com o botão "Entrar" — ver app/entrar/page.tsx). Aceita tanto
// `application/json` (chamadas programáticas/teste) quanto
// `application/x-www-form-urlencoded` (o <form> real da página /entrar,
// que funciona mesmo sem JavaScript no navegador do cliente).
import { NextResponse, type NextRequest } from "next/server";
import { consumeMagicLinkToken } from "@/lib/magic-link";
import { apiError } from "@/lib/http-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function extractToken(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const token = (body as Record<string, unknown> | null)?.token;
    return typeof token === "string" ? token : null;
  }
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  return typeof token === "string" ? token : null;
}

export async function POST(request: NextRequest) {
  const token = await extractToken(request);
  if (!token) {
    return apiError(400, "LINK_INVALID", "Token ausente.");
  }

  const userAgent = request.headers.get("user-agent");
  const result = await consumeMagicLinkToken(token, userAgent);
  if (!result) {
    return apiError(400, "LINK_INVALID", "Link inválido, expirado ou já utilizado.");
  }

  const destination = result.user.role === "STAFF" ? "/admin" : "/portal";

  // Requisição JSON (teste/API) recebe JSON; o <form> real da página
  // /entrar recebe o 303 nativo do navegador (não precisa de JS).
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, redirectTo: destination }, { status: 200 });
  }
  return NextResponse.redirect(new URL(destination, request.url), { status: 303 });
}
