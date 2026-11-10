// Paginação por OFFSET com tamanho de página — usada pelas listas do admin
// (listIntakes, listProjectsForAdmin). Centralizado aqui porque as duas
// precisam da MESMA allowlist/validação; duplicar o clamp em cada action é
// como um dos dois acaba aceitando um pageSize fora da lista por esquecimento.
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type PaginationInput = { page?: number; pageSize?: number };

/** `page` mínimo 1 (qualquer valor inválido/ausente cai em 1 — nunca lança,
 * a lista admin não deveria quebrar por um `?page=abc` digitado à mão na
 * URL). `pageSize` só aceita a allowlist; fora dela, cai no default. */
export function normalizePagination(input: PaginationInput): { page: number; pageSize: number; skip: number } {
  const page = Number.isInteger(input.page) && (input.page as number) >= 1 ? (input.page as number) : 1;
  const pageSize = PAGE_SIZE_OPTIONS.includes(input.pageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? (input.pageSize as number)
    : DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize };
}
