import { describe, expect, it } from "vitest";
import { normalizePagination, DEFAULT_PAGE_SIZE } from "./pagination";

describe("normalizePagination", () => {
  it("usa page=1 e o pageSize default quando nada é informado", () => {
    expect(normalizePagination({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE, skip: 0 });
  });

  it("aceita page/pageSize válidos e calcula skip", () => {
    expect(normalizePagination({ page: 3, pageSize: 10 })).toEqual({ page: 3, pageSize: 10, skip: 20 });
  });

  it("rejeita page < 1, não-inteiro ou ausente — cai para 1", () => {
    expect(normalizePagination({ page: 0 }).page).toBe(1);
    expect(normalizePagination({ page: -5 }).page).toBe(1);
    expect(normalizePagination({ page: 1.5 }).page).toBe(1);
    expect(normalizePagination({ page: undefined }).page).toBe(1);
  });

  it("rejeita pageSize fora da allowlist (10/25/50/100) — cai para o default", () => {
    expect(normalizePagination({ pageSize: 25 }).pageSize).toBe(25);
    expect(normalizePagination({ pageSize: 999 }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePagination({ pageSize: 0 }).pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(normalizePagination({ pageSize: -10 }).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("todas as opções da allowlist são aceitas e o skip bate com page*pageSize", () => {
    for (const pageSize of [10, 25, 50, 100]) {
      expect(normalizePagination({ page: 2, pageSize })).toEqual({ page: 2, pageSize, skip: pageSize });
    }
  });
});
