import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { listProjectsForAdmin, getProjectStatusCounts } from "@/app/actions/project-admin";
import { ProjectStatus } from "@/lib/generated/prisma/enums";
import { AdminShell } from "../_components/AdminShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { Avatar } from "@/app/_components/Avatar";
import { EmptyState } from "@/app/_components/EmptyState";
import { LiveRefresh } from "@/app/_components/LiveRefresh";
import { formatDate } from "@/app/_components/format";
import { PROJECT_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";
import { SearchIcon, ArrowRightIcon } from "@/app/_components/icons";

export const metadata: Metadata = { title: "Projetos — Admin — Innovare Acompanhe" };

const FILTERS: { key: string; label: string; status?: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "andamento", label: "Em andamento", status: ProjectStatus.EM_ANDAMENTO },
  { key: "aguardando", label: "Aguardando cliente", status: ProjectStatus.AGUARDANDO_CLIENTE },
  { key: "revisao", label: "Em revisão", status: ProjectStatus.EM_REVISAO },
  { key: "concluido", label: "Concluídos", status: ProjectStatus.CONCLUIDO },
];

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; cursor?: string }>;
}) {
  const staff = await requireStaff();
  const { status: filterKey, q, cursor } = await searchParams;
  const activeFilter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];

  const [{ items, nextCursor }, counts] = await Promise.all([
    listProjectsForAdmin({ status: activeFilter.status as never, q, cursor, limit: 20 }),
    getProjectStatusCounts(),
  ]);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const emAndamento = counts[ProjectStatus.EM_ANDAMENTO] ?? 0;
  const aguardando = counts[ProjectStatus.AGUARDANDO_CLIENTE] ?? 0;
  const concluidos = counts[ProjectStatus.CONCLUIDO] ?? 0;

  return (
    <AdminShell active="projetos" staffName={staff.name}>
      <div className="title-row">
        <div>
          <p className="eyebrow">Operação</p>
          <h1 style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>Projetos</h1>
        </div>
        <LiveRefresh />
      </div>

      <div className="kpis">
        <div className="card kpi">
          <span className="eyebrow">Total de projetos</span>
          <span className="val num">{total}</span>
          <span className="foot">Convertidos de briefings</span>
        </div>
        <div className="card kpi">
          <span className="eyebrow">Em andamento</span>
          <span className="val num">{emAndamento}</span>
          <span className="foot">Em desenvolvimento ativo</span>
        </div>
        <div className="card kpi">
          <span className="eyebrow">Aguardando cliente</span>
          <span className="val num">{aguardando}</span>
          <span className="foot">{aguardando > 0 ? <b className="w">Precisa de retorno</b> : "Nenhum pendente"}</span>
        </div>
        <div className="card kpi">
          <span className="eyebrow">Concluídos</span>
          <span className="val num">{concluidos}</span>
          <span className="foot">
            <b>{total > 0 ? Math.round((concluidos / total) * 100) : 0}%</b> do total
          </span>
        </div>
      </div>

      <section className="card">
        <div className="toolbar">
          <div className="pills" role="group" aria-label="Filtrar por status">
            {FILTERS.map((filter) => {
              const count = filter.status ? counts[filter.status] ?? 0 : total;
              return (
                <Link
                  key={filter.key}
                  href={`/admin/projetos${queryString({ status: filter.key === "todos" ? undefined : filter.key, q })}`}
                  className="pill"
                  aria-current={filter.key === activeFilter.key ? "page" : undefined}
                >
                  {filter.label} <span className="n">{count}</span>
                </Link>
              );
            })}
          </div>
          <form method="GET" action="/admin/projetos" className="input-wrap search">
            {activeFilter.key !== "todos" && <input type="hidden" name="status" value={activeFilter.key} />}
            <SearchIcon />
            <input className="input" type="search" name="q" defaultValue={q} placeholder="Buscar por empresa" />
          </form>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyState icon="📁" title="Nenhum projeto ainda" hint="Converta um briefing na fila para criar o primeiro projeto." />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Projeto</th>
                  <th>Atualizado</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((project) => {
                  const meta = metaOrFallback(PROJECT_STATUS_META, project.status);
                  return (
                    <tr key={project.id}>
                      <td>
                        <Link href={`/admin/projetos/${project.id}`} className="who-cell">
                          <Avatar name={project.client.name} />
                          <div>
                            <b>{project.client.name}</b>
                            <small className="mono">{project.code}</small>
                          </div>
                        </Link>
                      </td>
                      <td>{project.title}</td>
                      <td className="mono">{formatDate(project.updatedAt)}</td>
                      <td>
                        <StatusBadge label={meta.label} tone={meta.tone} />
                      </td>
                      <td>
                        <span className="go">
                          <ArrowRightIcon />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-foot">
          <span>
            Mostrando {items.length} de {activeFilter.status ? counts[activeFilter.status] ?? 0 : total}
          </span>
          {nextCursor && (
            <Link
              href={`/admin/projetos${queryString({ status: activeFilter.key === "todos" ? undefined : activeFilter.key, q, cursor: nextCursor })}`}
              className="btn btn-secondary btn-sm"
            >
              Carregar mais
            </Link>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
