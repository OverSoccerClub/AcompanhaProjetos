// Unitário puro de `isOriginAllowed`/`corsHeaders` — a checagem que decide o
// 403 ORIGIN_NOT_ALLOWED de POST /api/v1/intakes. `allowedOrigins()` lê
// `INTAKE_ALLOWED_ORIGINS` a cada chamada (não no import), então dá para
// variar o env por teste sem precisar de módulo isolado por arquivo.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { corsHeaders, isOriginAllowed } from "./intake-cors";

const ORIGINAL = process.env.INTAKE_ALLOWED_ORIGINS;

beforeEach(() => {
  process.env.INTAKE_ALLOWED_ORIGINS = "https://innovarecode.com.br,http://localhost:3000";
});

afterEach(() => {
  process.env.INTAKE_ALLOWED_ORIGINS = ORIGINAL;
});

describe("isOriginAllowed", () => {
  it("sem header Origin (chamada servidor-a-servidor/curl/teste) é permitido", () => {
    expect(isOriginAllowed(null)).toBe(true);
  });

  it("origem na lista configurada é permitida", () => {
    expect(isOriginAllowed("https://innovarecode.com.br")).toBe(true);
  });

  it("origem fora da lista é bloqueada (gera o 403 ORIGIN_NOT_ALLOWED)", () => {
    expect(isOriginAllowed("https://site-malicioso.example")).toBe(false);
  });

  it("subdomínio parecido mas diferente da origem permitida é bloqueado (sem match parcial)", () => {
    expect(isOriginAllowed("https://innovarecode.com.br.attacker.example")).toBe(false);
  });

  it("lista vazia (INTAKE_ALLOWED_ORIGINS não configurada) bloqueia qualquer Origin explícito", () => {
    process.env.INTAKE_ALLOWED_ORIGINS = "";
    expect(isOriginAllowed("https://innovarecode.com.br")).toBe(false);
    // mas requisição sem Origin continua passando (mesma regra acima)
    expect(isOriginAllowed(null)).toBe(true);
  });
});

describe("corsHeaders", () => {
  it("origem permitida recebe Access-Control-Allow-Origin ecoando a própria origem", () => {
    const headers = corsHeaders("https://innovarecode.com.br");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://innovarecode.com.br");
    expect(headers["Vary"]).toBe("Origin");
  });

  it("origem não permitida não recebe nenhum header CORS (objeto vazio)", () => {
    expect(corsHeaders("https://site-malicioso.example")).toEqual({});
  });

  it("sem Origin não recebe nenhum header CORS", () => {
    expect(corsHeaders(null)).toEqual({});
  });
});
