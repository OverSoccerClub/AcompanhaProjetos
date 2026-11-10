import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "./format";
import { UPDATE_TYPE_LABEL, VISIBILITY_META, metaOrFallback } from "./status-maps";
import { EmptyState } from "./EmptyState";
import { StepIcon, FlagIcon, FileIcon, ChatIcon } from "./icons";

export type TimelineUpdate = {
  id: string;
  type: string;
  text: string;
  createdAt: Date | string;
  visibility?: string;
  stage: { id: string; name: string } | null;
};

const TYPE_ICON: Record<string, (props: { size?: number }) => React.ReactNode> = {
  ETAPA: StepIcon,
  MARCO: FlagIcon,
  ARQUIVO: FileIcon,
  COMENTARIO: ChatIcon,
  STATUS: StepIcon,
};

// Lista de atualizações da linha do tempo de um projeto. `showVisibility`
// só é ligado pelo admin (o portal nunca recebe updates INTERNA — filtro
// estrutural em `lib/portal-data.ts` — então mostrar o badge lá seria
// redundante, não um risco, mas simplifica a leitura).
export function UpdatesList({ updates, showVisibility = false }: { updates: TimelineUpdate[]; showVisibility?: boolean }) {
  if (updates.length === 0) {
    return <EmptyState icon="🕊️" title="Ainda sem atualizações" hint="A equipe publica aqui cada etapa concluída." />;
  }

  return (
    <ul className="feed">
      {updates.map((update) => {
        const visibilityMeta = update.visibility ? metaOrFallback(VISIBILITY_META, update.visibility) : null;
        const Icon = TYPE_ICON[update.type] ?? StepIcon;
        return (
          <li key={update.id} className="upd" data-type={update.type}>
            <span className="upd-ico">
              <Icon />
            </span>
            <div>
              <div className="upd-head">
                <span className="chip">{UPDATE_TYPE_LABEL[update.type] ?? update.type}</span>
                {showVisibility && visibilityMeta && <StatusBadge label={visibilityMeta.label} tone={visibilityMeta.tone} />}
                <time className="upd-date mono" dateTime={new Date(update.createdAt).toISOString()}>
                  {formatDateTime(update.createdAt)}
                </time>
              </div>
              <p>{update.text}</p>
              {update.stage && <p className="update-stage-ref">Etapa: {update.stage.name}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
