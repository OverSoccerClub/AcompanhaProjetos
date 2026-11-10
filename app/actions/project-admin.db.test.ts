// Prova, contra Postgres REAL (não mock — mesmo raciocínio de
// lib/portal-data.db.test.ts: um mock provaria só que a função chamou
// `prisma.project.delete`, não que o CASCADE do banco de fato apaga
// ProjectStage/ProjectUpdate e PRESERVA Client/User/Intake), que
// `deleteProject` (app/actions/project-admin.ts):
//   1. exige STAFF (barra CLIENT e "sem sessão");
//   2. apaga o Project e, em cascata, ProjectStage e ProjectUpdate;
//   3. NUNCA apaga Client, User ou Intake — Intake só perde a referência
//      (projectId → null), continua existindo;
//   4. projectId inexistente/inválido falha com erro claro, não 500 cru.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "dotenv";

config();
import { assertLocalDatabase, qaId } from "@/test/helpers/db-guard";
assertLocalDatabase();

const sessionMock = vi.hoisted(() => ({ requireStaff: vi.fn() }));
vi.mock("@/lib/session", () => sessionMock);

let prisma: typeof import("@/lib/prisma").prisma;
let deleteProject: typeof import("./project-admin").deleteProject;

const STAFF_SESSION = { id: "qa-staff-session", email: "qa-staff@innovarecode.com.br", name: "QA Staff", role: "STAFF" as const, clientId: null, active: true };

const clientId = qaId("client");
let staffAuthorId: string;
const cleanupProjectIds: string[] = [];
const cleanupIntakeIds: string[] = [];

beforeAll(async () => {
  ({ prisma } = await import("@/lib/prisma"));
  ({ deleteProject } = await import("./project-admin"));

  await prisma.client.create({ data: { id: clientId, name: "QA Cliente DeleteProject" } });
  const staff = await prisma.user.create({
    data: { email: `${qaId("staff")}@innovarecode.com.br`, name: "QA Staff Autor", role: "STAFF", active: true },
  });
  staffAuthorId = staff.id;
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.intake.deleteMany({ where: { id: { in: cleanupIntakeIds } } });
  await prisma.project.deleteMany({ where: { id: { in: cleanupProjectIds } } });
  await prisma.user.deleteMany({ where: { id: staffAuthorId } });
  await prisma.client.deleteMany({ where: { id: clientId } });
});

async function createProjectWithChildren() {
  const project = await prisma.project.create({
    data: { code: qaId("IC-DEL"), title: "Projeto para excluir", type: "SITE", clientId },
  });
  cleanupProjectIds.push(project.id);

  const stage = await prisma.projectStage.create({
    data: { projectId: project.id, order: 0, key: "etapa_1", name: "Etapa 1", phase: "PLANEJAMENTO_DESIGN" },
  });
  await prisma.projectUpdate.create({
    data: { projectId: project.id, stageId: stage.id, authorId: staffAuthorId, type: "COMENTARIO", visibility: "CLIENTE", text: "QA update" },
  });

  const intake = await prisma.intake.create({
    data: {
      protocol: qaId("BRF"),
      schemaVersion: 1,
      source: "qa-test",
      payload: { contact: {} },
      status: "CONVERTIDO",
      consentAt: new Date(),
      consentTextVersion: "qa",
      clientId,
      projectId: project.id,
    },
  });
  cleanupIntakeIds.push(intake.id);

  return { project, stage, intakeId: intake.id };
}

describe("deleteProject — exige STAFF", () => {
  it("sem sessão STAFF (requireStaff lança) propaga o erro e não toca o banco", async () => {
    sessionMock.requireStaff.mockRejectedValue(new Error("Acesso restrito à equipe InnovareCode."));
    const { project } = await createProjectWithChildren();

    await expect(deleteProject(project.id)).rejects.toThrow("Acesso restrito");

    const stillThere = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stillThere).not.toBeNull();
  });
});

describe("deleteProject — STAFF autenticado", () => {
  it("apaga o Project e, em cascata, ProjectStage e ProjectUpdate", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    const { project, stage } = await createProjectWithChildren();

    const result = await deleteProject(project.id);
    expect(result).toEqual({ id: project.id, code: project.code });

    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
    expect(await prisma.projectStage.findUnique({ where: { id: stage.id } })).toBeNull();
    expect(await prisma.projectUpdate.findMany({ where: { projectId: project.id } })).toHaveLength(0);
  });

  it("NÃO apaga Client nem User — e o Intake histórico sobrevive só sem o vínculo de projeto", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    const { project, intakeId } = await createProjectWithChildren();

    await deleteProject(project.id);

    expect(await prisma.client.findUnique({ where: { id: clientId } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: staffAuthorId } })).not.toBeNull();

    const intake = await prisma.intake.findUnique({ where: { id: intakeId } });
    expect(intake).not.toBeNull();
    expect(intake!.projectId).toBeNull();
  });

  it("projectId inexistente falha com erro claro (não lança um erro de Prisma cru)", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    await expect(deleteProject("clxxxxxxxxxxxxxxxxxxxxxxx0")).rejects.toThrow("Projeto não encontrado.");
  });

  it("projectId vazio/inválido falha sem tocar o banco", async () => {
    sessionMock.requireStaff.mockResolvedValue(STAFF_SESSION);
    await expect(deleteProject("")).rejects.toThrow("Id de projeto inválido.");
  });
});
