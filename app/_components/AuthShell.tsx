import Image from "next/image";
import { LockIcon } from "@/app/_components/icons";
import logoWhite from "@/public/logo-white.png";
import logoMarkWhite from "@/public/logo-mark-white.png";

// Casca visual comum das duas telas de login (`/entrar` cliente, `/equipe`
// staff) — grid de duas colunas (painel de marca à esquerda, cartão de
// acesso à direita, ver docs/design-system.md §6.2). Cada rota só injeta a
// copy e o formulário que mudam entre os dois públicos; layout/imagens não
// se repetem.
export function AuthShell({
  brandEyebrow,
  brandHeading,
  brandSub,
  telemetry,
  header,
  secureNote,
  children,
}: {
  brandEyebrow: string;
  brandHeading: React.ReactNode;
  brandSub: string;
  telemetry?: React.ReactNode;
  header: React.ReactNode;
  secureNote?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main id="conteudo-principal" className="auth">
      <div className="auth-brand grid-tex">
        <Image src={logoWhite} alt="Innovare Code" width={166} height={34} className="logo" />
        <div>
          <p className="eyebrow" style={{ color: "var(--shell-ink-2)" }}>
            {brandEyebrow}
          </p>
          <h2 style={{ marginTop: 14 }}>{brandHeading}</h2>
          <p className="sub">{brandSub}</p>
        </div>
        {telemetry && <div className="telemetry" aria-hidden="true">{telemetry}</div>}
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
            {header}
          </div>

          {children}

          {secureNote && (
            <div className="secure-note">
              <LockIcon />
              <span>{secureNote}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
