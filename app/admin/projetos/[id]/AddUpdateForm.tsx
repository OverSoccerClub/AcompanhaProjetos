"use client";

// Visibilidade é SEMPRE uma escolha explícita (dois radios, nenhum marcado
// por padrão em JS puro — mas o schema por si é fail-closed em INTERNA caso
// a action receba algo inesperado). Aqui a UI marca "Interna" pré-selecionado
// de propósito: evita publicar pro cliente por descuido de quem só aperta
// Enter sem olhar o formulário.
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { addProjectUpdate } from "@/app/actions/project-admin";
import { Alert } from "@/app/_components/Alert";
import { SubmitButton } from "@/app/_components/SubmitButton";

type StageOption = { id: string; name: string };

export function AddUpdateForm({ projectId, stages }: { projectId: string; stages: StageOption[] }) {
  const router = useRouter();
  const textId = useId();
  const typeId = useId();
  const stageSelectId = useId();

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"INTERNA" | "CLIENTE">("INTERNA");
  const [type, setType] = useState("COMENTARIO");
  const [stageId, setStageId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setDone(false);
    try {
      await addProjectUpdate(projectId, {
        text,
        visibility,
        type: type as "COMENTARIO" | "ARQUIVO" | "MARCO",
        stageId: stageId || undefined,
      });
      setText("");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar a atualização.");
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
          <Alert tone="success">Atualização adicionada.</Alert>
        </div>
      )}

      <div className="field">
        <label htmlFor={textId}>Texto</label>
        <textarea
          id={textId}
          className="input"
          required
          minLength={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="O que aconteceu neste projeto?"
        />
      </div>

      <fieldset className="field">
        <legend>Visibilidade</legend>
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="visibility"
              value="INTERNA"
              checked={visibility === "INTERNA"}
              onChange={() => setVisibility("INTERNA")}
            />
            <span className="radio-label-text">
              Interna
              <small>Só a equipe InnovareCode vê.</small>
            </span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="visibility"
              value="CLIENTE"
              checked={visibility === "CLIENTE"}
              onChange={() => setVisibility("CLIENTE")}
            />
            <span className="radio-label-text">
              Visível ao cliente
              <small>Aparece na linha do tempo do portal.</small>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="form-row">
        <div className="field">
          <label htmlFor={typeId}>Tipo</label>
          <select id={typeId} className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="COMENTARIO">Comentário</option>
            <option value="ARQUIVO">Arquivo</option>
            <option value="MARCO">Marco</option>
          </select>
        </div>
        {stages.length > 0 && (
          <div className="field">
            <label htmlFor={stageSelectId}>Etapa relacionada (opcional)</label>
            <select id={stageSelectId} className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
              <option value="">Nenhuma</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <SubmitButton pending={pending} pendingLabel="Adicionando...">
        Adicionar atualização
      </SubmitButton>
    </form>
  );
}
