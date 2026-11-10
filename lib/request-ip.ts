// Identifica o IP do cliente a partir dos headers do proxy reverso
// (EasyPanel/Traefik). Usado para rate limit de IP (magic-link, intakes) e
// para o hash de IP do Intake — nunca o único controle de segurança, mas
// precisa ser resistente a forjamento, senão o próprio rate-limit que ele
// alimenta é trivial de contornar.
//
// `X-Forwarded-For` é uma lista "cliente, proxy1, proxy2, ..." em que CADA
// proxy pelo caminho ACRESCENTA um valor à direita — ele nunca reescreve o
// que já está lá. Isso significa que o valor mais à ESQUERDA (índice 0) é
// sempre fornecido pelo requisitante e é livremente forjável (um atacante
// pode mandar `X-Forwarded-For: 1.2.3.4` na própria requisição). Pegar o
// primeiro valor (comportamento antigo deste módulo) usava exatamente o dado
// forjável — um atacante trocava de "IP" a cada requisição e pulava o
// rate-limit por IP inteiro.
//
// A correção é confiar apenas nos últimos N hops (TRUST_PROXY_HOPS), que
// correspondem aos proxies que o PRÓPRIO deploy controla. Com exatamente 1
// proxy confiável na frente do app (topologia padrão EasyPanel/Traefik deste
// projeto — client -> Traefik -> container), o IP real do cliente é o
// primeiro valor ACRESCENTADO por esse proxy, ou seja, o penúltimo da lista
// recebida pelo app (o último pode ter sido acrescentado por um hop interno
// adicional, dependendo da malha). Ver `.env.example` para a nota sobre
// confirmar com o Vulcano se o proxy em produção SUBSTITUI ou ACRESCENTA ao
// header recebido do cliente — se ele substitui, `TRUST_PROXY_HOPS=1`
// também funciona (a lista chega ao app com um único valor, sempre o real).
import "server-only";
import { headers } from "next/headers";

const DEFAULT_TRUST_PROXY_HOPS = 1;

function resolveTrustProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw === undefined || raw.trim() === "") return DEFAULT_TRUST_PROXY_HOPS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_TRUST_PROXY_HOPS;
  return parsed;
}

/** Aplica a heurística de hops confiáveis a uma lista já separada de
 * `X-Forwarded-For`. Exportada só para teste unitário direto da lógica de
 * índice (sem precisar montar um objeto Headers). */
export function resolveTrustedForwardedIp(forwardedHeader: string, trustProxyHops: number): string | null {
  const parts = forwardedHeader
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  // Índice do primeiro valor ACRESCENTADO por um hop confiável — tudo à
  // esquerda dele é fornecido pelo cliente (forjável). `Math.max(0, ...)`
  // cobre o caso de a lista ter menos entradas do que hops confiáveis
  // configurados (proxy mal configurado/hop faltando) sem lançar: cai para o
  // valor mais à esquerda disponível em vez de estourar o índice.
  const index = Math.max(0, parts.length - trustProxyHops);
  return parts[index] ?? parts[0];
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return resolveClientIp(h);
}

function resolveClientIp(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) {
    const resolved = resolveTrustedForwardedIp(forwarded, resolveTrustProxyHops());
    if (resolved) return resolved;
  }
  return requestHeaders.get("x-real-ip") ?? "unknown";
}

/** Mesma heurística, mas a partir de um objeto Headers de um NextRequest —
 * usado nas rotas públicas (ex. POST /api/v1/intakes) que já têm o
 * `request.headers` em mãos e não precisam do helper de contexto do Next. */
export function getClientIpFromHeaders(requestHeaders: Headers): string {
  return resolveClientIp(requestHeaders);
}
