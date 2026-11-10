// Unitário puro (sem banco) de `validateIntakePayload` — a mesma validação
// que `POST /api/v1/intakes` aplica ANTES de tocar o banco. Cobre o
// VALIDATION_ERROR que a Lyra não testou (lacuna apontada no briefing): o
// formato exato de `fields` devolvido ao cliente do formulário.
import { describe, expect, it } from "vitest";
import { validateIntakePayload } from "./intake-validation";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    source: "solicitar-site",
    consent: { lgpd: true, textVersion: "2026-11" },
    contact: { nome: "Maria Teste", email: "maria@exemplo.com.br", whatsapp: "11999990000" },
    company: { marca: "Loja Teste", segmento: "Varejo", descricao_da_empresa: "Uma loja de teste." },
    briefing: { objetivo_principal: ["Vender online"] },
    ...overrides,
  };
}

describe("validateIntakePayload — caminho feliz", () => {
  it("aceita um envelope completo e normaliza e-mail/whatsapp", () => {
    const result = validateIntakePayload(basePayload({ contact: { nome: "Maria", email: "MARIA@Exemplo.com.br", whatsapp: "(11) 99999-0000" } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isHoneypot).toBe(false);
    expect(result.data.contact.email).toBe("maria@exemplo.com.br");
    expect(result.data.contact.whatsapp).toBe("11999990000");
  });

  it("aceita briefing com campos de array e de string misturados, truncando o excesso", () => {
    const result = validateIntakePayload(
      basePayload({ briefing: { estilo: ["Moderno", "Clean"], obs: "x".repeat(10_000) } })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.briefing.estilo).toEqual(["Moderno", "Clean"]);
    expect(result.data.briefing.obs).toHaveLength(5_000); // MAX_TEXT_FIELD_LENGTH
  });
});

describe("validateIntakePayload — VALIDATION_ERROR (lacuna não testada pela Lyra)", () => {
  it("corpo que não é objeto devolve fields.body", () => {
    const result = validateIntakePayload("isso não é um objeto");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields).toEqual({ body: "Corpo da requisição precisa ser um objeto JSON." });
  });

  it("null devolve fields.body (não lança)", () => {
    const result = validateIntakePayload(null);
    expect(result.ok).toBe(false);
  });

  it("sem consent.lgpd=true aponta consent.lgpd como campo inválido", () => {
    const result = validateIntakePayload(basePayload({ consent: { lgpd: false, textVersion: "2026-11" } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields["consent.lgpd"]).toBe("required");
  });

  it("e-mail com formato inválido aponta contact.email", () => {
    const result = validateIntakePayload(basePayload({ contact: { nome: "Maria", email: "não-é-email", whatsapp: "11999990000" } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields["contact.email"]).toBe("invalid");
  });

  it("whatsapp com menos de 8 dígitos aponta contact.whatsapp", () => {
    const result = validateIntakePayload(basePayload({ contact: { nome: "Maria", email: "maria@exemplo.com.br", whatsapp: "123" } }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields["contact.whatsapp"]).toBe("min 8 digitos");
  });

  it("marca/segmento/descrição ausentes reportam os três campos de uma vez (não para no primeiro)", () => {
    const result = validateIntakePayload(basePayload({ company: {} }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fields).sort()).toEqual([
      "company.descricao_da_empresa",
      "company.marca",
      "company.segmento",
    ]);
  });

  it("payload totalmente vazio reporta todos os campos obrigatórios de uma vez", () => {
    const result = validateIntakePayload({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fields).sort()).toEqual(
      [
        "company.descricao_da_empresa",
        "company.marca",
        "company.segmento",
        "consent.lgpd",
        "consent.textVersion",
        "contact.email",
        "contact.nome",
        "contact.whatsapp",
      ].sort()
    );
  });
});

describe("validateIntakePayload — honeypot", () => {
  it("campo website preenchido marca isHoneypot=true mesmo com o resto do formulário válido", () => {
    const result = validateIntakePayload(basePayload({ website: "http://bot.example" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isHoneypot).toBe(true);
  });

  it("campo website preenchido marca isHoneypot=true mesmo com o resto do formulário TAMBÉM inválido (não lança, não reporta fields)", () => {
    const result = validateIntakePayload({ website: "http://bot.example" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isHoneypot).toBe(true);
  });

  it("campo website vazio NÃO é tratado como honeypot", () => {
    const result = validateIntakePayload(basePayload({ website: "   " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isHoneypot).toBe(false);
  });
});
