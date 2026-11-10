// Unitário do disparo de e-mail de `POST /api/v1/intakes` — mocka
// `createIntake` (lib/intakes, que fala com o Postgres real — ver
// route.db.test.ts para a integração de verdade) e `lib/email`, então roda
// sem banco e sem precisar do dev server. Objetivo: provar QUANDO a
// confirmação ao contato dispara e, mais importante, quando ela NÃO dispara
// (honeypot e reenvio idempotente) — só o create "de verdade" deve notificar.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendIntakeConfirmation = vi.fn().mockResolvedValue({ ok: true });
const sendNewIntakeNotification = vi.fn().mockResolvedValue({ ok: true });
const createIntake = vi.fn();

vi.mock("@/lib/email", () => ({
  sendIntakeConfirmation,
  sendNewIntakeNotification,
}));

vi.mock("@/lib/intakes", () => ({
  createIntake: (...args: unknown[]) => createIntake(...args),
}));

let POST: typeof import("./route").POST;
let NextRequest: typeof import("next/server").NextRequest;

const ORIGINAL_ALLOWED_ORIGINS = process.env.INTAKE_ALLOWED_ORIGINS;

beforeEach(async () => {
  process.env.INTAKE_ALLOWED_ORIGINS = "http://localhost:3000";
  vi.clearAllMocks();
  ({ POST } = await import("./route"));
  ({ NextRequest } = await import("next/server"));
});

afterEach(() => {
  process.env.INTAKE_ALLOWED_ORIGINS = ORIGINAL_ALLOWED_ORIGINS;
});

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`; // TEST-NET-3 (RFC 5737)
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    source: "solicitar-site",
    consent: { lgpd: true, textVersion: "2026-11" },
    contact: { nome: "QA Teste", email: "qa@example.com", whatsapp: "11999990000" },
    company: { marca: "QA Loja", segmento: "Varejo", descricao_da_empresa: "Loja de teste." },
    briefing: { objetivo_principal: ["Vender online"] },
    ...overrides,
  };
}

function makeRequest(body: unknown, opts: { idempotencyKey?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": nextIp() };
  if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
  return new NextRequest("http://localhost:3000/api/v1/intakes", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/intakes — disparo da confirmação ao contato", () => {
  it("create de verdade dispara sendIntakeConfirmation pro e-mail do contato, com protocolo e marca", async () => {
    createIntake.mockResolvedValue({ intakeId: "intake-1", protocol: "BRF-2026-0001", created: true });

    const res = await POST(makeRequest(validBody()));
    await res.json();

    expect(res.status).toBe(201);
    expect(sendIntakeConfirmation).toHaveBeenCalledTimes(1);
    expect(sendIntakeConfirmation).toHaveBeenCalledWith({
      to: "qa@example.com",
      protocol: "BRF-2026-0001",
      marca: "QA Loja",
    });
    expect(sendNewIntakeNotification).toHaveBeenCalledTimes(1);
  });

  it("reenvio idempotente (createIntake devolve created:false) NÃO dispara confirmação nem notificação", async () => {
    createIntake.mockResolvedValue({ intakeId: "intake-1", protocol: "BRF-2026-0001", created: false });

    const res = await POST(makeRequest(validBody(), { idempotencyKey: "mesma-chave" }));
    await res.json();

    expect(res.status).toBe(201);
    expect(sendIntakeConfirmation).not.toHaveBeenCalled();
    expect(sendNewIntakeNotification).not.toHaveBeenCalled();
  });

  it("honeypot (campo website preenchido) NÃO chama createIntake nem dispara e-mail nenhum", async () => {
    const res = await POST(makeRequest(validBody({ website: "http://bot.example" })));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.protocolo).toBe("BRF-0000-0000");
    expect(createIntake).not.toHaveBeenCalled();
    expect(sendIntakeConfirmation).not.toHaveBeenCalled();
    expect(sendNewIntakeNotification).not.toHaveBeenCalled();
  });

  it("falha no envio da confirmação não derruba o endpoint (best-effort, resposta continua 201)", async () => {
    createIntake.mockResolvedValue({ intakeId: "intake-2", protocol: "BRF-2026-0002", created: true });
    sendIntakeConfirmation.mockRejectedValueOnce(new Error("SMTP indisponível"));

    const res = await POST(makeRequest(validBody()));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.protocolo).toBe("BRF-2026-0002");
  });
});
