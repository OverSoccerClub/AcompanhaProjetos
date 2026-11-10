// Login por e-mail+senha — SÓ STAFF (a equipe InnovareCode acessa os
// projetos várias vezes por dia; gerar link mágico a cada acesso é
// inviável). CLIENT continua exclusivamente por link mágico (lib/magic-link.ts)
// — este módulo nem tenta autenticar um CLIENT, mesmo que ele descubra o
// endpoint e tente.
//
// Contrato de não-enumeração (mesmo raciocínio do lib/magic-link.ts):
// e-mail inexistente, e-mail de CLIENT, STAFF sem senha definida e senha
// errada devolvem EXATAMENTE o mesmo `null` — quem chama (a rota) responde
// com o mesmo corpo/status para todos. Sem isso, o endpoint vira um oráculo
// de quais e-mails pertencem à equipe.
import "server-only";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";
import { createSessionForUser, setSessionCookie } from "@/lib/session";

// Hash scrypt válido de um valor fixo que nunca é uma senha real de ninguém
// — gerado uma vez offline (`hashPassword(...)`), não em cada boot. Usado só
// para GASTAR O MESMO TEMPO DE CPU que uma verificação real, quando a conta
// não existe ou não tem senha. Sem isso, "conta não existe" responde quase
// instantaneamente enquanto "conta existe, senha errada" espera o scrypt
// (~50-100ms) — o mesmo oráculo de timing que a correção do magic-link já
// documentou na memória do projeto, só que aqui seria por e-mail de STAFF em
// vez de e-mail de cliente.
const DUMMY_HASH =
  "scrypt:16384:8:1:67009fd82d56d03ffc1a19f03d808c37:" +
  "f9ecf6394f46e52820466646c1b9d743d2f9e08ccccf38f503a61a2dc877d5b983d11db0f6ee0bff0175697da056a6570b6d79685bcdbb8dc08f0e4ae2d2c8f3";

export type LoginResult = {
  user: { id: string; email: string; name: string; role: "STAFF" };
};

export async function loginWithPassword(
  emailRaw: string,
  password: string,
  userAgent: string | null
): Promise<LoginResult | null> {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  const isEligibleStaff = !!user && user.role === "STAFF" && user.active && !!user.passwordHash;
  const hashToCompare = isEligibleStaff ? user!.passwordHash! : DUMMY_HASH;

  // SEMPRE roda o scrypt, exista ou não a conta — ver comentário de DUMMY_HASH.
  const passwordOk = await verifyPassword(password, hashToCompare);

  if (!isEligibleStaff || !passwordOk) {
    return null;
  }

  const { rawToken, expiresAt } = await createSessionForUser(user!.id, "STAFF", userAgent);
  await setSessionCookie(rawToken, expiresAt);
  await prisma.user.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } }).catch((err) => {
    console.error("[login] Falha ao atualizar lastLoginAt (não-crítico).", err);
  });

  return { user: { id: user!.id, email: user!.email, name: user!.name, role: "STAFF" } };
}
