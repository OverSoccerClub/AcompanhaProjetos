// Paginação por offset (Anterior/Próxima + "Página X de Y") para as listas
// do admin. Puramente server-renderável (só `Link`, sem estado) — recebe
// `hrefFor` como função literal porque este componente nunca cruza para o
// bundle client (não leva "use client" nem é passado como prop para quem
// leva), então não há serialização: tudo resolve no servidor.
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/app/_components/icons";

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  return (
    <div className="pager">
      <span className="pager-info">{total === 0 ? "Nenhum registro" : `${from}–${to} de ${total}`}</span>
      <div className="pager-nav" role="group" aria-label="Paginação">
        {hasPrev ? (
          <Link href={hrefFor(page - 1)} className="btn btn-secondary btn-sm" aria-label="Página anterior">
            <ChevronLeftIcon /> Anterior
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm" aria-disabled="true">
            <ChevronLeftIcon /> Anterior
          </span>
        )}
        <span className="pager-page mono">
          Página {page} de {pageCount}
        </span>
        {hasNext ? (
          <Link href={hrefFor(page + 1)} className="btn btn-secondary btn-sm" aria-label="Próxima página">
            Próxima <ChevronRightIcon />
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm" aria-disabled="true">
            Próxima <ChevronRightIcon />
          </span>
        )}
      </div>
    </div>
  );
}
