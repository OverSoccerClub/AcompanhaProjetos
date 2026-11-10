"use client";

// Formulário de login por e-mail+senha — caminho único da EQUIPE (STAFF)
// em /equipe. <form method="POST" action="/api/auth/login"> é um POST
// nativo de verdade: SEM JavaScript, o navegador manda o
// x-www-form-urlencoded direto para a rota, que responde com um 303 nativo
// para /admin (mesmo contrato do POST /api/auth/verify). COM JavaScript,
// interceptamos o submit só para mostrar erro inline sem recarregar a
// página — a navegação final ainda é um `window.location.href` explícito
// (mesma armadilha documentada em app/entrar/EnterButton.tsx: não dar
// `disabled` no próprio botão de submit dentro do handler, cancela o envio
// nativo).
import { useId, useState } from "react";
import { SubmitButton } from "@/app/_components/SubmitButton";
import { MailIcon, LockIcon, ArrowRightIcon } from "@/app/_components/icons";

export function LoginForm() {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => null)) as
        | { redirectTo?: string; error?: { message?: string } }
        | null;

      if (!res.ok) {
        setPending(false);
        // Mesma mensagem para e-mail inexistente OU senha errada (contrato
        // de não-enumeração do backend) — não inventar aqui uma distinção
        // que o servidor deliberadamente não devolve.
        setError(data?.error?.message ?? "E-mail ou senha incorretos.");
        return;
      }
      window.location.href = data?.redirectTo ?? "/admin";
    } catch {
      setPending(false);
      setError("Não foi possível conectar ao servidor agora. Tente novamente em instantes.");
    }
  }

  return (
    <form method="POST" action="/api/auth/login" onSubmit={handleSubmit} noValidate>
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
            aria-invalid={!!error}
            aria-describedby={error ? `${emailId}-error` : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@innovarecode.com.br"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor={passwordId}>Senha</label>
        <div className="input-wrap">
          <LockIcon />
          <input
            id={passwordId}
            name="password"
            type="password"
            className="input"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && (
          <p className="error-msg" id={`${emailId}-error`} role="alert">
            {error}
          </p>
        )}
      </div>
      <SubmitButton pending={pending} pendingLabel="Entrando..." variant="primary" className="btn-lg btn-block">
        Entrar {!pending && <ArrowRightIcon />}
      </SubmitButton>
    </form>
  );
}
