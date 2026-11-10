"use client";

// Botão "Entrar" do link mágico. O <form> continua um POST nativo para
// /api/auth/verify (funciona sem JS — fallback para scanners/clientes sem JS).
// COM JS (todo usuário real), interceptamos o submit e fazemos o POST via
// fetch (JSON), navegando explicitamente para o destino que o servidor
// devolve (`redirectTo`). Isso evita o bug em que o navegador SEGUE o 303 do
// POST por baixo dos panos (cookie é gravado, sessão criada) mas NÃO troca a
// página — deixando a tela presa em "Entrando..." mesmo já logado.
//
// ARMADILHA (mantida da versão anterior): nunca setar o atributo DOM
// `disabled` do próprio botão de submit dentro do onClick — cancela o envio
// nativo no Chromium. Usamos estado + aria-busy, sem `disabled`.
import { useState, type MouseEvent } from "react";

export function EnterButton({ token }: { token: string }) {
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick(event: MouseEvent<HTMLButtonElement>) {
    // Com JS, assumimos o controle do envio (sem JS, este handler nem roda e
    // o <form> faz o POST nativo). Evita duplo clique durante o envio.
    event.preventDefault();
    if (entering) return;
    setEntering(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
        // Navegação explícita na MESMA origem (sempre o host público correto),
        // levando o cookie de sessão recém-gravado para a página de destino.
        window.location.href = data?.redirectTo ?? "/admin";
        return;
      }

      setEntering(false);
      setError("Link inválido, expirado ou já utilizado. Peça um novo link abaixo.");
    } catch {
      setEntering(false);
      setError("Não foi possível entrar agora. Tente novamente em instantes.");
    }
  }

  return (
    <>
      <button
        type="submit"
        className="btn btn-primary btn-block"
        aria-busy={entering}
        onClick={onClick}
      >
        {entering && <span className="spinner" aria-hidden="true" />}
        {entering ? "Entrando..." : "Entrar"}
      </button>
      {error && (
        <p className="auth-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </>
  );
}
