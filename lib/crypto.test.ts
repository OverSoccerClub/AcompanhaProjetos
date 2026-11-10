// Unitário, sem banco — só a lógica de hash/verificação de senha (scrypt).
// `lib/crypto.ts` não importa "server-only" de propósito (scripts/*.ts fora
// do Next precisam importá-lo — ver comentário no próprio arquivo e a
// armadilha documentada na memória do projeto sobre `server-only` em
// `dependencies`), então este teste não precisa do mock de `next/headers`.
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, safeCompareHex } from "./crypto";

describe("hashPassword / verifyPassword", () => {
  it("a senha certa verifica contra o próprio hash", async () => {
    const hash = await hashPassword("umaSenhaForte123");
    expect(await verifyPassword("umaSenhaForte123", hash)).toBe(true);
  });

  it("senha errada NÃO verifica", async () => {
    const hash = await hashPassword("umaSenhaForte123");
    expect(await verifyPassword("outraSenhaQualquer", hash)).toBe(false);
  });

  it("dois hashes da MESMA senha são diferentes (salt aleatório por chamada)", async () => {
    const [a, b] = await Promise.all([hashPassword("repete-comigo"), hashPassword("repete-comigo")]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("repete-comigo", a)).toBe(true);
    expect(await verifyPassword("repete-comigo", b)).toBe(true);
  });

  it("hash em formato inválido devolve false em vez de lançar", async () => {
    await expect(verifyPassword("qualquer", "isso-nao-e-um-hash-scrypt")).resolves.toBe(false);
    await expect(verifyPassword("qualquer", "scrypt:abc:8:1:aa:bb")).resolves.toBe(false);
  });
});

describe("safeCompareHex", () => {
  it("compara em tempo constante sem lançar para tamanhos diferentes", () => {
    expect(safeCompareHex("ab", "abcd")).toBe(false);
    expect(safeCompareHex("abcd", "abcd")).toBe(true);
  });
});
