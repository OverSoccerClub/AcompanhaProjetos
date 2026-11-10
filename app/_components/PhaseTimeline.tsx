import { StatusBadge } from "./StatusBadge";
import { formatDate } from "./format";
import { PHASE_LABEL, PHASE_ORDER, STAGE_STATUS_META, metaOrFallback } from "./status-maps";

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

// Linha do tempo das 4 fases do produto (Descoberta → Planejamento & Design
// → Desenvolvimento → Entrega & Suporte), com as etapas de cada uma
// agrupadas e em ordem. Usada IGUAL no admin e no portal — o que muda entre
// os dois é só `renderControls` (admin passa um formulário por etapa; o
// portal não passa nada e fica só leitura). Componente de Servidor: sem
// hooks, `renderControls` pode devolver JSX com Client Components dentro
// sem problema (a árvore inteira nasce no servidor).
export function PhaseTimeline({
  stages,
  renderControls,
}: {
  stages: TimelineStage[];
  renderControls?: (stage: TimelineStage) => React.ReactNode;
}) {
  if (stages.length === 0) {
    return <p className="section-hint">Ainda não há etapas cadastradas para este projeto.</p>;
  }

  return (
    <div>
      {PHASE_ORDER.map((phase) => {
        const phaseStages = stages.filter((s) => s.phase === phase).sort((a, b) => a.order - b.order);
        if (phaseStages.length === 0) return null;
        const done = phaseStages.filter((s) => s.status === "CONCLUIDA" || s.status === "PULADA").length;

        return (
          <div className="phase-group" key={phase}>
            <div className="phase-heading">
              <span className="phase-name">{PHASE_LABEL[phase] ?? phase}</span>
              <span className="phase-progress">
                {done}/{phaseStages.length} concluídas
              </span>
            </div>
            <ol className="stage-list">
              {phaseStages.map((stage) => {
                const meta = metaOrFallback(STAGE_STATUS_META, stage.status);
                return (
                  <li className="stage-item" key={stage.id} data-status={stage.status}>
                    <div className="stage-main">
                      <span className="stage-name">
                        {stage.name}
                        {stage.isApprovalPoint && <span className="stage-approval"> · aprovação do cliente</span>}
                      </span>
                      <span className="stage-dates">
                        {stage.startedAt && <>Início {formatDate(stage.startedAt)} </>}
                        {stage.completedAt && <>· Concluída {formatDate(stage.completedAt)}</>}
                        {!stage.startedAt && !stage.completedAt && stage.expectedAt && (
                          <>Previsão {formatDate(stage.expectedAt)}</>
                        )}
                      </span>
                    </div>
                    <div className="stage-controls">
                      <StatusBadge label={meta.label} tone={meta.tone} />
                      {renderControls?.(stage)}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
