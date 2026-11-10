import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { listProjectsForAdmin } from "@/app/actions/project-admin";
import { AdminShell } from "../_components/AdminShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { EmptyState } from "@/app/_components/EmptyState";
import { formatDate } from "@/app/_components/format";
import { PROJECT_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";

export const metadata: Metadata = { title: "Projetos — Admin — Innovare Acompanhe" };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const staff = await requireStaff();
  const { cursor } = await searchParams;
  const { items, nextCursor } = await listProjectsForAdmin(cursor, 20);

  return (
    <AdminShell active="projetos" staffName={staff.name}>
      <div className="page-title-row">
        <div>
          <h1>Projetos</h1>
          <p className="section-hint">Todos os projetos convertidos, por atividade recente.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📁"
            title="Nenhum projeto ainda"
            hint="Converta um intake na fila para criar o primeiro projeto."
          />
        </div>
      ) : (
        <ul className="list">
          {items.map((project) => {
            const meta = metaOrFallback(PROJECT_STATUS_META, project.status);
            return (
              <li key={project.id}>
                <Link href={`/admin/projetos/${project.id}`} className="list-item">
                  <div className="list-item-row">
                    <div>
                      <div className="list-item-title">
                        {project.code} — {project.title}
                      </div>
                      <div className="list-item-meta">
                        {project.client.name} · atualizado em {formatDate(project.updatedAt)}
                      </div>
                    </div>
                    <StatusBadge label={meta.label} tone={meta.tone} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && (
        <div className="pagination">
          <Link href={`/admin/projetos?cursor=${nextCursor}`} className="btn btn-secondary btn-sm">
            Carregar mais
          </Link>
        </div>
      )}
    </AdminShell>
  );
}
