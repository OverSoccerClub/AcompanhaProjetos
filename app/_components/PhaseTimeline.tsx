import { StatusBadge } from "./StatusBadge";
import { formatDate } from "./format";
import { PHASE_LABEL, PHASE_ORDER, STAGE_STATUS_META, metaOrFallback } from "./status-maps";
import { CheckIcon } from "./icons";

export type TimelineStage = {
  id: string;
  order: number;
  key: string;
  name: string;
  phase: string;
  status: string;
  isApprovalPoint: boolean;
  expectedAt: Date | string | null;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
};

export type PhaseGroup = {
  phase: string;
  stages: TimelineStage[];
  done: number;
  total: number;
};

export function groupByPhase(stages: TimelineStage[]): PhaseGroup[] {
  return PHASE_ORDER.map((phase) => {
    const phaseStages = stages.filter((s) => s.phase === phase).sort((a, b) => a.order - b.order);
    const done = phaseStages.filter((s) => s.status === "CONCLUIDA" || s.status === "PULADA").length;
    return { phase, stages: phaseStages, done, total: phaseStages.length };
  });
}

/** A primeira fase (na ordem fixa do produto) que ainda tem etapa não
 * concluída/pulada — é a definição de "fase atual" usada tanto pelo trilho
 * quanto pelo agrupamento de etapas. Projeto 100% concluído cai na última
 * fase com etapas (não existe "fase atual" nesse caso, mas ainda precisa de
 * algo para expandir). */
export function currentPhaseOf(groups: PhaseGroup[]): string | null {
  const withStages = groups.filter((g) => g.total > 0);
  const incomplete = withStages.find((g) => g.done < g.total);
  if (incomplete) return incomplete.phase;
  return withStages.length > 0 ? withStages[withStages.length - 1].phase : null;
}

/** Agregado usado pelo resumo do projeto (§6.7, 4 colunas do portal) —
 * progresso geral, fase atual e próximo marco (próxima etapa que é ponto de
 * aprovação; na ausência de uma, a fase seguinte). Mesma fonte de verdade
 * (`stages`) que o `PhaseTimeline` usa para o trilho, sem outra consulta. */
export function projectProgress(stages: TimelineStage[]) {
  const groups = groupByPhase(stages);
  const currentPhase = currentPhaseOf(groups);
  const doneStages = stages.filter((s) => s.status === "CONCLUIDA" || s.status === "PULADA").length;
  const totalStages = stages.length;
  const progressPct = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;

  const byOrder = [...stages].sort((a, b) => a.order - b.order);
  const pendingApproval = byOrder.find((s) => s.isApprovalPoint && s.status !== "CONCLUIDA" && s.status !== "PULADA");

  const currentIndex = PHASE_ORDER.indexOf(currentPhase ?? "");
  const nextPhase = currentIndex >= 0 ? PHASE_ORDER[currentIndex + 1] : undefined;

  const nextMilestoneLabel = pendingApproval?.name ?? (nextPhase ? PHASE_LABEL[nextPhase] ?? nextPhase : "Entrega do projeto");

  return {
    doneStages,
    totalStages,
    progressPct,
    currentPhase,
    currentPhaseLabel: currentPhase ? PHASE_LABEL[currentPhase] ?? currentPhase : "—",
    currentPhaseIndex: currentIndex >= 0 ? currentIndex + 1 : groups.filter((g) => g.total > 0).length,
    totalPhases: PHASE_ORDER.length,
    nextMilestoneLabel,
    pendingApproval,
  };
}

function phaseState(group: PhaseGroup, currentPhase: string | null): "done" | "current" | "next" {
  if (group.phase === currentPhase) return "current";
  if (group.total > 0 && group.done >= group.total) return "done";
  return "next";
}

