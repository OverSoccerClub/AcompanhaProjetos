// CORS do único endpoint público de escrita (`POST /api/v1/intakes`) — só o
// domínio do site institucional pode chamá-lo a partir do navegador (seção
// 4.2). Sem credenciais (o endpoint não usa cookie). Lista configurável via
// `INTAKE_ALLOWED_ORIGINS` (separada por vírgula) para dev/staging.
function allowedOrigins(): string[] {
  return (process.env.INTAKE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | null): boolean {
  // Sem header Origin (chamada servidor-a-servidor, curl, teste automatizado)
  // não há política de MESMA ORIGEM do navegador para aplicar — deixamos
  // passar para a validação de conteúdo decidir. Navegadores SEMPRE mandam
  // Origin em POST cross-origin, então isso não abre brecha para o caso que
  // o CORS existe para proteger (um site de terceiros lendo a resposta via
  // fetch do browser da vítima).
  if (!origin) return true;
  return allowedOrigins().includes(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    Vary: "Origin",
  };
}
