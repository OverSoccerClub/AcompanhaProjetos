// Validação do envelope de POST /api/v1/intakes (contrato §4.2 da
// arquitetura). Espelha a validação do navegador — e NÃO confia nela: todo
// campo obrigatório é revalidado aqui, mesmo que o form já tenha checado.
export const MAX_TEXT_FIELD_LENGTH = 5_000;
export const MAX_BODY_BYTES = 64 * 1024;

export type ValidatedIntakePayload = {
  schemaVersion: number;
  source: string;
  consent: { lgpd: true; textVersion: string };
  contact: { nome: string; email: string; whatsapp: string; cargo?: string };
  company: {
    marca: string;
    cnpj?: string;
    segmento: string;
    cidade_uf?: string;
    tempo_de_mercado?: string;
    descricao_da_empresa: string;
    site_atual?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  briefing: Record<string, string | string[]>;
  /** Campo honeypot — presente e preenchido = bot. */
  website?: string;
};

export type ValidationResult =
  | { ok: true; data: ValidatedIntakePayload; isHoneypot: boolean }
  | { ok: false; fields: Record<string, string> };

function isNonEmptyString(value: unknown, minLen = 1): value is string {
  return typeof value === "string" && value.trim().length >= minLen;
}

function isValidEmail(value: string): boolean {
  // Checagem pragmática (não RFC completa) — suficiente para rejeitar erros
  // de digitação óbvios sem rejeitar e-mails reais válidos.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function clampText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, MAX_TEXT_FIELD_LENGTH);
}

function clampArrayOrString(value: unknown): string | string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string").map((v) => v.slice(0, 500)).slice(0, 50);
  }
  if (typeof value === "string") return value.slice(0, MAX_TEXT_FIELD_LENGTH);
  return undefined;
}

/**
 * Valida o corpo já parseado como JSON. Chaves desconhecidas no nível raiz
 * e dentro de `briefing` são simplesmente ignoradas (não promovidas) — só o
 * formato abaixo é persistido em `Intake.payload`.
 */
export function validateIntakePayload(raw: unknown): ValidationResult {
  const fields: Record<string, string> = {};
  if (!raw || typeof raw !== "object") {
    return { ok: false, fields: { body: "Corpo da requisição precisa ser um objeto JSON." } };
  }
  const body = raw as Record<string, unknown>;

  // Honeypot: presente e preenchido = bot. Resposta é 201 "falso" (ver
  // route handler) — não grava nada, não valida o resto.
  const isHoneypot = isNonEmptyString(body.website);

  const schemaVersion = typeof body.schemaVersion === "number" ? body.schemaVersion : 1;
  const source = isNonEmptyString(body.source) ? (body.source as string).slice(0, 64) : "solicitar-site";

  const consent = (body.consent ?? {}) as Record<string, unknown>;
  if (consent.lgpd !== true) fields["consent.lgpd"] = "required";
  const consentTextVersion = isNonEmptyString(consent.textVersion)
    ? (consent.textVersion as string).slice(0, 16)
    : undefined;
  if (!consentTextVersion) fields["consent.textVersion"] = "required";

  const contact = (body.contact ?? {}) as Record<string, unknown>;
  const nome = isNonEmptyString(contact.nome, 2) ? (contact.nome as string).trim().slice(0, 200) : undefined;
  if (!nome) fields["contact.nome"] = "min 2 caracteres";
  const email = isNonEmptyString(contact.email) ? (contact.email as string).trim().toLowerCase() : undefined;
  if (!email || !isValidEmail(email)) fields["contact.email"] = "invalid";
  const whatsappDigits = isNonEmptyString(contact.whatsapp) ? digitsOnly(contact.whatsapp as string) : "";
  if (whatsappDigits.length < 8) fields["contact.whatsapp"] = "min 8 digitos";
  const cargo = clampText(contact.cargo);

  const company = (body.company ?? {}) as Record<string, unknown>;
  const marca = isNonEmptyString(company.marca, 2) ? (company.marca as string).trim().slice(0, 200) : undefined;
  if (!marca) fields["company.marca"] = "min 2 caracteres";
  const segmento = isNonEmptyString(company.segmento, 2)
    ? (company.segmento as string).trim().slice(0, 200)
    : undefined;
  if (!segmento) fields["company.segmento"] = "min 2 caracteres";
  const descricaoDaEmpresa = isNonEmptyString(company.descricao_da_empresa, 5)
    ? (company.descricao_da_empresa as string).trim().slice(0, MAX_TEXT_FIELD_LENGTH)
    : undefined;
  if (!descricaoDaEmpresa) fields["company.descricao_da_empresa"] = "min 5 caracteres";
  const cnpjDigits = isNonEmptyString(company.cnpj) ? digitsOnly(company.cnpj as string) : undefined;

  const briefingRaw = (body.briefing ?? {}) as Record<string, unknown>;
  const briefing: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(briefingRaw)) {
    const clamped = clampArrayOrString(value);
    if (clamped !== undefined) briefing[key.slice(0, 100)] = clamped;
  }

  if (!isHoneypot && Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }

  // Em caso de honeypot, devolvemos um payload mínimo "válido o suficiente"
  // só para satisfazer o tipo — o route handler NUNCA persiste quando
  // `isHoneypot` é true, então o conteúdo exato aqui é irrelevante.
  if (isHoneypot) {
    return {
      ok: true,
      isHoneypot: true,
      data: {
        schemaVersion,
        source,
        consent: { lgpd: true, textVersion: consentTextVersion ?? "unknown" },
        contact: { nome: nome ?? "", email: email ?? "", whatsapp: whatsappDigits, cargo },
        company: {
          marca: marca ?? "",
          cnpj: cnpjDigits,
          segmento: segmento ?? "",
          descricao_da_empresa: descricaoDaEmpresa ?? "",
        },
        briefing,
      },
    };
  }

  return {
    ok: true,
    isHoneypot: false,
    data: {
      schemaVersion,
      source,
      consent: { lgpd: true, textVersion: consentTextVersion! },
      contact: { nome: nome!, email: email!, whatsapp: whatsappDigits, cargo },
      company: {
        marca: marca!,
        cnpj: cnpjDigits,
        segmento: segmento!,
        cidade_uf: clampText(company.cidade_uf),
        tempo_de_mercado: clampText(company.tempo_de_mercado),
        descricao_da_empresa: descricaoDaEmpresa!,
        site_atual: clampText(company.site_atual),
        instagram: clampText(company.instagram),
        facebook: clampText(company.facebook),
        linkedin: clampText(company.linkedin),
      },
      briefing,
    },
  };
}
