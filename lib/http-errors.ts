// Formato de erro padronizado — vale para TODA a API pública do Acompanhe
// (seção 4.2 da arquitetura): `{ error: { code, message?, fields? } }`,
// nunca texto solto. `code` é estável (o frontend trata por ele);
// `message` é só para humano/log; `fields` é usado em VALIDATION_ERROR para
// apontar qual campo falhou.
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "ORIGIN_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "LINK_INVALID"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export function apiError(
  status: number,
  code: ApiErrorCode,
  message?: string,
  fields?: Record<string, string>,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(
    { error: { code, ...(message && { message }), ...(fields && { fields }) } },
    { status, headers: extraHeaders }
  );
}
