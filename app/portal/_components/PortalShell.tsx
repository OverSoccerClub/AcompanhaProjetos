import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/app/_components/Avatar";
import { LogOutIcon } from "@/app/_components/icons";
import logoWhite from "@/public/logo-white.png";

// Casca visual comum das telas do portal do cliente: topbar navy fixa com a
// logomarca branca (§6.1) — é a âncora da marca, sempre navy nos dois temas.
// NÃO é o `app/portal/layout.tsx` (guarda de papel do Vega, intocado) — é um
// componente que cada `page.tsx` do portal importa.
export function PortalShell({
  clientName,
  companyName,
  children,
}: {
  clientName: string;
  companyName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="lockup">
            <Image src={logoWhite} alt="Innovare Code" width={127} height={26} priority />
            <span className="div" aria-hidden="true" />
            <span className="product">
              Acompanhe
              <small>Portal do cliente</small>
            </span>
          </div>
          <nav className="topnav" aria-label="Principal">
            <Link href="/portal" aria-current="page">
              Meus projetos
            </Link>
          </nav>
          <div className="user">
            <Avatar name={clientName} />
            <span className="who">
              {clientName}
              {companyName && <small>{companyName}</small>}
            </span>
            <form method="POST" action="/api/auth/logout">
              <button type="submit" className="btn-shell">
                <LogOutIcon />
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="conteudo-principal" className="page">
        {children}
      </main>
    </div>
  );
}
