import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/app/_components/Avatar";
import { InboxIcon, FolderIcon } from "@/app/_components/icons";
import { LogoutButton } from "@/app/_components/LogoutButton";
import { countNewIntakes } from "@/app/actions/intake-admin";
import logoWhite from "@/public/logo-white.png";

// Casca visual comum das telas de admin: sidebar navy de 248px com a
// logomarca branca (§6.1), que vira barra horizontal abaixo de 1000px
// (ver media query em globals.css). NÃO é o `app/admin/layout.tsx` (guarda
// de papel, intocado) — é um componente que cada `page.tsx` do admin
// importa e usa para não repetir o header em cada tela.
//
// Busca a contagem de briefings novos sozinho (Server Component async) para
// não obrigar toda página do admin a buscar e repassar esse número.
export async function AdminShell({
  active,
  staffName,
  children,
}: {
  active: "intakes" | "projetos";
  staffName: string;
  children: React.ReactNode;
}) {
  const newIntakes = await countNewIntakes().catch(() => 0);

  return (
    <div className="app">
      <aside className="side">
        <div className="lockup">
          <Image src={logoWhite} alt="Innovare Code" width={108} height={22} priority />
        </div>
        <span className="env">Painel interno</span>
        <nav className="nav-group" aria-label="Painel">
          <span className="eyebrow">Operação</span>
          <Link className="nav" href="/admin" aria-current={active === "intakes" ? "page" : undefined}>
            <InboxIcon />
            Briefings
            {newIntakes > 0 && <span className="count">{newIntakes}</span>}
          </Link>
          <Link className="nav" href="/admin/projetos" aria-current={active === "projetos" ? "page" : undefined}>
            <FolderIcon />
            Projetos
          </Link>
        </nav>
        <div className="me">
          <Avatar name={staffName} />
          <span>
            {staffName}
            <small>admin</small>
          </span>
          <form method="POST" action="/api/auth/logout" style={{ marginLeft: "auto" }}>
            <LogoutButton />
          </form>
        </div>
      </aside>
      <main id="conteudo-principal" className="main">
        {children}
      </main>
    </div>
  );
}
