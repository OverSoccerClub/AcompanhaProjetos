import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/session";
import { listPortalProjects, getClientName } from "@/lib/portal-data";
import { PortalShell } from "./_components/PortalShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { EmptyState } from "@/app/_components/EmptyState";
import { LiveRefresh } from "@/app/_components/LiveRefresh";
import { formatDate } from "@/app/_components/format";
import { PROJECT_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";

export const metadata: Metadata = { title: "Meus projetos — Innovare Acompanhe" };

// Lê só via `listPortalProjects` (@/lib/portal-data) — nunca `@/lib/prisma`
// diretamente a partir de `app/portal/**` (regra estrutural do produto).
export default async function PortalHomePage() {
  const client = await requireClient();
  const [projects, companyName] = await Promise.all([
    listPortalProjects(client.clientId),
    getClientName(client.clientId),
  ]);

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
                    <StatusBadge label={meta.label} tone={meta.tone} />
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
