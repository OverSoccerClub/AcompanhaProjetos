import type { Metadata } from "next";
import Image from "next/image";
import { RequestLinkForm } from "./RequestLinkForm";
import { EnterButton } from "./EnterButton";
import { LockIcon } from "@/app/_components/icons";
import logoWhite from "@/public/logo-white.png";
import logoMarkWhite from "@/public/logo-mark-white.png";

// GET /entrar — página pública de login. NUNCA consome o token (seção 5.2:
// scanners de e-mail corporativo abrem links para inspecionar, e se o GET
// consumisse o token, o cliente clicaria num link já "queimado"). Com
// `?t=<token>` na URL, mostra só um botão "Entrar" que faz o POST real
// (funciona sem JS: <form method="POST" action="/api/auth/verify">).
export const metadata: Metadata = { title: "Entrar — Innovare Acompanhe" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token } = await searchParams;

  return (
    <main id="conteudo-principal" className="auth">
      <div className="auth-brand grid-tex">
        <Image src={logoWhite} alt="Innovare Code" width={166} height={34} className="logo" />
        <div>
          <p className="eyebrow" style={{ color: "var(--shell-ink-2)" }}>
            Innovare Acompanhe
          </p>
          <h2 style={{ marginTop: 14 }}>
            Seu projeto, <em>etapa por etapa.</em>
          </h2>
          <p className="sub">
            Veja em que fase o seu software está, o que a equipe entregou e quando precisamos da sua aprovação.
          </p>
        </div>
        <div className="telemetry" aria-hidden="true">
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
        </div>
        <div className="auth-foot">
          <span>innovarecode.com.br</span>
          <span>Conexão segura · TLS</span>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div>
            <div className="mark">
              <Image src={logoMarkWhite} alt="" width={28} height={17} />
            </div>
            {token ? (
              <>
                <h1>Confirmar entrada</h1>
                <p className="lead">Clique no botão abaixo para acessar sua conta com segurança.</p>
              </>
            ) : (
              <>
                <h1>Acessar o portal</h1>
                <p className="lead">Informe seu e-mail cadastrado para receber um link de acesso.</p>
              </>
            )}
          </div>

          {token ? (
            <form method="POST" action="/api/auth/verify">
              <input type="hidden" name="token" value={token} />
              <EnterButton token={token} />
            </form>
          ) : (
            <RequestLinkForm />
          )}

          <div className="secure-note">
            <LockIcon />
            {token ? (
              <span>
                Este link expira em <b className="mono">15 min</b> e só pode ser usado uma vez. Se já tiver expirado,{" "}
                <a href="/entrar">peça um novo link</a>.
              </span>
            ) : (
              <span>
                O link vale por <b className="mono">15 min</b> e funciona uma única vez. Não pediremos sua senha por
                e-mail.
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
