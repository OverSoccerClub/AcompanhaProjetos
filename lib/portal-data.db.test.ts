// O teste MAIS crítico desta suíte (seção 8 da arquitetura: risco crítico do
// produto). Prova contra Postgres REAL, não mock, que `getPortalProject`/
// `listPortalProjects` (lib/portal-data.ts — ÚNICA camada de leitura do
// portal) nunca deixa um cliente ver dado de outro, e nunca deixa uma
// ProjectUpdate de visibility=INTERNA alcançar o retorno que o portal
// renderiza. Mock de Prisma provaria só que a FUNÇÃO chama `findFirst` com
// os argumentos certos — não que o WHERE realmente filtra no banco (ex.: um
// `clientId` esquecido no `select.stages` relacionado passaria batido num
// mock). Aqui o filtro é testado pelo efeito real: dado de dois clientes
// distintos, de verdade, no mesmo banco.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config();
import { assertLocalDatabase, qaId } from "@/test/helpers/db-guard";
assertLocalDatabase();

let prisma: typeof import("@/lib/prisma").prisma;
let getPortalProject: typeof import("./portal-data").getPortalProject;
let listPortalProjects: typeof import("./portal-data").listPortalProjects;

const clientA = qaId("clientA");
const clientB = qaId("clientB");
let projectA: string;
let projectB: string;
let staffAuthorId: string;
const INTERNA_TEXT = "QA: nota interna que o cliente NUNCA deve ver";
const CLIENTE_TEXT = "QA: atualização visível ao cliente";

beforeAll(async () => {
  ({ prisma } = await import("@/lib/prisma"));
  ({ getPortalProject, listPortalProjects } = await import("./portal-data"));

  await prisma.client.create({ data: { id: clientA, name: "QA Cliente A" } });
  await prisma.client.create({ data: { id: clientB, name: "QA Cliente B" } });

  const staff = await prisma.user.create({
    data: { email: `${qaId("staff")}@innovarecode.com.br`, name: "QA Staff", role: "STAFF", active: true },
  });
  staffAuthorId = staff.id;

  const pA = await prisma.project.create({
    data: { code: qaId("IC-A"), title: "Projeto A", type: "SITE", clientId: clientA },
  });
  const pB = await prisma.project.create({
    data: { code: qaId("IC-B"), title: "Projeto B", type: "SITE", clientId: clientB },
  });
  projectA = pA.id;
  projectB = pB.id;

  await prisma.projectUpdate.create({
    data: {
      projectId: projectA,
      authorId: staffAuthorId,
      type: "COMENTARIO",
      visibility: "INTERNA",
      text: INTERNA_TEXT,
    },
  });
  await prisma.projectUpdate.create({
    data: {
      projectId: projectA,
      authorId: staffAuthorId,
      type: "COMENTARIO",
      visibility: "CLIENTE",
      text: CLIENTE_TEXT,
    },
  });
});

afterAll(async () => {
  await prisma.projectUpdate.deleteMany({ where: { projectId: { in: [projectA, projectB] } } });
  await prisma.project.deleteMany({ where: { id: { in: [projectA, projectB] } } });
  await prisma.user.deleteMany({ where: { id: staffAuthorId } });
  await prisma.client.deleteMany({ where: { id: { in: [clientA, clientB] } } });
});

describe("isolamento entre clientes — o mais crítico", () => {
  it("cliente A pedindo o projeto do cliente B recebe null — nunca carrega o dado de outro cliente", async () => {
    const result = await getPortalProject(clientA, projectB);
    expect(result).toBeNull();
  });

  it("cliente B pedindo o projeto do cliente A recebe null (simetria — não é só um lado que falha)", async () => {
    const result = await getPortalProject(clientB, projectA);
    expect(result).toBeNull();
  });

  it("cliente A pedindo o PRÓPRIO projeto recebe os dados normalmente", async () => {
    const result = await getPortalProject(clientA, projectA);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(projectA);
  });

  it("listPortalProjects(clientA) nunca inclui projeto do clientB", async () => {
    const projects = await listPortalProjects(clientA);
    expect(projects.some((p) => p.id === projectB)).toBe(false);
  });

  it("listPortalProjects(clientB) nunca inclui projeto do clientA", async () => {
    const projects = await listPortalProjects(clientB);
    expect(projects.some((p) => p.id === projectA)).toBe(false);
  });

  it("projectId inexistente (cuid plausível, nunca criado) devolve null, não lança", async () => {
    await expect(getPortalProject(clientA, "clxxxxxxxxxxxxxxxxxxxxxxx0")).resolves.toBeNull();
  });

  it("projectId vazio devolve null sem tocar o banco (guarda de entrada)", async () => {
    await expect(getPortalProject(clientA, "")).resolves.toBeNull();
  });
});

describe("visibilidade — ProjectUpdate INTERNA nunca vaza pro portalData", () => {
  it("getPortalProject(clientA, projectA) devolve SÓ a update CLIENTE — a INTERNA não aparece em lugar nenhum da resposta", async () => {
    const result = await getPortalProject(clientA, projectA);
    expect(result).not.toBeNull();

    expect(result!.updates).toHaveLength(1);
    expect(result!.updates[0].text).toBe(CLIENTE_TEXT);

    // Garantia extra, redundante de propósito: nenhum texto no JSON de
    // resposta (serializado, como o portal de fato recebe) contém o texto
    // interno — mesmo se um campo novo um dia reexpuser `updates` em outro
    // formato dentro do mesmo objeto.
    expect(JSON.stringify(result)).not.toContain(INTERNA_TEXT);
  });
});
