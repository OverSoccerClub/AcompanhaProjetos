// Tradução PT-BR + "tom" visual (cor semântica do badge) para os enums do
// Prisma usados nas telas de admin/portal. Único lugar que faz esse mapa —
// qualquer tela nova que mostrar um status importa daqui em vez de repetir
// a tradução solta em JSX.
import {
  IntakeStatus,
  ProjectStatus,
  StageStatus,
  ProjectPhase,
  UpdateType,
  Visibility,
} from "@/lib/generated/prisma/enums";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

type StatusMeta = { label: string; tone: Tone };

export const INTAKE_STATUS_META: Record<string, StatusMeta> = {
  [IntakeStatus.NOVO]: { label: "Novo", tone: "info" },
  [IntakeStatus.EM_TRIAGEM]: { label: "Em triagem", tone: "warning" },
  [IntakeStatus.CONVERTIDO]: { label: "Convertido", tone: "success" },
  [IntakeStatus.DESCARTADO]: { label: "Descartado", tone: "neutral" },
};

export const PROJECT_STATUS_META: Record<string, StatusMeta> = {
  [ProjectStatus.BRIEFING_RECEBIDO]: { label: "Briefing recebido", tone: "info" },
  [ProjectStatus.EM_ANALISE]: { label: "Em análise", tone: "info" },
  [ProjectStatus.PROPOSTA_ENVIADA]: { label: "Proposta enviada", tone: "warning" },
  [ProjectStatus.APROVADO]: { label: "Aprovado", tone: "info" },
  [ProjectStatus.EM_ANDAMENTO]: { label: "Em andamento", tone: "info" },
  [ProjectStatus.AGUARDANDO_CLIENTE]: { label: "Aguardando cliente", tone: "warning" },
  [ProjectStatus.EM_REVISAO]: { label: "Em revisão", tone: "warning" },
  [ProjectStatus.PUBLICADO]: { label: "Publicado", tone: "success" },
  [ProjectStatus.EM_SUPORTE]: { label: "Em suporte", tone: "success" },
  [ProjectStatus.CONCLUIDO]: { label: "Concluído", tone: "success" },
  [ProjectStatus.PAUSADO]: { label: "Pausado", tone: "neutral" },
  [ProjectStatus.CANCELADO]: { label: "Cancelado", tone: "danger" },
};

export const STAGE_STATUS_META: Record<string, StatusMeta> = {
  [StageStatus.PENDENTE]: { label: "Pendente", tone: "neutral" },
  [StageStatus.EM_ANDAMENTO]: { label: "Em andamento", tone: "info" },
  [StageStatus.CONCLUIDA]: { label: "Concluída", tone: "success" },
  [StageStatus.PULADA]: { label: "Pulada", tone: "neutral" },
};

export const PHASE_LABEL: Record<string, string> = {
  [ProjectPhase.DESCOBERTA]: "Descoberta",
  [ProjectPhase.PLANEJAMENTO_DESIGN]: "Planejamento & Design",
  [ProjectPhase.DESENVOLVIMENTO]: "Desenvolvimento",
  [ProjectPhase.ENTREGA_SUPORTE]: "Entrega & Suporte",
};

export const PHASE_ORDER: string[] = [
  ProjectPhase.DESCOBERTA,
  ProjectPhase.PLANEJAMENTO_DESIGN,
  ProjectPhase.DESENVOLVIMENTO,
  ProjectPhase.ENTREGA_SUPORTE,
];

export const UPDATE_TYPE_LABEL: Record<string, string> = {
  [UpdateType.STATUS]: "Status",
  [UpdateType.ETAPA]: "Etapa",
  [UpdateType.COMENTARIO]: "Comentário",
  [UpdateType.ARQUIVO]: "Arquivo",
  [UpdateType.MARCO]: "Marco",
};

export const VISIBILITY_META: Record<string, StatusMeta> = {
  [Visibility.INTERNA]: { label: "Interna (equipe)", tone: "neutral" },
  [Visibility.CLIENTE]: { label: "Visível ao cliente", tone: "info" },
};

export function metaOrFallback(meta: Record<string, StatusMeta>, key: string): StatusMeta {
  return meta[key] ?? { label: key, tone: "neutral" };
}
