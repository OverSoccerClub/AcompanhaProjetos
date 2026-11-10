// POST /api/auth/magic-link { email } — passo 1 do login (seção 5.1).
// SEMPRE responde 202 com a mesma mensagem, exista ou não a conta — sem
// isso o endpoint vira um oráculo de enumeração de e-mail de cliente.
import { NextResponse, type NextRequest } from "next/server";
import { requestMagicLink } from "@/lib/magic-link";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/request-ip";
import { apiError } from "@/lib/http-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_MESSAGE = "Se este e-mail estiver cadastrado, você vai receber um link de acesso em instantes.";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Corpo não é um JSON válido.");
  }

  const email = (body as Record<string, unknown>)?.email;
  if (typeof email !== "string" || email.trim().length < 3 || !email.includes("@")) {
    return apiError(400, "VALIDATION_ERROR", "E-mail inválido.", { email: "invalid" });
  }

  const ip = getClientIpFromHeaders(request.headers);
  const normalizedEmail = email.trim().toLowerCase();

  // Rate limit por IP e por e-mail (o e-mail por si só impede flood contra
  // UMA conta a partir de IPs diferentes; o IP impede flood de tentativas
  // contra e-mails variados do mesmo requisitante).
  const ipRate = checkRateLimit(`magic-link-ip:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  const emailRate = checkRateLimit(`magic-link-email:${normalizedEmail}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!ipRate.allowed || !emailRate.allowed) {
    // Mesmo aqui, resposta genérica — não revela QUAL limite bateu.
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE }, { status: 202 });
  }

  try {
    await requestMagicLink(normalizedEmail, ip);
  } catch (err) {
    // Nunca propaga o erro para a resposta (evitaria enumeração por timing
    // de erro) — loga para investigação e responde igual.
    console.error("[auth/magic-link] Falha ao processar pedido de link.", err);
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE }, { status: 202 });
}
