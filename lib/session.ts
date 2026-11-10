// Sessão em BANCO (não JWT) — decisão explícita da arquitetura (seção 2,
// decisão 6): aqui revogar o acesso de um cliente precisa valer NA HORA, e
// o custo de um SELECT por requisição é irrelevante nesta escala (< 10
// acessos simultâneos). Diferente do Painel de Missões (que usa JWT em
// lib/session-token.ts) — não copiar aquele padrão aqui, é deliberado.
//
// Único módulo autorizado a ler/escrever o cookie de sessão e a tabela
// `Session`. Toda rota/action/página deve passar por `getSessionUser()`,
// `requireStaff()` ou `requireClient()` — nunca ler o cookie por conta
// própria (mesma regra do `lib/access.ts` do Painel).
import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sha256Hex, generateOpaqueToken } from "@/lib/crypto";
import type { User } from "@/lib/generated/prisma/client";

// Prefixo `__Host-` (seção 5.1 da arquitetura) exige Secure + Path=/ + sem
// atributo Domain — e navegadores REJEITAM esse prefixo em cookies não-HTTPS.
// Em dev local (http://localhost) isso quebraria o cookie silenciosamente,
// então o prefixo só é usado quando o app roda com `secure: true` (produção).
const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-acompanhe_session" : "acompanhe_session";

const CLIENT_SESSION_DAYS = 30;
const STAFF_SESSION_DAYS = 7;

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "clientId" | "active">;

const SESSION_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  clientId: true,
  active: true,
} as const;

/** Cria a linha `Session` e devolve o token em claro (nunca persistido) +
 * a validade — quem chama decide quando gravar o cookie (`setSessionCookie`). */
export async function createSessionForUser(
  userId: string,
  role: User["role"],
  userAgent: string | null = null
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateOpaqueToken();
  const tokenHash = sha256Hex(rawToken);
  const days = role === "CLIENT" ? CLIENT_SESSION_DAYS : STAFF_SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash, expiresAt, userAgent } });
  return { rawToken, expiresAt };
}

export async function setSessionCookie(rawToken: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Lê o cookie + valida contra o banco (não revogada, não expirada, usuário
 * ativo). Devolve `null` para qualquer falha — nunca lança. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = sha256Hex(raw);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: { revokedAt: true, expiresAt: true, user: { select: SESSION_USER_SELECT } },
  });

  const now = new Date();
  if (!session || session.revokedAt !== null || session.expiresAt <= now || !session.user.active) {
    return null;
  }
  return session.user;
}

/** Revoga a sessão atual (carimba `revokedAt`, nunca deleta a linha — mesma
 * regra do schema) e limpa o cookie. Usado por `POST /api/auth/logout`. */
export async function revokeCurrentSession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (raw) {
    const tokenHash = sha256Hex(raw);
    await prisma.session
      .updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } })
      .catch((err) => console.error("[session] Falha ao revogar sessão.", err));
  }
  store.delete(COOKIE_NAME);
}

/** Exige STAFF. Lança se não — Server Actions/rotas do admin chamam isto
 * como primeira linha; a checagem de ROLE (não só "está logado") é o que
 * impede um CLIENT de chamar uma action de staff mesmo adivinhando o nome. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "STAFF") {
    throw new Error("Acesso restrito à equipe InnovareCode.");
  }
  return user;
}

/** Exige CLIENT com `clientId` presente (invariante do schema — ver CHECK
 * constraint comentada em prisma/schema.prisma). Lança se não. */
export async function requireClient(): Promise<SessionUser & { clientId: string }> {
  const user = await getSessionUser();
  if (!user || user.role !== "CLIENT" || !user.clientId) {
    throw new Error("Sessão inválida ou expirada.");
  }
  return { ...user, clientId: user.clientId };
}

export { COOKIE_NAME };
