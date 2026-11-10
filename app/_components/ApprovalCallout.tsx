import { FlagIcon } from "./icons";

// Callout de ação do cliente (§6.8): aparece no portal quando há etapa com
// `isApprovalPoint` em andamento ou próxima. `anchorHref` aponta para a
// seção de etapas já existente na página (sem criar uma rota/ação nova).
export function ApprovalCallout({
  stageName,
  inProgress,
  anchorHref,
}: {
  stageName: string;
  inProgress: boolean;
  anchorHref: string;
}) {
  return (
    <div className="callout" data-tone="warning">
      <span className="ico">
        <FlagIcon size={18} />
      </span>
      <div className="txt">
        <b>{inProgress ? "Uma etapa está pronta para sua avaliação" : "Sua aprovação vai ser necessária em breve"}</b>
        <span>A etapa &ldquo;{stageName}&rdquo; depende do seu aceite para o projeto avançar.</span>
      </div>
      <a href={anchorHref} className="btn btn-secondary btn-sm">
        Ver etapas
      </a>
    </div>
  );
}
