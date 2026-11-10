// Prova, contra Postgres REAL (mesmo raciocínio de
// project-admin.db.test.ts), que `deleteIntake`:
//   1. exige STAFF (barra CLIENT e "sem sessão");
//   2. apaga o Intake;
//   3. NUNCA apaga/desfaz o Project que foi criado a partir dele — o schema
//      não tem FK de volta (Intake.projectId → Project, não o contrário),
//      então o Project sobrevive intacto, inclusive seus dados;
//   4. intakeId inexistente/inválido falha com erro claro, não 500 cru.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "dotenv";

config();
import { assertLocalDatabase, qaId } from "@/test/helpers/db-guard";
assertLocalDatabase();

const sessionMock = vi.hoisted(() => ({ requireStaff: vi.fn() }));
vi.mock("@/lib/session", () => sessionMock);
vi.mock("@/lib/magic-link", () => ({ requestMagicLink: vi.fn().mockResolvedValue(undefined) }));

let prisma: typeof import("@/lib/prisma").prisma;
let deleteIntake: typeof import("./intake-admin").deleteIntake;
let listIntakes: typeof import("./intake-admin").listIntakes;
let convertIntake: typeof import("./intake-admin").convertIntake;

const STAFF_SESSION = { id: "qa-staff-session", email: "qa-staff@innovarecode.com.br", name: "QA Staff", role: "STAFF" as const, clientId: null, active: true };

const clientId = qaId("client");
const cleanupIntakeIds: string[] = [];
const cleanupProjectIds: string[] = [];

beforeAll(async () => {
  ({ prisma } = await import("@/lib/prisma"));
  ({ deleteIntake, listIntakes, convertIntake } = await import("./intake-admin"));

  await prisma.client.create({ data: { id: clientId, name: "QA Cliente DeleteIntake" } });
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.intake.deleteMany({ where: { id: { in: cleanupIntakeIds } } });
  await prisma.project.deleteMany({ where: { id: { in: cleanupProjectIds } } });
  await prisma.client.deleteMany({ where: { id: clientId } });
});

async function createIntake(overrides: { status?: "NOVO" | "CONVERTIDO"; projectId?: string } = {}) {
  const intake = await prisma.intake.create({
    data: {
      protocol: qaId("BRF"),
      schemaVersion: 1,
      source: "qa-test",
      payload: { contact: {} },
      status: overrides.status ?? "NOVO",
      consentAt: new Date(),
      consentTextVersion: "qa",
      clientId,
      projectId: overrides.projectId ?? null,
    },
  });
  cleanupIntakeIds.push(intake.id);
  return intake;
}

async function createProject() {
  const project = await prisma.project.create({
    data: { code: qaId("IC-DELINT"), title: "Projeto originado do intake", type: "SITE", clientId },
  });
  cleanupProjectIds.push(project.id);
  return project;
}

describe("deleteIntake — exige STAFF", () => {
  it("sem sessão STAFF (requireStaff lança) propaga o erro e não toca o banco", async () => {
    sessionMock.requireStaff.mockRejectedValue(new Error("Acesso restrito à equipe InnovareCode."));
    const intake = await createIntake();

    await expect(deleteIntake(intake.id)).rejects.toThrow("Acesso restrito");

    expect(await prisma.intake.findUnique({ where: { id: intake.id } })).not.toBeNull();
  });
});

describe("deleteIntake — STAFF autenticado", () => {
  it("apaga o Intake", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    const intake = await createIntake();

    const result = await deleteIntake(intake.id);
    expect(result).toEqual({ ok: true, id: intake.id, protocol: intake.protocol });

    expect(await prisma.intake.findUnique({ where: { id: intake.id } })).toBeNull();
  });

  it("o Project criado a partir do intake SOBREVIVE intacto à exclusão do intake", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    const project = await createProject();
    const intake = await createIntake({ status: "CONVERTIDO", projectId: project.id });

    await deleteIntake(intake.id);

    const stillThere = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere!.title).toBe("Projeto originado do intake");
  });

  it("intakeId inexistente: { ok: false, error } — erro claro, nunca lança (regressão #441)", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    const result = await deleteIntake("clxxxxxxxxxxxxxxxxxxxxxxx0");
    expect(result).toEqual({ ok: false, error: "Intake não encontrado." });
  });

  it("intakeId vazio/inválido: { ok: false, error } — sem tocar o banco", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    const result = await deleteIntake("");
    expect(result).toEqual({ ok: false, error: "Id de intake inválido." });
  });

  it("repetir a exclusão (retry/duplo-clique) não causa efeito duplicado — a 2ª chamada volta { ok: false }", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    const intake = await createIntake();

    await deleteIntake(intake.id);
    const second = await deleteIntake(intake.id);
    expect(second).toEqual({ ok: false, error: "Intake não encontrado." });
  });
});

