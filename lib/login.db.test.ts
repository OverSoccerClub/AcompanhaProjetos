// Integração contra Postgres REAL do login por e-mail+senha (mesmo padrão
// de lib/magic-link.db.test.ts: mock só de next/headers/cookies, lógica de
// autenticação e constraints de banco são as de verdade).
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
let hashPassword: typeof import("@/lib/crypto").hashPassword;
let loginWithPassword: typeof import("@/lib/login").loginWithPassword;
let loginRoute: typeof import("@/app/api/auth/login/route");
let NextRequest: typeof import("next/server").NextRequest;

const clientId = qaId("client");
const staffEmail = `${qaId("staff")}@innovarecode.com.br`;
const staffPassword = "senhaDeTesteBemForte123";
const clientEmail = `${qaId("client-user")}@example.com`;
let staffId: string;
let clientUserId: string;

beforeAll(async () => {
  ({ prisma } = await import("@/lib/prisma"));
  ({ hashPassword } = await import("@/lib/crypto"));
  ({ loginWithPassword } = await import("@/lib/login"));
  loginRoute = await import("@/app/api/auth/login/route");
  ({ NextRequest } = await import("next/server"));

  await prisma.client.create({ data: { id: clientId, name: "QA Cliente Login" } });

  const staff = await prisma.user.create({
    data: {
      email: staffEmail,
      name: "QA Staff",
      role: "STAFF",
      active: true,
      passwordHash: await hashPassword(staffPassword),
    },
  });
  staffId = staff.id;

  const clientUser = await prisma.user.create({
    data: { email: clientEmail, name: "QA Cliente", role: "CLIENT", clientId, active: true },
  });
  clientUserId = clientUser.id;
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { userId: { in: [staffId, clientUserId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [staffId, clientUserId] } } });
  await prisma.client.deleteMany({ where: { id: clientId } });
});

beforeEach(() => {
  cookieState.store.clear();
});

function loginRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("CHECK constraint do banco — CLIENT nunca tem passwordHash", () => {
  it("UPDATE que tenta dar senha a um CLIENT é rejeitado pelo Postgres", async () => {
    await expect(
      prisma.user.update({ where: { id: clientUserId }, data: { passwordHash: await hashPassword("x") } })
    ).rejects.toThrow();
  });
});

describe("loginWithPassword", () => {
  it("credenciais certas de STAFF autenticam e criam exatamente 1 Session nova", async () => {
    const before = await prisma.session.count({ where: { userId: staffId } });
    const result = await loginWithPassword(staffEmail, staffPassword, "qa-agent");
    expect(result?.user.role).toBe("STAFF");
    const after = await prisma.session.count({ where: { userId: staffId } });
    expect(after).toBe(before + 1);
  });

  it("senha errada devolve null — não autentica", async () => {
    const result = await loginWithPassword(staffEmail, "senha-errada-qualquer", "qa-agent");
    expect(result).toBeNull();
  });

  it("e-mail de CLIENT (sem senha, por desenho) devolve null mesmo com qualquer senha", async () => {
    const result = await loginWithPassword(clientEmail, "qualquer-coisa-123456", "qa-agent");
    expect(result).toBeNull();
  });

  it("e-mail inexistente devolve null, não lança", async () => {
    const result = await loginWithPassword(`${qaId("nao-existe")}@example.com`, "qualquer-coisa", "qa-agent");
    expect(result).toBeNull();
  });
});

describe("POST /api/auth/login — resposta uniforme (sem enumeração)", () => {
  it("e-mail inexistente e senha errada de conta existente recebem o MESMO status e corpo", async () => {
    const resMissing = await loginRoute.POST(
      loginRequest({ email: `${qaId("nao-existe")}@example.com`, password: "qualquer-coisa-123" })
    );
    const jsonMissing = await resMissing.json();

    const resWrongPassword = await loginRoute.POST(loginRequest({ email: staffEmail, password: "senha-errada" }));
    const jsonWrongPassword = await resWrongPassword.json();

    expect(resMissing.status).toBe(resWrongPassword.status);
    expect(resMissing.status).toBe(401);
    expect(jsonMissing).toEqual(jsonWrongPassword);
  });

  it("e-mail de CLIENT tentando este endpoint recebe a MESMA resposta uniforme — nunca autentica", async () => {
    const res = await loginRoute.POST(loginRequest({ email: clientEmail, password: "qualquer-coisa-123" }));
    expect(res.status).toBe(401);
  });

  it("credenciais certas de STAFF devolvem 200 com redirectTo /admin", async () => {
    const res = await loginRoute.POST(loginRequest({ email: staffEmail, password: staffPassword }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.redirectTo).toBe("/admin");
  });

  it("corpo sem senha devolve 400 VALIDATION_ERROR, não 401 — nunca chega a consultar o banco", async () => {
    const res = await loginRoute.POST(loginRequest({ email: staffEmail }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
