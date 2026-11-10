"use server";

// Server Actions do admin para gestão de um projeto já convertido (seção
// 4.3). Toda action exige STAFF. Nenhuma recebe `clientId`/escopo do
// cliente como argumento confiável — a checagem de pertencimento (quando
// aplicável) é feita consultando o registro pelo `id` antes de agir.
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { ProjectStatus, StageStatus, UpdateType, Visibility } from "@/lib/generated/prisma/enums";
import { requireStaff } from "@/lib/session";
import { requestMagicLink } from "@/lib/magic-link";

/** Muda o status macro do projeto e grava um ProjectUpdate do tipo STATUS.
 * `noteForClient`, se informado, publica a nota com visibility=CLIENTE;
 * sem nota, o registro é só interno (fail-closed, mesmo default do schema). */
export async function setProjectStatus(projectId: string, status: string, noteForClient?: string) {
  const staff = await requireStaff();

  if (!Object.values(ProjectStatus).includes(status as never)) {
    throw new Error(`Status de projeto inválido: ${status}`);
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Projeto não encontrado.");

  const now = new Date();
  await prisma.$transaction([
    prisma.project.update({
      where: { id: projectId },
      data: {
        status: status as never,
        ...(status === ProjectStatus.EM_ANDAMENTO && !project.startedAt ? { startedAt: now } : {}),
        ...(status === ProjectStatus.CONCLUIDO ? { completedAt: now } : {}),
      },
    }),
    prisma.projectUpdate.create({
      data: {
        projectId,
        authorId: staff.id,
        type: UpdateType.STATUS,
        visibility: noteForClient ? Visibility.CLIENTE : Visibility.INTERNA,
        text: noteForClient?.trim() || `Status alterado de ${project.status} para ${status}.`,
        meta: { fromStatus: project.status, toStatus: status },
      },
    }),
  ]);
}

/** Muda o estado de uma etapa e publica um ProjectUpdate do tipo ETAPA
 * (sempre visível ao cliente — o avanço de etapas é justamente o que o
 * portal promete mostrar). */
export async function setStageState(stageId: string, status: string) {
  const staff = await requireStaff();

  if (!Object.values(StageStatus).includes(status as never)) {
    throw new Error(`Status de etapa inválido: ${status}`);
  }

  const stage = await prisma.projectStage.findUnique({ where: { id: stageId } });
  if (!stage) throw new Error("Etapa não encontrada.");

  const now = new Date();
  await prisma.$transaction([
    prisma.projectStage.update({
      where: { id: stageId },
      data: {
        status: status as never,
        ...(status === StageStatus.EM_ANDAMENTO && !stage.startedAt ? { startedAt: now } : {}),
        ...(status === StageStatus.CONCLUIDA ? { completedAt: now } : {}),
      },
    }),
    prisma.projectUpdate.create({
      data: {
        projectId: stage.projectId,
        stageId: stage.id,
        authorId: staff.id,
        type: UpdateType.ETAPA,
        visibility: Visibility.CLIENTE,
        text: `Etapa "${stage.name}" atualizada para ${status}.`,
      },
    }),
  ]);
}

export type AddUpdateInput = {
  text: string;
  visibility: "INTERNA" | "CLIENTE";
  type?: "COMENTARIO" | "ARQUIVO" | "MARCO";
  stageId?: string;
};

/** Adiciona uma entrada livre na linha do tempo. `visibility` é SEMPRE
 * explícito aqui (sem default silencioso) — quem escreve decide, na hora,
 * se aquilo é para o cliente ver. */
export async function addProjectUpdate(projectId: string, input: AddUpdateInput) {
  const staff = await requireStaff();

  if (typeof input.text !== "string" || input.text.trim().length < 1) {
    throw new Error("Texto da atualização não pode ser vazio.");
  }
  if (input.visibility !== Visibility.INTERNA && input.visibility !== Visibility.CLIENTE) {
    throw new Error("Visibilidade inválida.");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw new Error("Projeto não encontrado.");

  if (input.stageId) {
    const stage = await prisma.projectStage.findUnique({ where: { id: input.stageId }, select: { projectId: true } });
    if (!stage || stage.projectId !== projectId) throw new Error("Etapa não pertence a este projeto.");
  }

  return prisma.projectUpdate.create({
    data: {
      projectId,
      stageId: input.stageId ?? null,
      authorId: staff.id,
      type: input.type ?? UpdateType.COMENTARIO,
      visibility: input.visibility,
      text: input.text.trim().slice(0, 10_000),
    },
  });
}

/** Convida (ou reconvida) um contato de um Client já existente — mesmo
 * fluxo de link mágico usado na conversão de intake (seção 5.3b). */
export async function inviteClientUser(clientId: string, email: string, name: string) {
  await requireStaff();

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) throw new Error("E-mail inválido.");
  if (typeof name !== "string" || name.trim().length < 2) throw new Error("Nome inválido.");

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) throw new Error("Cliente não encontrado.");

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (user && (user.role !== "CLIENT" || user.clientId !== clientId)) {
    throw new Error("Este e-mail já está cadastrado para outro papel ou outra empresa.");
  }
  if (!user) {
    user = await prisma.user.create({
      data: { email: normalizedEmail, name: name.trim(), role: "CLIENT", clientId },
    });
  }

  await requestMagicLink(user.email, null);
  return { userId: user.id };
}

