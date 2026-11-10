// Integração contra Postgres REAL do contrato público `POST /api/v1/intakes`
// (seção 4.2 da arquitetura) — chama o route handler de verdade (não a lib
// isolada), porque CORS/honeypot/idempotência/validação são decisões do
// próprio handler antes de delegar a `createIntake`. Mocks não provam que a
// chave `Idempotency-Key` realmente deduplica no Postgres — por isso este
// arquivo existe (mesmo raciocínio de squad-custo.db.test.ts no Painel).
//
// Cada teste usa um IP (`x-forwarded-for`) próprio: o rate limit de
// `checkRateLimit` é um Map em memória por processo (lib/rate-limit.ts) e
// vitest.config.mts desliga o paralelismo entre arquivos — mas dentro DESTE
// arquivo os testes compartilhariam o mesmo bucket se usassem o mesmo IP, e
// o limite (5/h) é baixo demais para sobreviver a todos os casos abaixo.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config();
import { assertLocalDatabase, qaId } from "@/test/helpers/db-guard";
assertLocalDatabase();

let prisma: typeof import("@/lib/prisma").prisma;
let POST: typeof import("./route").POST;
let NextRequest: typeof import("next/server").NextRequest;

const createdIntakeIds: string[] = [];
const createdClientIds: string[] = [];

beforeAll(async () => {
  ({ prisma } = await import("@/lib/prisma"));
  ({ POST } = await import("./route"));
  ({ NextRequest } = await import("next/server"));
});

afterAll(async () => {
  if (createdIntakeIds.length > 0) {
    await prisma.intake.deleteMany({ where: { id: { in: createdIntakeIds } } });
  }
  if (createdClientIds.length > 0) {
    await prisma.client.deleteMany({ where: { id: { in: createdClientIds } } });
  }
});

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`; // TEST-NET-3 (RFC 5737) — nunca um IP real.
}

function validBody(overrides: Record<string, unknown> = {}) {
  const id = qaId("intake");
  return {
    schemaVersion: 1,
    source: "solicitar-site",
    consent: { lgpd: true, textVersion: "2026-11" },
    contact: { nome: "QA Teste", email: `${id}@example.com`, whatsapp: "11999990000" },
    company: { marca: `QA Loja ${id}`, segmento: "Varejo", descricao_da_empresa: "Loja de teste automatizado." },
    briefing: { objetivo_principal: ["Vender online"] },
    ...overrides,
  };
}

function makeRequest(
  body: unknown,
  opts: { origin?: string | null; idempotencyKey?: string; ip?: string; contentType?: string } = {}
) {
  const headers: Record<string, string> = { "content-type": opts.contentType ?? "application/json" };
  if (opts.origin !== undefined && opts.origin !== null) headers["origin"] = opts.origin;
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
  headers["x-forwarded-for"] = opts.ip ?? nextIp();
  return new NextRequest("http://localhost:3000/api/v1/intakes", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function trackResponse(res: Response) {
  const json = await res.json();
  if (res.status === 201 && json.intakeId) {
    const intake = await prisma.intake.findUnique({ where: { id: json.intakeId }, select: { clientId: true } });
    createdIntakeIds.push(json.intakeId);
    if (intake?.clientId) createdClientIds.push(intake.clientId);
  }
  return json;
}

describe("POST /api/v1/intakes — idempotência", () => {
  it("duas requisições com a MESMA Idempotency-Key criam só 1 registro, e as duas respondem 201", async () => {
    const key = qaId("idem");
    const body = validBody();
    const ip = nextIp();

    const res1 = await POST(makeRequest(body, { idempotencyKey: key, ip }));
    const json1 = await trackResponse(res1);
    expect(res1.status).toBe(201);

    const res2 = await POST(makeRequest(body, { idempotencyKey: key, ip }));
    const json2 = await trackResponse(res2);
    expect(res2.status).toBe(201);

    expect(json2.intakeId).toBe(json1.intakeId);
    expect(json2.protocolo).toBe(json1.protocolo);

    const count = await prisma.intake.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it("Idempotency-Keys diferentes para o mesmo conteúdo criam registros diferentes (a chave é o que importa, não o corpo)", async () => {
    const body = validBody();
    const res1 = await POST(makeRequest(body, { idempotencyKey: qaId("idem-a") }));
    const json1 = await trackResponse(res1);
    const res2 = await POST(makeRequest(body, { idempotencyKey: qaId("idem-b") }));
    const json2 = await trackResponse(res2);

    expect(json1.intakeId).not.toBe(json2.intakeId);
  });
});

describe("POST /api/v1/intakes — origem (CORS)", () => {
  it("origem fora de INTAKE_ALLOWED_ORIGINS recebe 403 ORIGIN_NOT_ALLOWED e não persiste nada", async () => {
    const before = await prisma.intake.count();
    const res = await POST(makeRequest(validBody(), { origin: "https://site-malicioso.example" }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error.code).toBe("ORIGIN_NOT_ALLOWED");
    await expect(prisma.intake.count()).resolves.toBe(before);
  });

  it("sem header Origin (ex. integração servidor-a-servidor) passa a validação de CORS", async () => {
    const res = await POST(makeRequest(validBody(), { origin: null }));
    const json = await trackResponse(res);
    expect(res.status).toBe(201);
    expect(json.intakeId).toBeDefined();
  });
});

describe("POST /api/v1/intakes — honeypot", () => {
  it("campo website preenchido devolve 201 FALSO e não persiste nenhuma linha", async () => {
    const before = await prisma.intake.count();
    const res = await POST(makeRequest(validBody({ website: "http://bot.example" })));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.protocolo).toBe("BRF-0000-0000"); // marcador fixo do caminho honeypot, ver route.ts
    await expect(prisma.intake.count()).resolves.toBe(before);

    // O intakeId devolvido ao bot é um UUID aleatório que nunca existe no banco.
    const found = await prisma.intake.findUnique({ where: { id: json.intakeId } });
    expect(found).toBeNull();
  });
});

describe("POST /api/v1/intakes — VALIDATION_ERROR (lacuna não testada pela Lyra)", () => {
  it("payload inválido devolve 400 com code VALIDATION_ERROR e fields apontando os campos, sem persistir", async () => {
    const before = await prisma.intake.count();
    const res = await POST(makeRequest(validBody({ contact: { nome: "Q", email: "invalido", whatsapp: "1" } })));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.fields).toMatchObject({
      "contact.nome": expect.any(String),
      "contact.email": "invalid",
      "contact.whatsapp": expect.any(String),
    });
    await expect(prisma.intake.count()).resolves.toBe(before);
  });

  it("corpo que não é JSON válido também devolve 400 VALIDATION_ERROR (não 500)", async () => {
    const res = await POST(makeRequest("{isso não é json"));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
