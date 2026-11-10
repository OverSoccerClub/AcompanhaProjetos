// Fluxo de login por link mágico (seção 5.1 da arquitetura). Dois pontos
// críticos do contrato, ambos aqui:
//   1. `requestMagicLink` NUNCA revela se o e-mail existe — quem chama
//      (POST /api/auth/magic-link) sempre responde 202 com a mesma mensagem,
//      exista ou não a conta. Sem isso, o endpoint vira um oráculo de
//      enumeração de e-mails de clientes.
//   2. `consumeMagicLinkToken` é o único lugar que transforma um token em
//      sessão — e só é chamado pelo POST do botão "Entrar" (NUNCA pelo GET
//      da página /entrar, ver seção 5.2: scanners de e-mail corporativo
//      abrem o link e "queimariam" o token antes do cliente clicar).
import "server-only";
import { prisma } from "@/lib/prisma";
import { sha256Hex, generateOpaqueToken } from "@/lib/crypto";
import { sendMagicLinkEmail } from "@/lib/email";
import { createSessionForUser, setSessionCookie } from "@/lib/session";

const TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Passo 1: se existir um `User` ativo com este e-mail, gera um token novo
 * (invalidando qualquer token anterior não usado deste usuário) e envia por
 * e-mail. Não lança e não devolve nada que distinga "enviou" de "não
 * existia" — isso é responsabilidade de quem chama (resposta HTTP uniforme).
 */
export async function requestMagicLink(emailRaw: string, requestIp: string | null): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return;

  const rawToken = generateOpaqueToken();
  const tokenHash = sha256Hex(rawToken);
  const now = new Date();

  // Invalida tokens anteriores não usados deste usuário (consulta real
  // documentada no índice `MagicLinkToken(userId)`, ver schema.prisma).
  await prisma.magicLinkToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: now },
  });

  await prisma.magicLinkToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
      requestIp,
    },
  });

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const link = `${appUrl}/entrar?t=${rawToken}`;

  // Fire-and-forget: NÃO aguardamos o round-trip do SMTP aqui. Se
  // awaitássemos, a resposta HTTP de quem chama demoraria visivelmente mais
  // quando o e-mail existe (findUnique + 2 writes + SMTP) do que quando não
  // existe (só o findUnique) — um oráculo de timing que reconstrói a mesma
  // enumeração que a resposta uniforme tenta evitar. Seguro disparar sem
  // `await` porque o processo é um servidor Node de vida longa (container
  // "standalone" do Next, não uma function serverless que mata o processo no
  // retorno da resposta) — o event loop continua rodando a promise depois
  // que a rota já respondeu. Erros vão só para o log, nunca para quem chama.
  void sendMagicLinkEmail(user.email, link)
    .then((result) => {
      if (!result.ok) {
        console.error("[magic-link] Falha ao enviar e-mail de login — usuário não recebeu o link.", {
          userId: user.id,
        });
      }
    })
    .catch((err) => {
      console.error("[magic-link] Erro inesperado ao enviar e-mail de login.", { userId: user.id, err });
    });
}

export type ConsumedSession = {
  user: { id: string; email: string; name: string; role: "STAFF" | "CLIENT" };
};

/**
 * Passo 2 (só via POST, nunca GET): valida o token (existe, não usado, não
 * expirado, usuário ativo), marca como usado de forma atômica
 * (`updateMany` com `usedAt: null` na cláusula — evita duas requisições
 * concorrentes consumirem o mesmo token e criarem duas sessões) e cria a
 * `Session`, já gravando o cookie. Devolve `null` para qualquer token
 * inválido — quem chama responde `400 LINK_INVALID` sem distinguir o motivo.
 */
export async function consumeMagicLinkToken(
  rawToken: string,
  userAgent: string | null
): Promise<ConsumedSession | null> {
  if (typeof rawToken !== "string" || rawToken.length < 16) return null;

  const tokenHash = sha256Hex(rawToken);
  const token = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  const now = new Date();
  if (!token || token.usedAt !== null || token.expiresAt <= now || !token.user.active) {
    return null;
  }

  const consumed = await prisma.magicLinkToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: now },
  });
  if (consumed.count === 0) {
    // Perdeu a corrida para outra requisição concorrente com o mesmo token.
    return null;
  }

  const { rawToken: sessionToken, expiresAt } = await createSessionForUser(
    token.user.id,
    token.user.role,
    userAgent
  );
  await setSessionCookie(sessionToken, expiresAt);
  await prisma.user.update({ where: { id: token.user.id }, data: { lastLoginAt: now } }).catch((err) => {
    console.error("[magic-link] Falha ao atualizar lastLoginAt (não-crítico).", err);
  });

  return { user: { id: token.user.id, email: token.user.email, name: token.user.name, role: token.user.role } };
}
