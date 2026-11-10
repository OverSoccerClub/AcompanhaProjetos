// Camada ÚNICA de leitura de dados do PORTAL do cliente (seção 5.4, ponto 2
// da arquitetura — "autorização perto do dado, a que vale"). Regra de ouro
// do produto (seção 8, risco crítico): o portal SÓ pode ler
// `ProjectUpdate.visibility = CLIENTE`, e SÓ projetos do `clientId` da
// própria sessão. Essas duas condições moram dentro do `WHERE` de toda
// query aqui — nunca um `findUnique` seguido de um `if` depois (isso é
// checável, mas não é ESTRUTURAL: um `if` esquecido um dia vaza dado de
// outro cliente ou uma nota interna).
//
// Toda tela/rota do portal (Lyra) DEVE importar só este módulo para ler
// Project/ProjectStage/ProjectUpdate — nunca `@/lib/prisma` diretamente a
// partir de `app/portal/**`. Se um teste de fronteira (ao estilo
// `client-deliver-boundary.test.ts` do Painel) for adicionado depois, é
// aqui que ele aponta.
import "server-only";
import { prisma } from "@/lib/prisma";
import { Visibility } from "@/lib/generated/prisma/enums";

const STAGE_SELECT = {
  id: true,
  order: true,
  key: true,
  name: true,
  phase: true,
  status: true,
  isApprovalPoint: true,
  expectedAt: true,
  startedAt: true,
  completedAt: true,
} as const;

const UPDATE_SELECT = {
  id: true,
  type: true,
  text: true,
  createdAt: true,
  stage: { select: { id: true, name: true } },
} as const;

const PROJECT_SELECT = {
  id: true,
  code: true,
  title: true,
  type: true,
  status: true,
  expectedStartAt: true,
  expectedEndAt: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PortalProjectSummary = Awaited<ReturnType<typeof listPortalProjects>>[number];
export type PortalProjectDetail = NonNullable<Awaited<ReturnType<typeof getPortalProject>>>;

/** Lista os projetos do cliente da sessão — nunca aceita um `clientId`
 * vindo de input externo (sempre o da sessão, resolvido por `requireClient()`). */
export function listPortalProjects(clientId: string) {
  return prisma.project.findMany({
    where: { clientId },
    select: PROJECT_SELECT,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Carrega UM projeto já filtrado pelo escopo do cliente — `clientId` entra
 * no `WHERE` junto com o `id`, nunca como checagem posterior. Devolve
 * `null` tanto para "não existe" quanto para "é de outro cliente" — quem
 * chama responde 404 genérico nos dois casos (mesmo padrão do
 * `findMissionInScope` do Painel), sem confirmar a existência do projeto
 * de terceiros.
 */
export async function getPortalProject(clientId: string, projectId: string) {
  if (typeof projectId !== "string" || projectId.length < 1) return null;

  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
    select: {
      ...PROJECT_SELECT,
      stages: { select: STAGE_SELECT, orderBy: { order: "asc" } },
      // A LINHA que importa: visibility = CLIENTE, dentro do WHERE da
      // própria query de updates — não um filtro aplicado depois de buscar
      // tudo.
      updates: {
        where: { visibility: Visibility.CLIENTE },
        select: UPDATE_SELECT,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return project;
}
