import { formatDate } from "./format";

// Resumo do projeto (§6.7): 4 colunas — progresso geral, fase atual,
// próximo marco, início/entrega prevista. Só apresentação; os números vêm
// prontos de `projectProgress()` (PhaseTimeline.tsx), mesma fonte de verdade
// do trilho de fases.
export function ProjectSummary({
  progressPct,
  doneStages,
  totalStages,
  currentPhaseLabel,
  currentPhaseIndex,
  totalPhases,
  nextMilestoneLabel,
  expectedStartAt,
  expectedEndAt,
}: {
  progressPct: number;
  doneStages: number;
  totalStages: number;
  currentPhaseLabel: string;
  currentPhaseIndex: number;
  totalPhases: number;
  nextMilestoneLabel: string;
  expectedStartAt: Date | string | null;
  expectedEndAt: Date | string | null;
}) {
  return (
    <div className="card summary">
      <div>
        <span className="eyebrow">Progresso geral</span>
        <span className="big num">
          {progressPct}
          <small>%</small>
        </span>
        <div className="meter" role="img" aria-label={`${doneStages} de ${totalStages} etapas concluídas`}>
          <i style={{ width: `${progressPct}%` }} />
        </div>
        <span className="stat-sub">
          <span className="mono num">
            {doneStages}/{totalStages}
          </span>{" "}
          etapas concluídas
        </span>
      </div>
      <div>
        <span className="eyebrow">Fase atual</span>
        <span className="stat">{currentPhaseLabel}</span>
        <span className="stat-sub">
          Fase {currentPhaseIndex} de {totalPhases}
        </span>
      </div>
      <div>
        <span className="eyebrow">Próximo marco</span>
        <span className="stat">{nextMilestoneLabel}</span>
        <span className="stat-sub mono">{expectedEndAt ? `Previsão ${formatDate(expectedEndAt)}` : "Sem previsão"}</span>
      </div>
      <div>
        <span className="eyebrow">Início</span>
        <span className="stat">{expectedStartAt ? formatDate(expectedStartAt) : "—"}</span>
        <span className="stat-sub">
          {expectedEndAt ? <>Entrega prevista {formatDate(expectedEndAt)}</> : "Entrega ainda não definida"}
        </span>
      </div>
    </div>
  );
}
