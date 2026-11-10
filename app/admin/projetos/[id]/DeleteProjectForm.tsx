"use client";

// Exclusão definitiva de um projeto (admin). Ação destrutiva de verdade —
// cascata no banco apaga Stage/ProjectUpdate junto (ver `deleteProject` em
// app/actions/project-admin.ts) — por isso exige confirmação EXPLÍCITA em
// dois passos antes de chamar a Server Action: 1) botão discreto revela um
// painel com o aviso; 2) só o segundo clique, dentro do painel, dispara a
// exclusão. Sem `window.confirm()` (foge do design system e não dá pra
// estilizar) e sem `<details>` nativo (o texto de aviso precisa de
// `role="alert"`, que some ao fechar via toggle do próprio <summary>).
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/actions/project-admin";
import { Alert } from "@/app/_components/Alert";

export function DeleteProjectForm({ projectId, projectLabel }: { projectId: string; projectLabel: string }) {
  const router = useRouter();
  const panelId = useId();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteProject(projectId);
      router.push("/admin/projetos");
    } catch (err) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Falha ao excluir o projeto.");
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={() => setConfirming((v) => !v)}
        aria-expanded={confirming}
        aria-controls={panelId}
      >
        Excluir projeto
      </button>

      {confirming && (
        <div id={panelId} className="stack" style={{ gap: 10, marginTop: 12 }}>
          <Alert tone="danger">
            Tem certeza? Isso não pode ser desfeito e apaga as etapas e atualizações de{" "}
            <strong>{projectLabel}</strong>.
          </Alert>
          {error && <Alert tone="danger">{error}</Alert>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
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
              onClick={handleDelete}
              aria-busy={pending}
              disabled={pending}
            >
              {pending ? "Excluindo..." : "Sim, excluir projeto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