export type DeleteProjectResult = { id: string; code: string };

/** Exclui um Project e tudo que só existe em função dele (ProjectStage,
 * ProjectUpdate) — NUNCA o Client, o User nem o Intake que o originou.
 *
 * O schema já declara `onDelete: Cascade` de ProjectStage e ProjectUpdate
 * para Project, e `onDelete: SetNull` de Intake.projectId (ver migração
 * `20261110121453_init`) — então um único `prisma.project.delete` já apaga
 * as etapas/atualizações em cascata no banco e só desvincula o Intake
 * histórico (ele continua existindo, sem projeto). Não há FK de volta para
 * Client/User a partir daqui, então nada além do Project é tocado.
 *
 * Idempotente no sentido de convergência de estado: a primeira chamada
 * apaga; uma repetição (duplo clique, retry) encontra o projeto já
 * ausente e falha com "Projeto não encontrado" — não há efeito duplicado
 * possível numa exclusão. */
export async function deleteProject(projectId: string): Promise<DeleteProjectResult> {
  await requireStaff();

  if (typeof projectId !== "string" || projectId.trim().length < 1) {
    throw new Error("Id de projeto inválido.");
  }

  try {
    const deleted = await prisma.project.delete({
      where: { id: projectId },
      select: { id: true, code: true },
    });
    return deleted;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new Error("Projeto não encontrado.");
    }
    throw err;
  }
}

export type ListProjectsInput = {
  status?: (typeof ProjectStatus)[keyof typeof ProjectStatus];
  /** Busca simples por nome do cliente (contains, case-insensitive). */
  q?: string;
  cursor?: string;
  limit?: number;
};

/** Lista os projetos para a tela de admin (sem filtro de cliente por
 * padrão, com paginação — nunca "todos os projetos" sem limite). */
export async function listProjectsForAdmin(input: ListProjectsInput = {}) {
  await requireStaff();
  const take = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const q = input.q?.trim();
  const items = await prisma.project.findMany({
    where: {
      ...(input.status && { status: input.status }),
      ...(q && { client: { name: { contains: q, mode: "insensitive" } } }),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
    select: { id: true, code: true, title: true, status: true, updatedAt: true, client: { select: { name: true } } },
  });
  const hasMore = items.length > take;
  return { items: items.slice(0, take), nextCursor: hasMore ? items[take].id : null };
}

/** Contagem de projetos por status (KPIs do admin — §6.12). Uma única query
 * de agregação. */
export async function getProjectStatusCounts(): Promise<Record<string, number>> {
  await requireStaff();
  const groups = await prisma.project.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<string, number> = {};
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

/** Detalhe completo do projeto para o admin — SEM filtro de visibilidade
 * (o staff vê tudo, inclusive updates INTERNA). Nunca reutilizar esta
 * função a partir do portal do cliente — aquele caminho é
 * `lib/portal-data.ts`. */
export async function getProjectForAdmin(projectId: string) {
  await requireStaff();
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      stages: { orderBy: { order: "asc" } },
      updates: { orderBy: { createdAt: "desc" }, include: { stage: { select: { id: true, name: true } } } },
    },
  });
}
