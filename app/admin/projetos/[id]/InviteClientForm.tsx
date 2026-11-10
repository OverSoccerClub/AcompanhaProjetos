"use client";

import { useId, useState } from "react";
import { inviteClientUser } from "@/app/actions/project-admin";
import { Alert } from "@/app/_components/Alert";
import { SubmitButton } from "@/app/_components/SubmitButton";

export function InviteClientForm({ clientId }: { clientId: string }) {
  const nameId = useId();
  const emailId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setDone(false);
    try {
      const result = await inviteClientUser(clientId, email, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      setName("");
      setEmail("");
    } catch (err) {
      // Só cai aqui uma falha REALMENTE inesperada (ex.: SMTP fora do ar) —
      // não usar `err.message` (em produção o Next.js substitui a mensagem
      // original por um texto genérico de proteção; ver nota em `convertIntake`).
      console.error("[InviteClientForm] Falha inesperada ao enviar convite.", err);
      setError("Não foi possível enviar o convite agora. Tente novamente em instantes.");
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
      {done && !error && <Alert tone="success">Convite enviado por e-mail (link mágico).</Alert>}
      {!done && (
        <>
          <div className="field">
            <label htmlFor={nameId}>Nome do contato</label>
            <input id={nameId} className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="field">
            <label htmlFor={emailId}>E-mail</label>
            <input
              id={emailId}
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <SubmitButton pending={pending} pendingLabel="Enviando..." variant="secondary">
            Convidar para o portal
          </SubmitButton>
        </>
      )}
      {done && !error && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setDone(false)}>
          Convidar outro contato
        </button>
      )}
    </form>
  );
}
