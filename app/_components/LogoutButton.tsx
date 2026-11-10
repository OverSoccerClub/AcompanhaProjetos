"use client";

// Botão "Sair" dos dois shells (AdminShell/PortalShell). O <form
// method="POST" action="/api/auth/logout"> ao redor continua existindo
// como fallback sem JS. COM JS, assumimos o controle do clique e
// navegamos explicitamente para /entrar — mesmo problema e mesma correção
// do EnterButton (app/entrar/EnterButton.tsx): o navegador pode seguir o
// redirect 303 do POST "por baixo dos panos" (cookie limpo, sessão
// revogada no banco) sem troca visível de página, deixando o botão preso.
//
// ARMADILHA (ver memória `disabled-no-proprio-onclick-cancela-submit`):
// nunca setar o atributo DOM `disabled` do próprio botão de submit dentro
// do onClick — cancela o envio nativo no Chromium. Por isso o estado de
// "saindo" só troca o rótulo/aria-busy, nunca `disabled`.
import { useState, type MouseEvent } from "react";

export function LogoutButton({ icon }: { icon?: React.ReactNode }) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function onClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Mesmo se a rede falhar, a sessão pode já ter sido revogada no
      // servidor — ainda assim tiramos o usuário da tela atual em vez de
      // deixá-lo preso em "Saindo...".
    } finally {
      window.location.href = "/entrar";
    }
  }

  return (
    <button type="submit" className="btn-shell" aria-busy={loggingOut} onClick={onClick}>
      {loggingOut ? <span className="spinner" aria-hidden="true" /> : icon}
      {loggingOut ? "Saindo..." : "Sair"}
    </button>
  );
}
