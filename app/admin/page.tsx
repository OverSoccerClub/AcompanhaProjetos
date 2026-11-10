import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { listIntakes } from "@/app/actions/intake-admin";
import { IntakeStatus } from "@/lib/generated/prisma/enums";
import { AdminShell } from "./_components/AdminShell";
import { StatusBadge } from "@/app/_components/StatusBadge";
import { EmptyState } from "@/app/_components/EmptyState";
import { formatDate } from "@/app/_components/format";
import { INTAKE_STATUS_META, metaOrFallback } from "@/app/_components/status-maps";

export const metadata: Metadata = { title: "Intakes — Admin — Innovare Acompanhe" };

const FILTERS: { key: string; label: string; status?: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "novo", label: "Novos", status: IntakeStatus.NOVO },
  { key: "em_triagem", label: "Em triagem", status: IntakeStatus.EM_TRIAGEM },
  { key: "convertido", label: "Convertidos", status: IntakeStatus.CONVERTIDO },
  { key: "descartado", label: "Descartados", status: IntakeStatus.DESCARTADO },
];

export default async function AdminIntakesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}) {
  const staff = await requireStaff();
  const { status: filterKey, cursor } = await searchParams;
  const activeFilter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];

  const { items, nextCursor } = await listIntakes({
    status: activeFilter.status as never,
    cursor,
    limit: 20,
  });

  return (
    <AdminShell active="intakes" staffName={staff.name}>
      <div className="page-title-row">
        <div>
          <h1>Fila de intakes</h1>
          <p className="section-hint">Briefings recebidos pelo formulário público, aguardando triagem.</p>
        </div>
      </div>

      <nav className="filters" aria-label="Filtrar por status">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={filter.key === "todos" ? "/admin" : `/admin?status=${filter.key}`}
            className="filter-pill"
            aria-current={filter.key === activeFilter.key ? "page" : undefined}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState icon="📭" title="Nenhum intake encontrado" hint="Tente outro filtro de status." />
        </div>
      ) : (
        <ul className="list">
          {items.map((intake) => {
            const meta = metaOrFallback(INTAKE_STATUS_META, intake.status);
            return (
              <li key={intake.id}>
                <Link href={`/admin/intakes/${intake.id}`} className="list-item">
                  <div className="list-item-row">
                    <div>
                      <div className="list-item-title">
                        {intake.protocol} — {intake.client.name}
                      </div>
                      <div className="list-item-meta">Recebido em {formatDate(intake.createdAt)}</div>
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
          <Link
            href={`/admin?${activeFilter.key !== "todos" ? `status=${activeFilter.key}&` : ""}cursor=${nextCursor}`}
            className="btn btn-secondary btn-sm"
          >
            Carregar mais
          </Link>
        </div>
      )}
    </AdminShell>
  );
}
