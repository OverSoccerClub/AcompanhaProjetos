import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "./format";
import { UPDATE_TYPE_LABEL, VISIBILITY_META, metaOrFallback } from "./status-maps";
import { EmptyState } from "./EmptyState";

export type TimelineUpdate = {
  id: string;
  type: string;
  text: string;
  createdAt: Date | string;
  visibility?: string;
  stage: { id: string; name: string } | null;
};

// Lista de atualizações da linha do tempo de um projeto. `showVisibility`
// só é ligado pelo admin (o portal nunca recebe updates INTERNA — filtro
// estrutural em `lib/portal-data.ts` — então mostrar o badge lá seria
// redundante, não um risco, mas simplifica a leitura).
export function UpdatesList({ updates, showVisibility = false }: { updates: TimelineUpdate[]; showVisibility?: boolean }) {
  if (updates.length === 0) {
    return <EmptyState icon="🕊️" title="Nenhuma atualização ainda" />;
  }

  return (
    <ul className="update-list">
      {updates.map((update) => {
        const visibilityMeta = update.visibility ? metaOrFallback(VISIBILITY_META, update.visibility) : null;
        return (
          <li key={update.id} className="update-item" data-visibility={update.visibility}>
            <div className="update-head">
              <div className="update-head-tags">
                <StatusBadge label={UPDATE_TYPE_LABEL[update.type] ?? update.type} tone="neutral" />
                {showVisibility && visibilityMeta && (
                  <StatusBadge label={visibilityMeta.label} tone={visibilityMeta.tone} />
                )}
              </div>
              <time className="update-date" dateTime={new Date(update.createdAt).toISOString()}>
                {formatDateTime(update.createdAt)}
              </time>
            </div>
            <p className="update-text">{update.text}</p>
            {update.stage && <p className="update-stage-ref">Etapa: {update.stage.name}</p>}
          </li>
        );
      })}
    </ul>
  );
}