function PhaseRail({ groups, currentPhase }: { groups: PhaseGroup[]; currentPhase: string | null }) {
  return (
    <ol className="rail" aria-label="Fases do projeto">
      {groups.map((group, index) => {
        const state = phaseState(group, currentPhase);
        const pct = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0;
        return (
          <li
            className="phase"
            data-state={state}
            key={group.phase}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="p-idx">
              Fase {index + 1}
              {state === "done" ? " · Concluída" : state === "current" ? " · Agora" : ""}
            </span>
            <span className="p-name">{PHASE_LABEL[group.phase] ?? group.phase}</span>
            <span className="p-count mono">
              {group.done}/{group.total} etapas
            </span>
            <span className="p-bar">
              <i style={{ width: `${pct}%` }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StageNode({ stage, index }: { stage: TimelineStage; index: number }) {
  if (stage.status === "CONCLUIDA") {
    return (
      <span className="node">
        <CheckIcon />
      </span>
    );
  }
  if (stage.status === "EM_ANDAMENTO") {
    return <span className="node" />;
  }
  return <span className="node">{index + 1}</span>;
}

function StageItem({
  stage,
  index,
  variant,
  renderControls,
}: {
  stage: TimelineStage;
  index: number;
  variant: "admin" | "portal";
  renderControls?: (stage: TimelineStage) => React.ReactNode;
}) {
  const meta = metaOrFallback(STAGE_STATUS_META, stage.status);
  const approvalLabel = variant === "portal" ? "Sua aprovação" : "Aprovação do cliente";

  return (
    <li className="stage" data-status={stage.status}>
      <StageNode stage={stage} index={index} />
      <div>
        <div className="s-name">
          {stage.name}
          {stage.isApprovalPoint && <span className="approval">{approvalLabel}</span>}
        </div>
        <div className="s-dates mono">
          {stage.startedAt && <>Início {formatDate(stage.startedAt)} </>}
          {stage.completedAt && <>· Concluída {formatDate(stage.completedAt)}</>}
          {!stage.startedAt && !stage.completedAt && stage.expectedAt && <>Previsão {formatDate(stage.expectedAt)}</>}
        </div>
      </div>
      <div className="stage-controls">
        <StatusBadge label={meta.label} tone={meta.tone} />
        {renderControls?.(stage)}
      </div>
    </li>
  );
}

function PhaseBlock({
  group,
  variant,
  renderControls,
}: {
  group: PhaseGroup;
  variant: "admin" | "portal";
  renderControls?: (stage: TimelineStage) => React.ReactNode;
}) {
  return (
    <div className="phase-group">
      <div className="phase-mini">
        <b>{PHASE_LABEL[group.phase] ?? group.phase}</b>
        <span className="mono">
          {group.done}/{group.total} concluídas
        </span>
      </div>
      <ol className="stages">
        {group.stages.map((stage, index) => (
          <StageItem key={stage.id} stage={stage} index={index} variant={variant} renderControls={renderControls} />
        ))}
      </ol>
    </div>
  );
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

/** Linha do tempo das 4 fases do produto (Descoberta → Planejamento & Design
 * → Desenvolvimento → Entrega & Suporte): trilho de chevrons (§6.9) + lista
 * de etapas (§6.10). Usada IGUAL no admin e no portal — o que muda entre os
 * dois é `renderControls` (admin passa um formulário por etapa; portal não
 * passa nada) e `variant`: no portal só a fase atual fica expandida (fases
 * concluídas e futuras colapsam numa linha-resumo); no admin tudo fica
 * expandido, porque é lá que os controles vivem. Componente de Servidor: sem
 * hooks, `renderControls` pode devolver JSX com Client Components dentro
 * sem problema (a árvore inteira nasce no servidor). */
export function PhaseTimeline({
  stages,
  renderControls,
  variant = "admin",
}: {
  stages: TimelineStage[];
  renderControls?: (stage: TimelineStage) => React.ReactNode;
  variant?: "admin" | "portal";
}) {
  if (stages.length === 0) {
    return <p className="section-hint">Ainda não há etapas cadastradas para este projeto.</p>;
  }

  const groups = groupByPhase(stages);
  const currentPhase = currentPhaseOf(groups);
  const withStages = groups.filter((g) => g.total > 0);

  if (variant === "admin" || currentPhase === null) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <PhaseRail groups={groups} currentPhase={currentPhase} />
        </div>
        {withStages.map((group) => (
          <PhaseBlock key={group.phase} group={group} variant={variant} renderControls={renderControls} />
        ))}
      </div>
    );
  }

  const currentIndex = withStages.findIndex((g) => g.phase === currentPhase);
  const before = withStages.slice(0, currentIndex);
  const current = withStages[currentIndex];
  const after = withStages.slice(currentIndex + 1);

  const beforeDone = before.reduce((sum, g) => sum + g.done, 0);
  const beforeTotal = before.reduce((sum, g) => sum + g.total, 0);
  const afterTotal = after.reduce((sum, g) => sum + g.total, 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <PhaseRail groups={groups} currentPhase={currentPhase} />
      </div>

      {before.length > 0 && (
        <div className="collapsed">
          <span>
            <b>{joinLabels(before.map((g) => PHASE_LABEL[g.phase] ?? g.phase))}</b>{" "}
            {before.length > 1 ? "concluídas" : "concluída"}
          </span>
          <span className="mono num">
            {beforeDone}/{beforeTotal}
          </span>
        </div>
      )}

      <PhaseBlock group={current} variant={variant} renderControls={renderControls} />

      {after.length > 0 && (
        <div className="collapsed">
          <span>
            <b>{joinLabels(after.map((g) => PHASE_LABEL[g.phase] ?? g.phase))}</b>{" "}
            {after.length > 1 ? "ainda não começaram" : "ainda não começou"}
          </span>
          <span className="mono num">0/{afterTotal}</span>
        </div>
      )}
    </div>
  );
}
