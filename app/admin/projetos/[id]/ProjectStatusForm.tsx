"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { setProjectStatus } from "@/app/actions/project-admin";
import { ProjectStatus } from "@/lib/generated/prisma/enums";
import { Alert } from "@/app/_components/Alert";
import { SubmitButton } from "@/app/_components/SubmitButton";
import { PROJECT_STATUS_META } from "@/app/_components/status-maps";

export function ProjectStatusForm({ projectId, currentStatus }: { projectId: string; currentStatus: string }) {
  const router = useRouter();
  const selectId = useId();
  const noteId = useId();

  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setDone(false);
    try {
      await setProjectStatus(projectId, status, note.trim() || undefined);
      setNote("");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ marginBottom: 12 }}>
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      {done && !error && (
        <div style={{ marginBottom: 12 }}>
          <Alert tone="success">Status atualizado.</Alert>
        </div>
      )}
      <div className="field">
        <label htmlFor={selectId}>Novo status</label>
        <select id={selectId} className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.values(ProjectStatus).map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_META[value]?.label ?? value}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={noteId}>Nota para o cliente (opcional)</label>
        <textarea
          id={noteId}
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Se preenchida, aparece no portal do cliente. Em branco, a mudança fica só registrada internamente."
        />
        <p className="hint">Deixe em branco para registrar a mudança só para a equipe.</p>
      </div>
      <SubmitButton pending={pending} pendingLabel="Salvando..." variant="secondary">
        Atualizar status
      </SubmitButton>
    </form>
  );
}
