// Envio de e-mail transacional. Mesmo contrato do Painel de Missões
// (lib/email.ts): config só por env var (SMTP_HOST/PORT/USER/PASS/EMAIL_FROM
// — ver .env.example), SEM modo "finge que enviou" em nenhum ambiente — o
// login por link mágico é fail-closed por desenho: se o e-mail não sai de
// verdade, ninguém entra. Módulo SERVER-ONLY.
//
// NUNCA logar o token/link em claro, o corpo do e-mail nem credenciais SMTP
// — os logs abaixo se limitam a destinatário + assunto.
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export type SendEmailInput = { to: string; subject: string; html: string; text?: string };
export type SendEmailResult = { ok: boolean };

type SmtpConfig = { host: string; port: number; user: string; pass: string; from: string };

const DEFAULT_PORT = 587;
const DEFAULT_FROM = "InnovareCode Acompanhe <acompanhe@innovarecode.com.br>";

function resolveSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST || "";
  if (!host) return null;
  const portFromEnv = Number(process.env.SMTP_PORT);
  const port = Number.isFinite(portFromEnv) && portFromEnv > 0 ? portFromEnv : DEFAULT_PORT;
  return {
    host,
    port,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
  };
}

let cachedTransporter: Transporter | null = null;
let cachedConfigKey: string | null = null;

function configKey(config: SmtpConfig): string {
  return `${config.host}|${config.port}|${config.user}|${config.pass}|${config.from}`;
}

function getTransporter(config: SmtpConfig): Transporter {
  const key = configKey(config);
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

/**
 * Envia um e-mail transacional. Nunca lança para quem chama — falta de
 * configuração, erro de rede ou erro do SMTP viram sempre `{ ok: false }`;
 * quem chama decide como reagir (login: nunca falha visivelmente ao usuário
 * — ver lib/magic-link.ts; notificação interna: best-effort, loga e segue).
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  const config = resolveSmtpConfig();
  if (!config) {
    console.error("[email] SMTP não configurado (SMTP_HOST ausente) — e-mail NÃO enviado.", { to, subject });
    return { ok: false };
  }
  try {
    const transporter = getTransporter(config);
    await transporter.sendMail({ from: config.from, to, subject, html, text });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Falha ao enviar via SMTP (verifique host/porta/credenciais):", message);
    return { ok: false };
  }
}

function magicLinkHtml(link: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
            <tr><td style="background:#0f172a;padding:24px 32px">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700">InnovareCode</p>
              <p style="margin:2px 0 0;color:#94a3b8;font-size:12px">Acompanhe</p>
            </td></tr>
            <tr><td style="padding:32px">
              <p style="margin:0 0 20px;font-size:15px;color:#333333">Clique no botão abaixo para entrar no seu painel de acompanhamento:</p>
              <p style="text-align:center;margin:0 0 20px">
                <a href="${link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:700">Entrar</a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#555555;line-height:1.6">Este link expira em <strong>15 minutos</strong> e só pode ser usado uma vez.</p>
              <p style="margin:0;font-size:13px;color:#888888;line-height:1.6">Se não foi você quem pediu este acesso, pode ignorar este e-mail com segurança.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;
}

function magicLinkText(link: string): string {
  return `InnovareCode Acompanhe\n\nEntre no seu painel de acompanhamento: ${link}\n\nEste link expira em 15 minutos e só pode ser usado uma vez. Se não foi você quem pediu este acesso, pode ignorar este e-mail.`;
}

/** E-mail do link mágico de login (ver lib/magic-link.ts). */
export async function sendMagicLinkEmail(to: string, link: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: "Seu link de acesso — Innovare Acompanhe",
    html: magicLinkHtml(link),
    text: magicLinkText(link),
  });
}

/**
 * Aviso interno de novo briefing recebido (efeito colateral do
 * POST /api/v1/intakes — seção 4.2 da arquitetura). Best-effort: se
 * `STAFF_NOTIFY_EMAIL` não estiver configurado, só loga e segue (não é
 * crítico para o lead, que já recebeu o protocolo na resposta HTTP).
 */
export async function sendNewIntakeNotification(input: {
  protocol: string;
  marca: string;
  contactName: string;
  contactEmail: string;
}): Promise<SendEmailResult> {
  const to = process.env.STAFF_NOTIFY_EMAIL || "";
  if (!to) {
    console.log("[email] STAFF_NOTIFY_EMAIL não configurado — pulando aviso de novo briefing.", {
      protocol: input.protocol,
    });
    return { ok: false };
  }
  const subject = `Novo briefing recebido — ${input.protocol}`;
  const text = `Novo briefing recebido pelo site.\n\nProtocolo: ${input.protocol}\nMarca: ${input.marca}\nContato: ${input.contactName} <${input.contactEmail}>\n\nAbra o admin do Acompanhe para triagem.`;
  const html = `<p>Novo briefing recebido pelo site.</p><ul><li><strong>Protocolo:</strong> ${input.protocol}</li><li><strong>Marca:</strong> ${input.marca}</li><li><strong>Contato:</strong> ${input.contactName} &lt;${input.contactEmail}&gt;</li></ul><p>Abra o admin do Acompanhe para triagem.</p>`;
  return sendEmail({ to, subject, html, text });
}
