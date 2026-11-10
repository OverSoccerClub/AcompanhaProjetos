"use client";

// Controle inline de UMA etapa (select de status + botão), usado como
// `renderControls` do `PhaseTimeline` compartilhado. Fica compacto de
// propósito — a tela pode ter uma dezena de etapas na mesma página.
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { setStageState } from "@/app/actions/project-admin";
import { StageStatus } from "@/lib/generated/prisma/enums";
import { STAGE_STATUS_META } from "@/app/_components/status-maps";

export function StageControl({ stageId, currentStatus }: { stageId: string; currentStatus: string }) {
  const router = useRouter();
  const selectId = useId();
  const [status, setStatus] = useState(currentStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === currentStatus) return;
    setPending(true);
    setError(null);
    try {
      await setStageState(stageId, status);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar.");
      setStatus(currentStatus);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <label htmlFor={selectId} className="visually-hidden">
        Status da etapa
      </label>
      <select
        id={selectId}
        className="input"
        style={{ padding: "4px 8px", fontSize: "0.8rem", width: "auto" }}
        value={status}
        disabled={pending}
        onChange={(e) => setStatus(e.target.value)}
      >
        {Object.values(StageStatus).map((value) => (
          <option key={value} value={value}>
            {STAGE_STATUS_META[value]?.label ?? value}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || status === currentStatus}>
        {pending ? "Salvando..." : "Aplicar"}
      </button>
      {error && (
        <span role="alert" className="error">
          {error}
        </span>
      )}
    </form>
  );
}
