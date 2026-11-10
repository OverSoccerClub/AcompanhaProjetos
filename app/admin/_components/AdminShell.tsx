import Link from "next/link";

// Casca visual comum das telas de admin (header com marca, navegação e
// logout). NÃO é o `app/admin/layout.tsx` (guarda de papel, intocado) — é um
// componente que cada `page.tsx` do admin importa e usa para não repetir o
// header em cada tela. `active` decide o item de nav marcado com
// `aria-current="page"` (não dá para usar `usePathname` aqui porque isto é
// Server Component, de propósito — evita mandar JS a mais para só pintar um
// header estático).
export function AdminShell({
  active,
  staffName,
  children,
}: {
  active: "intakes" | "projetos";
  staffName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Innovare</strong> <span>Acompanhe</span> <small>Admin</small>
          </div>
          <nav className="topbar-nav" aria-label="Navegação do admin">
            <Link href="/admin" aria-current={active === "intakes" ? "page" : undefined}>
              Intakes
            </Link>
            <Link href="/admin/projetos" aria-current={active === "projetos" ? "page" : undefined}>
              Projetos
            </Link>
          </nav>
          <div className="topbar-user">
            <span>{staffName}</span>
            <form method="POST" action="/api/auth/logout">
              <button type="submit" className="btn-logout">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="conteudo-principal" className="page-main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
