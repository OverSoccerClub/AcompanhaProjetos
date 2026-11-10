import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/session";
import { listPortalProjects, getClientName } from "@/lib/portal-data";
import { PortalShell } from "./_components/PortalShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { EmptyState } from "@/app/_components/EmptyState";
import { LiveRefresh } from "@/app/_components/LiveRefresh";
import { formatDate } from "@/app/_components/format";
import { ArrowRightIcon } from "@/app/_components/icons";
import { PROJECT_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";

export const metadata: Metadata = { title: "Meus projetos — Innovare Acompanhe" };

// Lê só via `listPortalProjects` (@/lib/portal-data) — nunca `@/lib/prisma`
// diretamente a partir de `app/portal/**` (regra estrutural do produto).
export default async function PortalHomePage() {
  const client = await requireClient();
  const projects = await listPortalProjects(client.clientId);

  // Cliente com exatamente 1 projeto não precisa escolher — vai direto ao
  // detalhe. `redirect()` dentro de um Server Component lança internamente
  // (não "retorna"), por isso não busca `getClientName` antes à toa.
  if (projects.length === 1) {
    redirect(`/portal/${projects[0].id}`);
  }

  const companyName = await getClientName(client.clientId);

  return (
    <PortalShell clientName={client.name} companyName={companyName}>
      <div className="page-title-row">
        <div>
          <h1>Seus projetos</h1>
          <p className="section-hint">Acompanhe o andamento de cada projeto com a InnovareCode.</p>
        </div>
        <LiveRefresh />
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🚀"
            title="Nenhum projeto por aqui ainda"
            hint="Quando um projeto seu começar, ele aparece nesta lista."
          />
        </div>
      ) : (
        <ul className="list">
          {projects.map((project) => {
            const meta = metaOrFallback(PROJECT_STATUS_META, project.status);
            return (
              <li key={project.id}>
                <Link href={`/portal/${project.id}`} className="list-item">
                  <div className="list-item-row">
                    <div>
                      <div className="list-item-title">
                        {project.code} — {project.title}
                      </div>
                      <div className="list-item-meta">Atualizado em {formatDate(project.updatedAt)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <StatusBadge label={meta.label} tone={meta.tone} />
                      {/* CTA visual — o <li> inteiro já é clicável (`list-item` é o
                          próprio <Link>); este span só deixa explícito que há uma
                          ação, pedido por ter vários projetos na lista. Sem
                          aria-hidden: o texto "Ver projeto" entra no nome acessível
                          do link, então também ajuda leitor de tela. */}
                      <span className="btn btn-secondary btn-sm">
                        Ver projeto <ArrowRightIcon />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PortalShell>
  );
}
