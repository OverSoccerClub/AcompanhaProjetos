import { NextResponse, type NextRequest } from "next/server";

// Filtro OTIMISTA de navegação (seção 5.4, ponto 1 da arquitetura) — só
// confere se existe UM cookie de sessão, sem validar contra o banco: a
// sessão deste app é opaca (hash em banco, não JWT), então não há como
// verificar assinatura/validade sem uma consulta — e correr essa consulta
// aqui (Edge, por padrão) duplicaria o trabalho que `requireStaff()`/
// `requireClient()` (lib/session.ts) já fazem, perto do dado, em TODA
// action/rota/layout protegido. A autorização que VALE (papel certo,
// sessão não revogada/expirada) está sempre lá — nunca só aqui.
//
// Cookie com o mesmo nome usado em lib/session.ts — duplicado aqui de
// propósito (não importamos lib/session.ts, que usa `cookies()` de
// `next/headers` e é server-only; o proxy lê via `request.cookies`).
const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-acompanhe_session" : "acompanhe_session";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(COOKIE_NAME)?.value);

  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/portal");
  if (!isProtected) return NextResponse.next();

  if (!hasSessionCookie) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Cookie presente: deixa passar. `requireStaff()`/`requireClient()` no
  // layout de cada área decide o papel de verdade e corrige o rumo (ex.:
  // CLIENT tentando abrir /admin recebe 403 da própria action/layout, não
  // deste filtro).
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
