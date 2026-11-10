// Guarda de papel dos dois layouts protegidos (seção 5.4, ponto 2 da
// arquitetura) — teste unitário (sem banco) das REAIS app/admin/layout.tsx
// e app/portal/layout.tsx, mockando só `@/lib/session` (a fonte da sessão)
// e `next/navigation` (o redirect). Cobre os dois sentidos:
//   - cliente → /admin barrado (já esperado)
//   - staff → /portal barrado (a lacuna que a Lyra não cobriu, apontada no
//     briefing — o comentário de app/portal/layout.tsx até alerta pra isso)
// `proxy.ts` (middleware) só checa "existe cookie" — o guard que VALE é
// este, por isso o teste aponta pros layouts, não pro proxy.
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMock = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/session", () => sessionMock);

class RedirectCalled extends Error {
  constructor(public path: string) {
    super(`redirect(${path})`);
  }
}
const navigationMock = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectCalled(path);
  }),
}));
vi.mock("next/navigation", () => navigationMock);

const { default: AdminLayout } = await import("./admin/layout");
const { default: PortalLayout } = await import("./portal/layout");

const STAFF = { id: "u-staff", email: "staff@innovarecode.com.br", name: "Staff", role: "STAFF" as const, clientId: null, active: true };
const CLIENT = { id: "u-client", email: "cliente@example.com", name: "Cliente", role: "CLIENT" as const, clientId: "c-1", active: true };
const CHILDREN = "conteudo-protegido" as never;

beforeEach(() => {
  vi.clearAllMocks();
});

async function redirectPathOf(layoutCall: Promise<unknown>): Promise<string> {
  try {
    await layoutCall;
  } catch (err) {
    if (err instanceof RedirectCalled) return err.path;
    throw err;
  }
  throw new Error("esperava um redirect, mas o layout retornou normalmente");
}

describe("AdminLayout — só STAFF entra", () => {
  it("CLIENTE tentando abrir /admin é redirecionado para /portal (nunca vê o children)", async () => {
    sessionMock.getSessionUser.mockResolvedValue(CLIENT);
    const path = await redirectPathOf(AdminLayout({ children: CHILDREN }));
    expect(path).toBe("/portal");
  });

  it("sem sessão nenhuma é redirecionado para /entrar", async () => {
    sessionMock.getSessionUser.mockResolvedValue(null);
    const path = await redirectPathOf(AdminLayout({ children: CHILDREN }));
    expect(path).toBe("/entrar");
  });

  it("STAFF entra normalmente — nenhum redirect é chamado", async () => {
    sessionMock.getSessionUser.mockResolvedValue(STAFF);
    await AdminLayout({ children: CHILDREN });
    expect(navigationMock.redirect).not.toHaveBeenCalled();
  });
});

describe("PortalLayout — só CLIENT entra (lacuna: staff→/portal também precisa ser barrado)", () => {
  it("STAFF tentando abrir /portal é redirecionado para /admin (nunca vê o children)", async () => {
    sessionMock.getSessionUser.mockResolvedValue(STAFF);
    const path = await redirectPathOf(PortalLayout({ children: CHILDREN }));
    expect(path).toBe("/admin");
  });

  it("sem sessão nenhuma é redirecionado para /entrar", async () => {
    sessionMock.getSessionUser.mockResolvedValue(null);
    const path = await redirectPathOf(PortalLayout({ children: CHILDREN }));
    expect(path).toBe("/entrar");
  });

  it("CLIENT entra normalmente — nenhum redirect é chamado", async () => {
    sessionMock.getSessionUser.mockResolvedValue(CLIENT);
    await PortalLayout({ children: CHILDREN });
    expect(navigationMock.redirect).not.toHaveBeenCalled();
  });
});
