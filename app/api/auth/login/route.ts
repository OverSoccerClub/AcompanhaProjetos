// POST /api/auth/login { email, password } — login de STAFF por e-mail+senha
// (alternativa ao link mágico, pedida porque a equipe acessa os projetos
// várias vezes por dia). CLIENT não tem este caminho — `loginWithPassword`
// já devolve `null` para qualquer CLIENT, mesmo com senha certa (não tem).
//
// Aceita tanto `application/json` (fetch/teste) quanto
// `application/x-www-form-urlencoded` (o <form> real de /entrar, que
// funciona mesmo sem JavaScript) — mesmo contrato de POST /api/auth/verify.
//
// Resposta UNIFORME (401 UNAUTHORIZED, mesma mensagem) para: e-mail não
// cadastrado, e-mail de CLIENT, STAFF sem senha definida e senha errada —
// nenhum desses casos pode ser distinguível por quem chama (ver comentário
// de DUMMY_HASH em lib/login.ts para o motivo do timing também ser uniforme).
import { NextResponse, type NextRequest } from "next/server";
import { loginWithPassword } from "@/lib/login";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/request-ip";
import { apiError } from "@/lib/http-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 200;
const INVALID_MESSAGE = "E-mail ou senha incorretos.";

type Credentials = { email: string; password: string } | null;

async function extractCredentials(request: NextRequest): Promise<Credentials> {
  const contentType = request.headers.get("content-type") ?? "";
  let email: unknown;
  let password: unknown;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    email = (body as Record<string, unknown> | null)?.email;
    password = (body as Record<string, unknown> | null)?.password;
  } else {
    const form = await request.formData().catch(() => null);
    email = form?.get("email");
    password = form?.get("password");
  }

  if (typeof email !== "string" || typeof password !== "string") return null;
  return { email, password };
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const credentials = await extractCredentials(request);

  if (
    !credentials ||
    credentials.email.trim().length < 3 ||
    !credentials.email.includes("@") ||
    credentials.email.length > MAX_EMAIL_LENGTH ||
    credentials.password.length < 1 ||
    credentials.password.length > MAX_PASSWORD_LENGTH
  ) {
    // Validação de FORMATO (campo ausente/vazio/absurdamente longo) é
    // diferente de "credencial errada" — aqui ainda não consultamos o
    // banco, então não há nada a enumerar.
    return apiError(400, "VALIDATION_ERROR", "Informe e-mail e senha.");
  }

  const ip = getClientIpFromHeaders(request.headers);
  const normalizedEmail = credentials.email.trim().toLowerCase();

  // Rate limit por IP (credential stuffing de um requisitante contra vários
  // e-mails) e por e-mail (força bruta contra UMA conta de IPs diferentes).
  const ipRate = checkRateLimit(`login-ip:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
  const emailRate = checkRateLimit(`login-email:${normalizedEmail}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!ipRate.allowed || !emailRate.allowed) {
    const retryAfterSeconds = Math.max(ipRate.retryAfterSeconds, emailRate.retryAfterSeconds);
    return apiError(429, "RATE_LIMITED", "Muitas tentativas. Tente novamente em instantes.", undefined, {
      "Retry-After": String(retryAfterSeconds),
    });
  }

  const userAgent = request.headers.get("user-agent");
  let result: Awaited<ReturnType<typeof loginWithPassword>>;
  try {
    result = await loginWithPassword(normalizedEmail, credentials.password, userAgent);
  } catch (err) {
    console.error("[auth/login] Falha inesperada ao autenticar.", err);
    return apiError(500, "INTERNAL_ERROR", "Não foi possível entrar agora. Tente novamente em instantes.");
  }

  if (!result) {
    return apiError(401, "UNAUTHORIZED", INVALID_MESSAGE);
  }

  // STAFF sempre cai em /admin — este endpoint nunca autentica CLIENT (ver
  // lib/login.ts), então não há outro destino possível.
  if (isJson) {
    return NextResponse.json({ ok: true, redirectTo: "/admin" }, { status: 200 });
  }
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