describe("listIntakes — paginação por OFFSET com total", () => {
  // Client próprio e nome só desta suíte — o filtro `q` usa `contains`, então
  // um nome compartilhado com outros testes do arquivo inflaria o `total`.
  const pagingClientId = qaId("client-paging");
  const marker = qaId("marker");
  const pagingIntakeIds: string[] = [];

  beforeAll(async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    await prisma.client.create({ data: { id: pagingClientId, name: `QA Paginação ${marker}` } });
    for (let i = 0; i < 11; i++) {
      const intake = await prisma.intake.create({
        data: {
          protocol: qaId(`BRF-PAG-${i}`),
          schemaVersion: 1,
          source: "qa-test",
          payload: {},
          status: i === 0 ? "DESCARTADO" : "NOVO",
          consentAt: new Date(),
          consentTextVersion: "qa",
          clientId: pagingClientId,
        },
      });
      pagingIntakeIds.push(intake.id);
    }
  });

  afterAll(async () => {
    await prisma.intake.deleteMany({ where: { id: { in: pagingIntakeIds } } });
    await prisma.client.deleteMany({ where: { id: pagingClientId } });
  });

  it("pageSize default (25) traz tudo numa página só e total bate com a contagem real", async () => {
    const result = await listIntakes({ q: marker });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.total).toBe(11);
    expect(result.items).toHaveLength(11);
  });

  it("pageSize=10 (allowlist) pagina corretamente (page 1 e page 2 não se repetem) e total continua 11", async () => {
    const page1 = await listIntakes({ q: marker, page: 1, pageSize: 10 });
    const page2 = await listIntakes({ q: marker, page: 2, pageSize: 10 });

    expect(page1.total).toBe(11);
    expect(page1.items).toHaveLength(10);
    expect(page2.total).toBe(11);
    expect(page2.items).toHaveLength(1);

    const ids1 = new Set(page1.items.map((i) => i.id));
    const ids2 = new Set(page2.items.map((i) => i.id));
    expect([...ids1].some((id) => ids2.has(id))).toBe(false);
  });

  it("filtro de status combinado com q reduz o total (não é o total geral da tabela)", async () => {
    const result = await listIntakes({ q: marker, status: "DESCARTADO" as never });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it("pageSize fora da allowlist cai no default, e page inválida cai em 1 — sem lançar", async () => {
    const result = await listIntakes({ q: marker, page: -1, pageSize: 999 });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.total).toBe(11);
  });
});

