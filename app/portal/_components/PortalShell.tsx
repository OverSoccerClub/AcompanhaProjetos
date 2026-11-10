// Casca visual comum das telas do portal do cliente (header com marca e
// logout). Mesma lógica do `AdminShell`: não é o `layout.tsx` (guarda de
// papel, intocado), é um componente que cada `page.tsx` do portal importa.
export function PortalShell({ clientName, children }: { clientName: string; children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Innovare</strong> <span>Acompanhe</span>
          </div>
          <div className="topbar-user">
            <span>{clientName}</span>
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
