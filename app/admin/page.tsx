import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { listIntakes, getIntakeStatusCounts } from "@/app/actions/intake-admin";
import { IntakeStatus } from "@/lib/generated/prisma/enums";
import { AdminShell } from "./_components/AdminShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { Avatar } from "@/app/_components/Avatar";
import { EmptyState } from "@/app/_components/EmptyState";
import { formatDate } from "@/app/_components/format";
import { INTAKE_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";
import { SearchIcon, ArrowRightIcon } from "@/app/_components/icons";

export const metadata: Metadata = { title: "Briefings — Admin — Innovare Acompanhe" };

const FILTERS: { key: string; label: string; status?: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "novo", label: "Novos", status: IntakeStatus.NOVO },
  { key: "em_triagem", label: "Em triagem", status: IntakeStatus.EM_TRIAGEM },
  { key: "convertido", label: "Convertidos", status: IntakeStatus.CONVERTIDO },
  { key: "descartado", label: "Descartados", status: IntakeStatus.DESCARTADO },
];

function sourceLabel(source: string): string {
  if (source === "solicitar-site") return "Solicitação pelo site";
  return source
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export default async function AdminIntakesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; cursor?: string }>;
}) {
  const staff = await requireStaff();
  const { status: filterKey, q, cursor } = await searchParams;
  const activeFilter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];

  const [{ items, nextCursor }, counts] = await Promise.all([
    listIntakes({ status: activeFilter.status as never, q, cursor, limit: 20 }),
    getIntakeStatusCounts(),
  ]);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const novos = counts[IntakeStatus.NOVO] ?? 0;
  const triagem = counts[IntakeStatus.EM_TRIAGEM] ?? 0;
  const convertidos = counts[IntakeStatus.CONVERTIDO] ?? 0;

  return (
    <AdminShell active="intakes" staffName={staff.name}>
      <div className="title-row">
        <div>
          <p className="eyebrow">Operação</p>
          <h1 style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>Briefings recebidos</h1>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <span className="eyebrow">Novos</span>
          <span className="val num">{novos}</span>
          <span className="foot">Aguardando triagem</span>
        </div>
        <div className="card kpi">
          <span className="eyebrow">Em triagem</span>
          <span className="val num">{triagem}</span>
          <span className="foot">Em avaliação pela equipe</span>
        </div>
        <div className="card kpi">
          <span className="eyebrow">Convertidos</span>
          <span className="val num">{convertidos}</span>
          <span className="foot">
            <b>{total > 0 ? Math.round((convertidos / total) * 100) : 0}%</b> do total
          </span>
        </div>
        <div className="card kpi">
          <span className="eyebrow">Total de briefings</span>
          <span className="val num">{total}</span>
          <span className="foot">Desde o início</span>
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
                  href={`/admin${queryString({ status: filter.key === "todos" ? undefined : filter.key, q })}`}
                  className="pill"
                  aria-current={filter.key === activeFilter.key ? "page" : undefined}
                >
                  {filter.label} <span className="n">{count}</span>
                </Link>
              );
            })}
          </div>
          <form method="GET" action="/admin" className="input-wrap search">
            {activeFilter.key !== "todos" && <input type="hidden" name="status" value={activeFilter.key} />}
            <SearchIcon />
            <input className="input" type="search" name="q" defaultValue={q} placeholder="Buscar por empresa" />
          </form>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyState icon="📭" title="Nenhum briefing com este status" hint="Novos briefings enviados pelo site aparecem aqui." />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Canal</th>
                  <th>Recebido</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Abrir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((intake) => {
                  const meta = metaOrFallback(INTAKE_STATUS_META, intake.status);
                  return (
                    <tr key={intake.id} data-unread={intake.status === IntakeStatus.NOVO ? "" : undefined}>
                      <td>
                        <Link href={`/admin/intakes/${intake.id}`} className="who-cell">
                          <Avatar name={intake.client.name} />
                          <div>
                            <b>{intake.client.name}</b>
                            <small className="mono">{intake.protocol}</small>
                          </div>
                        </Link>
                      </td>
                      <td>{sourceLabel(intake.source)}</td>
                      <td className="mono">{formatDate(intake.createdAt)}</td>
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
          <span>Mostrando {items.length} de {activeFilter.status ? counts[activeFilter.status] ?? 0 : total}</span>
          {nextCursor && (
            <Link
              href={`/admin${queryString({ status: activeFilter.key === "todos" ? undefined : activeFilter.key, q, cursor: nextCursor })}`}
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
