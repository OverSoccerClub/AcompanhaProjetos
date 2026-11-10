// Utilitários de hash/geração de segredos — mesmo contrato do Painel de
// Missões (lib/crypto.ts): nenhum segredo (token de link mágico, token de
// sessão) é persistido em claro. O que fica salvo é sempre `sha256Hex(valor)`;
// o valor em claro só existe em memória no momento da emissão (e-mail/cookie).
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number }
) => Promise<Buffer>;

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

// --- Senha de STAFF (login por e-mail+senha) -------------------------------
// scrypt (node:crypto), não bcrypt/argon2: zero dependência nova, e scrypt já
// é o que o Node expõe nativamente com custo de memória configurável (o que
// falta no PBKDF2). Parâmetros abaixo são os recomendados pelo OWASP para
// scrypt interativo (N=2^14, r=8, p=1) — custo perceptível só em ataque de
// força bruta offline, imperceptível num login humano único.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

/** Formato de armazenamento auto-descritivo (`scrypt:N:r:p:saltHex:hashHex`)
 * — se os parâmetros de custo mudarem no futuro, hashes antigos continuam
 * verificáveis (os parâmetros usados na criação viajam com o hash, não
 * dependem de uma constante global que pode ter mudado). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

/**
 * Recalcula o scrypt com os MESMOS parâmetros/salt gravados no hash e compara
 * em tempo constante (`safeCompareHex`). Nunca lança — entrada mal formada
 * (hash corrompido/formato antigo) devolve `false`, igual a senha errada, o
 * que evita diferenciar os dois casos por exceção/latência.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
  const N = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const keylen = Buffer.from(hashHex, "hex").length;
    const derivedKey = await scrypt(password, salt, keylen, { N, r, p });
    return safeCompareHex(derivedKey.toString("hex"), hashHex);
  } catch {
    // Parâmetros/salt corrompidos o suficiente para o próprio scrypt lançar
    // (ex. N não é potência de 2) — trata como "senha não confere".
    return false;
  }
}
