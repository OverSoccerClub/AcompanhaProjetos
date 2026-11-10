// POST /api/v1/intakes — endpoint PÚBLICO (sem login) que recebe o
// briefing do formulário `solicitar-site.html` (contrato §4.2 da
// arquitetura). Runtime nodejs (usa o adapter-pg do Prisma, que fala TCP
// com o Postgres — não roda em Edge).
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { sha256Hex } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIpFromHeaders } from "@/lib/request-ip";
import { isOriginAllowed, corsHeaders } from "@/lib/intake-cors";
import { validateIntakePayload, MAX_BODY_BYTES } from "@/lib/intake-validation";
import { createIntake } from "@/lib/intakes";
import { sendIntakeConfirmation, sendNewIntakeNotification } from "@/lib/email";
import { apiError } from "@/lib/http-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 }; // 5/h por IP (contrato §4.2)
const IDEMPOTENCY_KEY_MAX_LEN = 64;

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!isOriginAllowed(origin)) {
    return apiError(403, "ORIGIN_NOT_ALLOWED", undefined, undefined, headers);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type precisa ser application/json.", undefined, headers);
  }

  const ip = getClientIpFromHeaders(request.headers);
  const rate = checkRateLimit(`intake:${ip}`, RATE_LIMIT);
  if (!rate.allowed) {
    return apiError(429, "RATE_LIMITED", "Muitas requisições. Tente novamente em instantes.", undefined, {
      ...headers,
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return apiError(413, "PAYLOAD_TOO_LARGE", undefined, undefined, headers);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Corpo não é um JSON válido.", undefined, headers);
  }

  const validation = validateIntakePayload(parsedJson);
  if (!validation.ok) {
    return apiError(400, "VALIDATION_ERROR", "Campos inválidos.", validation.fields, headers);
  }

  // Honeypot: bot preencheu o campo "website" — resposta 201 FALSA, nada é
  // persistido. Log sem PII (não gravamos nome/e-mail do tentante).
  if (validation.isHoneypot) {
    console.warn("[intakes] Honeypot acionado — requisição descartada sem persistir.", { ip });
    return NextResponse.json(
      { intakeId: randomUUID(), protocolo: "BRF-0000-0000" },
      { status: 201, headers }
    );
  }

  const rawIdempotencyKey = request.headers.get("idempotency-key");
  const idempotencyKey =
    rawIdempotencyKey && rawIdempotencyKey.trim().length > 0
      ? rawIdempotencyKey.trim().slice(0, IDEMPOTENCY_KEY_MAX_LEN)
      : null;

  try {
    const result = await createIntake({
      payload: validation.data,
      idempotencyKey,
      requestIpHash: sha256Hex(ip),
    });

    // Best-effort, nunca bloqueia a resposta ao lead por falha de e-mail —
    // só dispara no caminho "criado de verdade" (não em repetição idempotente
    // nem em honeypot, que já retornou antes de chegar aqui).
    if (result.created) {
      sendNewIntakeNotification({
        protocol: result.protocol,
        marca: validation.data.company.marca,
        contactName: validation.data.contact.nome,
        contactEmail: validation.data.contact.email,
      }).catch((err) => console.error("[intakes] Falha ao notificar equipe (não-crítico).", err));

      sendIntakeConfirmation({
        to: validation.data.contact.email,
        protocol: result.protocol,
        marca: validation.data.company.marca,
      }).catch((err) => console.error("[intakes] Falha ao enviar confirmação ao contato (não-crítico).", err));
    }

    return NextResponse.json({ intakeId: result.intakeId, protocolo: result.protocol }, { status: 201, headers });
  } catch (err) {
    console.error("[intakes] Falha ao criar intake.", err);
    return apiError(500, "INTERNAL_ERROR", undefined, undefined, headers);
  }
}
