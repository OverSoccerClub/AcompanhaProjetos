"use client";

// Chama a Server Action `convertIntake` diretamente (ela já é "use server" —
// não precisa de wrapper). Usa estado local para loading/erro porque o
// formulário tem campos estruturados (não é um <form action={fn}> simples
// de FormData) — ver nota de arquitetura no handoff.
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { convertIntake } from "@/app/actions/intake-admin";
import { Alert } from "@/app/_components/Alert";
import { SubmitButton } from "@/app/_components/SubmitButton";

export function ConvertIntakeForm({
  intakeId,
  defaultTitle,
  defaultContactName,
  defaultContactEmail,
}: {
  intakeId: string;
  defaultTitle: string;
  defaultContactName: string;
  defaultContactEmail: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const nameId = useId();
  const emailId = useId();

  const [title, setTitle] = useState(defaultTitle);
  const [contactName, setContactName] = useState(defaultContactName);
  const [contactEmail, setContactEmail] = useState(defaultContactEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await convertIntake(intakeId, {
        title,
        projectType: "SITE",
        contactName,
        contactEmail,
      });
      router.push(`/admin/projetos/${result.projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível converter este intake.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ marginBottom: 14 }}>
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <div className="field">
        <label htmlFor={titleId}>Título do projeto</label>
        <input
          id={titleId}
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={2}
        />
      </div>

      <div className="field">
        <label htmlFor="project-type">Tipo de projeto</label>
        <select id="project-type" className="input" value="SITE" disabled>
          <option value="SITE">Site</option>
        </select>
        <p className="hint">Só o tipo Site está disponível nesta fase do produto.</p>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor={nameId}>Nome do contato</label>
          <input
            id={nameId}
            className="input"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div className="field">
          <label htmlFor={emailId}>E-mail do contato</label>
          <input
            id={emailId}
            type="email"
            className="input"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <p className="hint" style={{ marginBottom: 14 }}>
        Este e-mail recebe o convite de acesso ao portal (link mágico de boas-vindas).
      </p>

      <SubmitButton pending={pending} pendingLabel="Convertendo...">
        Converter em projeto
      </SubmitButton>
    </form>
  );
}
