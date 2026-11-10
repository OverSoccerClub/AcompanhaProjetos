// Utilitários de hash/geração de segredos — mesmo contrato do Painel de
// Missões (lib/crypto.ts): nenhum segredo (token de link mágico, token de
// sessão) é persistido em claro. O que fica salvo é sempre `sha256Hex(valor)`;
// o valor em claro só existe em memória no momento da emissão (e-mail/cookie).
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** SHA-256 em hex de uma string qualquer. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Compara duas strings hex em tempo constante. Retorna `false` (sem lançar)
 * se os tamanhos diferirem — `timingSafeEqual` lançaria nesse caso, o que
 * vazaria informação de tamanho via stack trace/latência de exceção.
 */
export function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Gera um segredo opaco de alta entropia (256 bits) em base64url — usado
 * para o token em claro do link mágico e para o token de sessão. Nunca
 * persistido; só `sha256Hex(generateOpaqueToken())` é gravado no banco.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}