// Regressão do "Minified React error #441" em produção (2026-11-10): toda
// falha de validação/regra de negócio ESPERADA tem que voltar como
// `{ ok: false, error }` — nunca `throw` — porque esta action é chamada
// direto (`await convertIntake(...)`) pelo `ConvertIntakeForm`, não via
// `<form action>`, e o Next.js redige qualquer erro LANÇADO de uma Server
// Action em build de produção (o cliente só recebe o digest genérico, que o
// React exibe como "Minified React error #441"). Ver nota na própria
// função. Só uma falha genuinamente inesperada deve seguir lançando.
describe("convertIntake — erros de negócio voltam como dado, nunca como throw (regressão #441)", () => {
  const convertClientId = qaId("client-convert");
  const otherClientId = qaId("client-convert-other");
  const cleanupUserIds: string[] = [];
  let convertStaffSession: typeof STAFF_SESSION;

  beforeAll(async () => {
    await prisma.client.create({ data: { id: convertClientId, name: "QA Cliente Converter" } });
    await prisma.client.create({ data: { id: otherClientId, name: "QA Cliente Converter (outro)" } });

    // `tx.projectUpdate.create` exige `authorId` de um User real (FK) — o
    // `STAFF_SESSION` do topo do arquivo usa um id fictício que serve para
    // `deleteIntake` (nunca grava ProjectUpdate), mas não para `convertIntake`.
    const staff = await prisma.user.create({
      data: { email: `${qaId("staff-convert")}@innovarecode.com.br`, name: "QA Staff Converter", role: "STAFF", active: true },
    });
    cleanupUserIds.push(staff.id);
    convertStaffSession = { ...STAFF_SESSION, id: staff.id };
  });

  afterAll(async () => {
    // Ordem importa (FKs): Intake.clientId e Project.clientId bloqueiam a
    // exclusão do Client enquanto existirem; ProjectUpdate.authorId é
    // `onDelete: Restrict` contra User, então o Project (que faz cascade em
    // ProjectUpdate) tem que sumir ANTES do staff. Intake/Project destes
    // clients de teste já estão também nos arrays globais do arquivo — a
    // limpeza do `afterAll` de fora roda depois e só encontra 0 linhas.
    await prisma.intake.deleteMany({ where: { clientId: { in: [convertClientId, otherClientId] } } });
    await prisma.project.deleteMany({ where: { clientId: { in: [convertClientId, otherClientId] } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
    await prisma.client.deleteMany({ where: { id: { in: [convertClientId, otherClientId] } } });
  });

  beforeEach(() => {
    sessionMock.requireStaff.mockResolvedValue(convertStaffSession);
  });

  async function createConvertIntake(status: "NOVO" | "CONVERTIDO" = "NOVO") {
    const intake = await prisma.intake.create({
      data: {
        protocol: qaId("BRF-CONV"),
        schemaVersion: 1,
        source: "qa-test",
        payload: { contact: {} },
        status,
        consentAt: new Date(),
        consentTextVersion: "qa",
        clientId: convertClientId,
      },
    });
    cleanupIntakeIds.push(intake.id);
    return intake;
  }

  it("título curto demais: { ok: false, error } — sem criar Project", async () => {
    const intake = await createConvertIntake();
    const result = await convertIntake(intake.id, {
      title: "A",
      projectType: "SITE",
      contactName: "Contato Teste",
      contactEmail: `${qaId("contato")}@example.com`,
    });
    expect(result).toEqual({ ok: false, error: "Título do projeto precisa ter ao menos 2 caracteres." });
  });

  it("e-mail de contato inválido: { ok: false, error }", async () => {
    const intake = await createConvertIntake();
    const result = await convertIntake(intake.id, {
      title: "Projeto Teste",
      projectType: "SITE",
      contactName: "Contato Teste",
      contactEmail: "nao-e-email",
    });
    expect(result).toEqual({ ok: false, error: "E-mail de contato inválido." });
  });

  it("intake já convertido: { ok: false, error } — nunca lança", async () => {
    const intake = await createConvertIntake("CONVERTIDO");
    const result = await convertIntake(intake.id, {
      title: "Projeto Teste",
      projectType: "SITE",
      contactName: "Contato Teste",
      contactEmail: `${qaId("contato")}@example.com`,
    });
    expect(result).toEqual({ ok: false, error: "Este intake já foi convertido em projeto." });
  });

  it("e-mail de contato já é CLIENT de outra empresa: { ok: false, error } — transação some, nenhum Project é criado (o bug real reportado)", async () => {
    const email = `${qaId("conflito")}@example.com`;
    const existingUser = await prisma.user.create({
      data: { email, name: "Já Cadastrado", role: "CLIENT", clientId: otherClientId },
    });
    cleanupUserIds.push(existingUser.id);

    const intake = await createConvertIntake();
    const projectsBefore = await prisma.project.count({ where: { clientId: convertClientId } });

    const result = await convertIntake(intake.id, {
      title: "Projeto Teste",
      projectType: "SITE",
      contactName: "Contato Teste",
      contactEmail: email,
    });

    expect(result).toEqual({
      ok: false,
      error: "Este e-mail já está cadastrado para outro papel ou outra empresa.",
    });
    // Rollback completo: nem o Project nem a mudança de status do Intake
    // persistem — a transação não fica "meio aplicada".
    expect(await prisma.project.count({ where: { clientId: convertClientId } })).toBe(projectsBefore);
    const reloaded = await prisma.intake.findUnique({ where: { id: intake.id } });
    expect(reloaded!.status).toBe("NOVO");
  });

  it("caminho feliz: { ok: true, projectId, projectCode } e o Intake vira CONVERTIDO", async () => {
    const email = `${qaId("novo-cliente")}@example.com`;
    const intake = await createConvertIntake();

    const result = await convertIntake(intake.id, {
      title: "Projeto Feliz",
      projectType: "SITE",
      contactName: "Cliente Novo",
      contactEmail: email,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("esperado ok:true");
    cleanupProjectIds.push(result.projectId);

    const createdUser = await prisma.user.findUnique({ where: { email } });
    expect(createdUser?.role).toBe("CLIENT");
    if (createdUser) cleanupUserIds.push(createdUser.id);

    const reloaded = await prisma.intake.findUnique({ where: { id: intake.id } });
    expect(reloaded!.status).toBe("CONVERTIDO");
    expect(reloaded!.projectId).toBe(result.projectId);
  });
});
