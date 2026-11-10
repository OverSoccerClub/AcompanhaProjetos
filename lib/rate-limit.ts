// Rate limiting simples em memória, por processo. Mesmo módulo do Painel de
// Missões (lib/rate-limit.ts) — suficiente para a escala assumida deste app
// (< 10 acessos simultâneos, seção 0 da arquitetura). Se o deploy passar a
// rodar múltiplas réplicas, o contador deixa de ser global — nesse cenário
// seria necessário um store compartilhado (Redis).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

let callsSinceCleanup = 0;
function cleanupExpired(now: number) {
  callsSinceCleanup += 1;
  if (callsSinceCleanup < 200) return;
  callsSinceCleanup = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitOptions = {
  /** Número máximo de chamadas permitidas dentro da janela. */
  limit: number;
  /** Duração da janela em milissegundos. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Segundos até a janela resetar — usado no header `Retry-After`. */
  retryAfterSeconds: number;
};

/** Verifica e consome uma unidade do limite para `key`. */
export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds };
}
