import type { Metadata } from "next";
import { RequestLinkForm } from "./RequestLinkForm";
import { EnterButton } from "./EnterButton";

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
    <main id="conteudo-principal" className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="mark">Innovare Acompanhe</span>
          <span className="sub">Acompanhamento de projetos InnovareCode</span>
        </div>

        {token ? (
          <>
            <h1>Confirmar entrada</h1>
            <p className="lead">Clique no botão abaixo para acessar sua conta com segurança.</p>
            <form method="POST" action="/api/auth/verify">
              <input type="hidden" name="token" value={token} />
              <EnterButton token={token} />
            </form>
            <p className="section-hint" style={{ marginTop: 16 }}>
              Este link expira em 15 minutos e só pode ser usado uma vez. Se já tiver expirado,{" "}
              <a href="/entrar">peça um novo link</a>.
            </p>
          </>
        ) : (
          <>
            <h1>Acessar o portal</h1>
            <p className="lead">Informe seu e-mail cadastrado para receber um link de acesso.</p>
            <RequestLinkForm />
          </>
        )}
      </div>
    </main>
  );
}
