// Integração contra Postgres REAL do login por link mágico (seção 5.1/5.2
// da arquitetura). Mint manual do token reaproveitando sha256Hex/
// generateOpaqueToken de lib/crypto.ts (mesma técnica documentada na memória
// da Lyra: `acompanhe-telas-fase1`) — sem precisar de SMTP configurado.
//
// `next/headers` é mockado com um Map em memória (mesmo padrão de
// lib/access.test.ts no Painel de Missões): o que importa aqui é a lógica
// REAL de uso único do token contra o banco, não a plataforma de cookies do
// Next (que exige um request-scope que não existe fora do servidor).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "dotenv";

config();
import { assertLocalDatabase, qaId } from "@/test/helpers/db-guard";
assertLocalDatabase();

const cookieState = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieState.store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      cookieState.store.set(name, value);
    },
    delete: (name: string) => {
      cookieState.store.delete(name);
    },
  }),
}));

let prisma: typeof import("@/lib/prisma").prisma;
let sha256Hex: typeof import("@/lib/crypto").sha256Hex;
let generateOpaqueToken: typeof import("@/lib/crypto").generateOpaqueToken;
let consumeMagicLinkToken: typeof import("@/lib/magic-link").consumeMagicLinkToken;
let verifyRoute: typeof import("@/app/api/auth/verify/route");
let magicLinkRoute: typeof import("@/app/api/auth/magic-link/route");
let NextRequest: typeof import("next/server").NextRequest;

const clientId = qaId("client");
const userEmail = `${qaId("user")}@example.com`;
let userId: string;

beforeAll(async () => {
  ({ prisma } = await import("@/lib/prisma"));
  ({ sha256Hex, generateOpaqueToken } = await import("@/lib/crypto"));
  ({ consumeMagicLinkToken } = await import("@/lib/magic-link"));
  verifyRoute = await import("@/app/api/auth/verify/route");
  magicLinkRoute = await import("@/app/api/auth/magic-link/route");
  ({ NextRequest } = await import("next/server"));

  await prisma.client.create({ data: { id: clientId, name: "QA Cliente Link Mágico" } });
  const user = await prisma.user.create({
    data: { email: userEmail, name: "QA Usuário", role: "CLIENT", clientId, active: true },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.magicLinkToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.client.deleteMany({ where: { id: clientId } });
});

beforeEach(() => {
  cookieState.store.clear();
});

/** Mint manual de um MagicLinkToken válido, sem passar por e-mail/SMTP —
 * grava só o hash (mesmo contrato de lib/magic-link.ts), devolve o raw token
 * em claro como o link de verdade devolveria em `?t=<token>`. */
async function mintToken(overrides: { expiresAt?: Date; usedAt?: Date | null } = {}) {
  const rawToken = generateOpaqueToken();
  await prisma.magicLinkToken.create({
    data: {
      userId,
      tokenHash: sha256Hex(rawToken),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
      usedAt: overrides.usedAt ?? null,
    },
  });
  return rawToken;
}

function verifyRequest(token: string) {
  return new NextRequest("http://localhost:3000/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

describe("GET não consome o token (estrutural)", () => {
  it("a rota /api/auth/verify só exporta POST — não existe GET para consumir o token", () => {
    expect(verifyRoute.POST).toBeTypeOf("function");
    expect((verifyRoute as Record<string, unknown>).GET).toBeUndefined();
  });

  it("app/entrar/page.tsx (a página que renderiza no GET) não referencia consumeMagicLinkToken nem lib/magic-link", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../app/entrar/page.tsx", import.meta.url), "utf-8");
    expect(source).not.toMatch(/consumeMagicLinkToken|lib\/magic-link/);
  });
});

describe("POST consome o token — uso único", () => {
  it("primeiro POST com o token válido autentica e marca usedAt no banco", async () => {
    const sessionsBefore = await prisma.session.count({ where: { userId } });
    const rawToken = await mintToken();
    const res = await verifyRoute.POST(verifyRequest(rawToken));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.redirectTo).toBe("/portal"); // role CLIENT

    const tokenRow = await prisma.magicLinkToken.findUnique({ where: { tokenHash: sha256Hex(rawToken) } });
    expect(tokenRow?.usedAt).not.toBeNull();

    // Efeito colateral de autenticação real: criou exatamente 1 Session nova.
    const sessionsAfter = await prisma.session.count({ where: { userId } });
    expect(sessionsAfter).toBe(sessionsBefore + 1);
  });

  it("repetir o MESMO POST com o token já usado devolve 400 LINK_INVALID — não autentica de novo", async () => {
    const rawToken = await mintToken();
    const first = await verifyRoute.POST(verifyRequest(rawToken));
    expect(first.status).toBe(200);
    const sessionsAfterFirst = await prisma.session.count({ where: { userId } });

    const second = await verifyRoute.POST(verifyRequest(rawToken));
    const json = await second.json();
    expect(second.status).toBe(400);
    expect(json.error.code).toBe("LINK_INVALID");

    // Nenhuma sessão NOVA criada pela repetição — a contagem não muda.
    const sessionsAfterSecond = await prisma.session.count({ where: { userId } });
    expect(sessionsAfterSecond).toBe(sessionsAfterFirst);
  });

  it("token expirado devolve 400 LINK_INVALID mesmo nunca tendo sido usado", async () => {
    const rawToken = await mintToken({ expiresAt: new Date(Date.now() - 1000) });
    const res = await verifyRoute.POST(verifyRequest(rawToken));
    expect(res.status).toBe(400);
  });

  it("token desconhecido (nunca emitido) devolve 400 LINK_INVALID, não 500", async () => {
    const res = await verifyRoute.POST(verifyRequest("token-que-nunca-existiu-no-banco-0000"));
    expect(res.status).toBe(400);
  });

  it("consumeMagicLinkToken chamado duas vezes em paralelo (corrida) só autentica uma vez", async () => {
    const rawToken = await mintToken();
    const [a, b] = await Promise.all([
      consumeMagicLinkToken(rawToken, "qa-agent"),
      consumeMagicLinkToken(rawToken, "qa-agent"),
    ]);
    const results = [a, b];
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });
});

describe("não-enumeração de e-mail — POST /api/auth/magic-link", () => {
  function magicLinkRequest(email: string) {
    return new NextRequest("http://localhost:3000/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  it("e-mail de conta existente e e-mail inexistente recebem resposta IDÊNTICA (status e corpo)", async () => {
    const resExisting = await magicLinkRoute.POST(magicLinkRequest(userEmail));
    const jsonExisting = await resExisting.json();

    const resMissing = await magicLinkRoute.POST(magicLinkRequest(`${qaId("nao-existe")}@example.com`));
    const jsonMissing = await resMissing.json();

    expect(resExisting.status).toBe(resMissing.status);
    expect(jsonExisting).toEqual(jsonMissing);
  });
});
