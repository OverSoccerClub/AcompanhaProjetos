import type { Metadata } from "next";
import { AuthShell } from "@/app/_components/AuthShell";
import { RequestLinkForm } from "./RequestLinkForm";
import { EnterButton } from "./EnterButton";

// GET /entrar — login do CLIENTE (link mágico). NUNCA consome o token
// (seção 5.2: scanners de e-mail corporativo abrem links para inspecionar,
// e se o GET consumisse o token, o cliente clicaria num link já "queimado").
// Com `?t=<token>` na URL (é pra cá que o e-mail do link mágico aponta),
// mostra só o botão "Entrar" que faz o POST real
// (funciona sem JS: <form method="POST" action="/api/auth/verify">).
//
// Equipe (senha) é uma rota separada: /equipe (app/equipe/page.tsx).
export const metadata: Metadata = { title: "Entrar — Innovare Acompanhe" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token } = await searchParams;

  return (
    <AuthShell
      brandEyebrow="Innovare Acompanhe"
      brandHeading={
        <>
          Seu projeto, <em>etapa por etapa.</em>
        </>
      }
      brandSub="Veja em que fase o seu software está, o que a equipe entregou e quando precisamos da sua aprovação."
      telemetry={
        <>
          <div className="tele-row">
            <span className="dot" style={{ background: "#4ccf8c" }} />
            <span>
              <b>Progresso</b> acompanhado em tempo real
            </span>
          </div>
          <div className="tele-row">
            <span className="dot" style={{ background: "#8ba6ff", boxShadow: "0 0 0 4px rgba(139,166,255,.2)" }} />
            <span>
              <b>Entregas</b> avisadas a cada etapa concluída
            </span>
          </div>
          <div className="tele-row">
            <span className="dot" style={{ background: "#f2b94a" }} />
            <span>
              <b>Aprovações</b> você decide quando avançar
            </span>
          </div>
        </>
      }
      header={
        token ? (
          <>
            <h1>Confirmar entrada</h1>
            <p className="lead">Clique no botão abaixo para acessar sua conta com segurança.</p>
          </>
        ) : (
          <>
            <h1>Acesse seu portal</h1>
            <p className="lead">Informe seu e-mail cadastrado para receber um link de acesso — sem senha.</p>
          </>
        )
      }
      secureNote={
        token ? (
          <>
            Este link expira em <b className="mono">15 min</b> e só pode ser usado uma vez. Se já tiver expirado,{" "}
            <a href="/entrar">peça um novo link</a>.
          </>
        ) : (
          "O link mágico vale por 15 min e funciona uma única vez. Não compartilhe esse link com outras pessoas."
        )
      }
    >
      {token ? (
        <form method="POST" action="/api/auth/verify">
          <input type="hidden" name="token" value={token} />
          <EnterButton token={token} />
        </form>
      ) : (
        <>
          <RequestLinkForm />
          <p className="auth-switch">
            É da equipe? <a href="/equipe">Entrar aqui</a>
          </p>
        </>
      )}
    </AuthShell>
  );
}
