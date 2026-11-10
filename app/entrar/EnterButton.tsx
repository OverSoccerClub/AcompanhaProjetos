"use client";

// Progressive enhancement do botão "Entrar": o <form> continua um POST
// nativo para /api/auth/verify (funciona sem JS, inclusive em scanners que
// desligam JS — ver contrato §5.2). Com JS, só troca o rótulo pelo estado
// de carregamento no clique; NUNCA chama `preventDefault`.
//
// ARMADILHA (provada no navegador): setar o atributo `disabled` do próprio
// botão de submit, de forma síncrona, dentro do `onClick` desse MESMO
// botão, cancela a submissão nativa do form no Chromium — o clique nunca
// chega a /api/auth/verify, o token nunca é consumido e a tela fica presa
// em "Entrando...". `aria-disabled` (sem o atributo DOM `disabled`) dá o
// mesmo feedback visual/assistivo sem interferir no envio nativo do form.
import { useState } from "react";

export function EnterButton() {
  const [entering, setEntering] = useState(false);

  return (
    <button
      type="submit"
      className="btn btn-primary btn-block"
      aria-disabled={entering}
      aria-busy={entering}
      onClick={(event) => {
        if (entering) event.preventDefault();
        setEntering(true);
      }}
    >
      {entering && <span className="spinner" aria-hidden="true" />}
      {entering ? "Entrando..." : "Entrar"}
    </button>
  );
}
