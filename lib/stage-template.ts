// Template de etapas por tipo de projeto (seção 3 da arquitetura). Fase 1
// só tem o template SITE (decisão D12: "só SITE no MVP") — `convertIntake`
// recusa converter para qualquer outro `ProjectType` até existir o
// primeiro projeto real daquele tipo (não desenhar template no escuro).
//
// `ProjectStage` é LINHA, não enum: isto é só o SEED inicial de um projeto
// novo. O staff pode editar/pular/renomear etapas depois sem migração.
import type { Prisma } from "@/lib/generated/prisma/client";
import { ProjectPhase } from "@/lib/generated/prisma/enums";

export type StageSeed = {
  key: string;
  name: string;
  phase: (typeof ProjectPhase)[keyof typeof ProjectPhase];
  isApprovalPoint?: boolean;
};

export const SITE_STAGE_TEMPLATE: StageSeed[] = [
  { key: "briefing_recebido", name: "Briefing recebido", phase: ProjectPhase.DESCOBERTA },
  { key: "reuniao_alinhamento", name: "Reunião de alinhamento", phase: ProjectPhase.DESCOBERTA },
  { key: "proposta_aprovada", name: "Proposta aprovada", phase: ProjectPhase.DESCOBERTA },
  {
    key: "coleta_materiais",
    name: "Coleta de materiais (logo, textos, fotos)",
    phase: ProjectPhase.PLANEJAMENTO_DESIGN,
  },
  { key: "layout", name: "Layout", phase: ProjectPhase.PLANEJAMENTO_DESIGN },
  {
    key: "aprovacao_layout",
    name: "Aprovação do layout pelo cliente",
    phase: ProjectPhase.PLANEJAMENTO_DESIGN,
    isApprovalPoint: true,
  },
  { key: "desenvolvimento_paginas", name: "Desenvolvimento das páginas", phase: ProjectPhase.DESENVOLVIMENTO },
  { key: "conteudo_seo", name: "Conteúdo e SEO", phase: ProjectPhase.DESENVOLVIMENTO },
  {
    key: "revisao_cliente",
    name: "Revisão do cliente",
    phase: ProjectPhase.DESENVOLVIMENTO,
    isApprovalPoint: true,
  },
  { key: "publicacao", name: "Publicação (domínio/e-mail)", phase: ProjectPhase.ENTREGA_SUPORTE },
  { key: "treinamento_entrega", name: "Treinamento/entrega", phase: ProjectPhase.ENTREGA_SUPORTE },
  { key: "garantia", name: "Garantia", phase: ProjectPhase.ENTREGA_SUPORTE },
];

const TEMPLATES: Record<string, StageSeed[]> = {
  SITE: SITE_STAGE_TEMPLATE,
};

export function getStageTemplate(projectType: string): StageSeed[] | null {
  return TEMPLATES[projectType] ?? null;
}

/** Semeia as etapas de um projeto recém-criado dentro da MESMA transação de
 * `convertIntake`. Lança se o tipo não tiver template (ver decisão acima). */
export async function applyStageTemplate(
  tx: Prisma.TransactionClient,
  projectId: string,
  projectType: string
): Promise<void> {
  const template = getStageTemplate(projectType);
  if (!template) {
    throw new Error(
      `Ainda não existe template de etapas para o tipo "${projectType}" (só SITE no MVP — decisão D12).`
    );
  }
  await tx.projectStage.createMany({
    data: template.map((stage, order) => ({
      projectId,
      order,
      key: stage.key,
      name: stage.name,
      phase: stage.phase,
      isApprovalPoint: stage.isApprovalPoint ?? false,
    })),
  });
}
