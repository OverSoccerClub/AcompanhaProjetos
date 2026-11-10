"use client";

// Exclusão por linha, usada nas duas listas do admin (briefings e
// projetos). Mesmo princípio do `DeleteProjectForm` da tela de detalhe
// (dois passos: botão discreto revela um painel, só o segundo clique
// dentro do painel dispara a exclusão) — sem `window.confirm()` (foge do
// design system) e sem popover `position:absolute` (o `.table-wrap` tem
// `overflow-x:auto`, que corta qualquer coisa posicionada fora dele; o
// painel fica no fluxo normal, dentro da própria célula, e só empurra a
// altura daquela linha enquanto confirma).
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@/app/_components/icons";

export function RowDeleteButton({
  label,
  confirmText,
  onDelete,
}: {
  /** aria-label do botão de lixeira, ex. "Excluir briefing de Acme Ltda". */
  label: string;
  /** Texto do aviso dentro do painel de confirmação. */
  confirmText: React.ReactNode;
  /** `deleteIntake`/`deleteProject` devolvem `{ ok, error }` (nunca
   * lançam para erro esperado — ver nota em `convertIntake`, mesma correção
   * do "Minified React error #441"), por isso o contrato aqui exige essa
   * união em vez de `unknown`. */
  onDelete: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const panelId = useId();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      const result = await onDelete();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      setConfirming(false);
    } catch (err) {
      // Só cai aqui uma falha REALMENTE inesperada — não usar `err.message`
      // (em produção o Next.js substitui a mensagem original por um texto
      // genérico de proteção quando a action lança).
      console.error("[RowDeleteButton] Falha inesperada ao excluir.", err);
      setError("Não foi possível excluir agora. Tente novamente em instantes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="row-delete">
      <button
        type="button"
        className="row-delete-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={confirming}
        aria-controls={panelId}
        onClick={(e) => {
          e.stopPropagation();
          setConfirming((v) => !v);
          setError(null);
        }}
      >
        <TrashIcon size={16} />
      </button>

      {confirming && (
        <div id={panelId} role="dialog" aria-label="Confirmar exclusão" className="row-delete-panel">
          <p>{confirmText}</p>
          {error && (
            <p className="row-delete-error" role="alert">
              {error}
            </p>
          )}
          <div className="row-delete-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(false);
                setError(null);
              }}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirm();
              }}
              aria-busy={pending}
              disabled={pending}
            >
              {pending ? "Excluindo..." : "Sim, excluir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
