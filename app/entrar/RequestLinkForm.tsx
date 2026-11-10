"use client";

// Formulário de "pedir link de acesso" (contrato §4.3 da arquitetura):
// POST JSON para /api/auth/magic-link, resposta SEMPRE genérica (202, mesma
// mensagem exista ou não a conta) — não tratar diferente por "sucesso"/
// "e-mail não encontrado", isso seria o próprio vazamento que o contrato
// evita. A única distinção real de UI é "pedido foi enviado ao servidor"
// vs. "o servidor nem respondeu" (falha de rede), daí os dois estados.
import { useId, useState } from "react";
import { Alert } from "@/app/_components/Alert";
import { SubmitButton } from "@/app/_components/SubmitButton";
import { MailIcon, ArrowRightIcon, CheckIcon } from "@/app/_components/icons";

export function RequestLinkForm() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setStatus("idle");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // VALIDATION_ERROR (e-mail mal formado) é o único caso que o
        // contrato devolve diferente de 202 — mostra o erro de campo, sem
        // revelar nada sobre a existência da conta.
        setStatus("error");
        setMessage(data?.error?.message ?? "Não foi possível enviar. Confira o e-mail informado.");
        return;
      }
      setStatus("sent");
      setMessage(data?.message ?? "Se este e-mail estiver cadastrado, você vai receber um link em instantes.");
    } catch {
      // Falha de rede/servidor fora do ar — diferente de "e-mail não existe".
      setStatus("error");
      setMessage("Não foi possível conectar ao servidor agora. Tente novamente em instantes.");
    } finally {
      setSending(false);
    }
  }

  if (status === "sent") {
    return (
      <div className="sent" role="status">
        <CheckIcon size={18} />
        <span>
          <b>Link enviado para {email || "seu e-mail"}</b>
          {message} Verifique também a caixa de spam.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={emailId}>E-mail</label>
        <div className="input-wrap">
          <MailIcon />
          <input
            id={emailId}
            name="email"
            type="email"
            className="input"
            required
            autoComplete="email"
            autoFocus
            aria-invalid={status === "error"}
            aria-describedby={status === "error" ? `${emailId}-error` : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com.br"
          />
        </div>
        {status === "error" && message && (
          <p className="error-msg" id={`${emailId}-error`} role="alert">
            {message}
          </p>
        )}
      </div>
      <SubmitButton pending={sending} pendingLabel="Enviando..." variant="primary" className="btn-lg btn-block">
        Receber link de acesso {!sending && <ArrowRightIcon />}
      </SubmitButton>
    </form>
  );
}
