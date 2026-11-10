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

// URL pública e já confirmada no ar da logomarca (fundo transparente, versão
// branca — pensada para ficar sobre o header navy). Nunca trocar por base64:
// Gmail não renderiza `data:` URI em e-mail. Ponto único de troca se a Lyra
// mover o asset.
const LOGO_URL = "https://innovarecode.com.br/assets/logo-white.png";

// Paleta de marca usada nos e-mails (mesmos tokens do design system do app,
// ver docs/design-system.md — `--shell`/`--brand`). Fixa em valores literais
// porque CSS custom properties não têm suporte confiável em cliente de
// e-mail; tudo aqui vai inline.
const EMAIL_COLORS = {
  shell: "#0D1B4B", // header navy sobre o qual a logo branca aparece
  brand: "#0030B8", // botão CTA primário (royal)
  brandPress: "#00237F", // hover/active do CTA (só referência, sem :hover em e-mail)
  pageBg: "#eef1f3",
  cardBg: "#ffffff",
  softBg: "#eef1fb", // caixa de destaque (protocolo, aviso de segurança)
  ink: "#0A1230",
  inkSoft: "#47516d",
  inkMuted: "#6b7280",
  line: "#e3e7f0",
} as const;

/**
 * Casca HTML comum aos e-mails transacionais: header navy com a logomarca
 * hospedada, card branco com o conteúdo passado em `bodyHtml`, footer com a
 * marca. Só tabelas + estilo inline (sem `<style>` em bloco, sem classes) —
 * é o que sobrevive ao Gmail/Outlook. `previewText` é o texto que aparece na
 * pré-visualização da caixa de entrada, antes de abrir o e-mail.
 */
function emailLayout(input: { previewText: string; bodyHtml: string }): string {
  const { previewText, bodyHtml } = input;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Innovare Code</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.pageBg};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">${previewText}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.pageBg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${EMAIL_COLORS.cardBg};border-radius:12px;overflow:hidden;">
<tr><td align="center" style="background-color:${EMAIL_COLORS.shell};padding:28px 32px;">
<img src="${LOGO_URL}" width="150" alt="Innovare Code" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;">
</td></tr>
<tr><td style="padding:40px 40px 32px 40px;">
${bodyHtml}
</td></tr>
<tr><td style="background-color:${EMAIL_COLORS.softBg};padding:20px 32px;border-top:1px solid ${EMAIL_COLORS.line};">
<p style="margin:0;font-size:12px;color:${EMAIL_COLORS.inkMuted};line-height:1.6;text-align:center;">
Innovare Code &middot; <a href="https://innovarecode.com.br" style="color:${EMAIL_COLORS.brand};text-decoration:none;">innovarecode.com.br</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Botão CTA grande, royal, centralizado — mesmo componente nos 3 e-mails. */
function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px auto;">
<tr><td align="center" style="border-radius:8px;background-color:${EMAIL_COLORS.brand};">
<a href="${href}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
</td></tr>
</table>`;
}

function magicLinkHtml(link: string): string {
  const body = `
<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.brand};">Portal do Cliente</p>
<p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${EMAIL_COLORS.ink};">Seu acesso ao acompanhamento do projeto</p>
<p style="margin:0 0 16px;font-size:15px;color:${EMAIL_COLORS.inkSoft};line-height:1.6;">Olá! A Innovare Code preparou um espaço exclusivo — o <strong>Portal do Cliente</strong> — para você acompanhar o andamento do seu projeto em tempo real: a fase atual, o que já foi entregue, os próximos passos e quando sua aprovação é necessária.</p>
<p style="margin:0 0 28px;font-size:15px;color:${EMAIL_COLORS.inkSoft};line-height:1.6;">Clique no botão abaixo para entrar:</p>
${emailButton(link, "Acessar meu projeto")}
<p style="margin:0 0 20px;font-size:12px;color:${EMAIL_COLORS.inkMuted};line-height:1.6;text-align:center;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}" style="color:${EMAIL_COLORS.brand};word-break:break-all;">${link}</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.softBg};border-radius:8px;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 6px;font-size:13px;color:${EMAIL_COLORS.ink};line-height:1.6;"><strong>Por segurança:</strong></p>
<p style="margin:0 0 4px;font-size:13px;color:${EMAIL_COLORS.inkSoft};line-height:1.6;">&bull; Este link expira em <strong>15 minutos</strong> e só pode ser usado uma vez.</p>
<p style="margin:0;font-size:13px;color:${EMAIL_COLORS.inkSoft};line-height:1.6;">&bull; A Innovare Code nunca pede sua senha por e-mail. Se você não solicitou este acesso, pode ignorar esta mensagem com segurança.</p>
</td></tr>
</table>`;
  return emailLayout({ previewText: "Seu link de acesso ao Portal do Cliente Innovare Code — expira em 15 minutos.", bodyHtml: body });
}

function magicLinkText(link: string): string {
  return [
    "Innovare Code — Portal do Cliente",
    "",
    "A Innovare Code preparou um espaço exclusivo (Portal do Cliente) para você acompanhar o andamento do seu projeto em tempo real: a fase atual, o que já foi entregue, os próximos passos e quando sua aprovação é necessária.",
    "",
    `Acesse seu projeto: ${link}`,
    "",
    "Por segurança: este link expira em 15 minutos e só pode ser usado uma vez. A Innovare Code nunca pede sua senha por e-mail. Se você não solicitou este acesso, pode ignorar esta mensagem.",
  ].join("\n");
}

/** E-mail do link mágico de login (ver lib/magic-link.ts). */
export async function sendMagicLinkEmail(to: string, link: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: "Seu acesso ao acompanhamento do projeto — Innovare Code",
    html: magicLinkHtml(link),
    text: magicLinkText(link),
  });
}

function intakeConfirmationHtml(protocol: string, marca: string): string {
  const body = `
<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.brand};">Briefing recebido</p>
<p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${EMAIL_COLORS.ink};">Recebemos o briefing da ${marca}!</p>
<p style="margin:0 0 24px;font-size:15px;color:${EMAIL_COLORS.inkSoft};line-height:1.6;">Nossa equipe vai analisar as informações enviadas e entra em contato em breve com os próximos passos.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.softBg};border-radius:8px;margin:0 0 24px;">
<tr><td style="padding:18px 22px;">
<p style="margin:0;font-size:11px;color:${EMAIL_COLORS.inkMuted};letter-spacing:0.06em;text-transform:uppercase;">Protocolo</p>
<p style="margin:4px 0 0;font-size:20px;color:${EMAIL_COLORS.ink};font-weight:700;">${protocol}</p>
</td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;color:${EMAIL_COLORS.inkMuted};line-height:1.6;">Guarde este protocolo para referência.</p>
<p style="margin:0;font-size:13px;color:${EMAIL_COLORS.inkMuted};line-height:1.6;">Este e-mail é só uma confirmação de recebimento — não contém nenhum link de acesso. Quando o projeto for iniciado, você recebe um e-mail separado com o acesso ao Portal do Cliente.</p>`;
  return emailLayout({ previewText: `Recebemos seu briefing — protocolo ${protocol}.`, bodyHtml: body });
}

function intakeConfirmationText(protocol: string, marca: string): string {
  return [
    "Innovare Code — Briefing recebido",
    "",
    `Olá! Recebemos o briefing da ${marca}.`,
    "",
    `Protocolo: ${protocol}`,
    "",
    "Nossa equipe vai analisar as informações enviadas e entra em contato em breve com os próximos passos. Guarde este protocolo para referência.",
    "",
    "Este e-mail é só uma confirmação de recebimento — não contém nenhum link de acesso. Quando o projeto for iniciado, você recebe um e-mail separado com o acesso ao Portal do Cliente.",
  ].join("\n");
}

/**
 * Confirmação ao CONTATO que preencheu o briefing (efeito colateral do
 * POST /api/v1/intakes — seção 4.2 da arquitetura), disparada só no caminho
 * "criado de verdade" (nunca em honeypot nem em reenvio idempotente — ver
 * route handler). NÃO contém link de acesso/login: o acesso ao portal só é
 * concedido quando a equipe converte e convida o cliente (fluxo separado).
 * Best-effort: nunca lança, não bloqueia a resposta HTTP ao lead.
 */
export async function sendIntakeConfirmation(input: {
  to: string;
  protocol: string;
  marca: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: input.to,
    subject: `Recebemos seu briefing — ${input.protocol}`,
    html: intakeConfirmationHtml(input.protocol, input.marca),
    text: intakeConfirmationText(input.protocol, input.marca),
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
  const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "");
  const adminLink = appUrl ? `${appUrl}/admin` : null;
  const text = [
    "Innovare Code — Novo briefing recebido pelo site",
    "",
    `Protocolo: ${input.protocol}`,
    `Marca: ${input.marca}`,
    `Contato: ${input.contactName} <${input.contactEmail}>`,
    "",
    adminLink ? `Abra o admin para triagem: ${adminLink}` : "Abra o admin do Acompanhe para triagem.",
  ].join("\n");
  const rows = [
    ["Protocolo", input.protocol],
    ["Marca", input.marca],
    ["Contato", `${input.contactName} &lt;${input.contactEmail}&gt;`],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;font-size:12px;color:${EMAIL_COLORS.inkMuted};letter-spacing:0.04em;text-transform:uppercase;width:120px;vertical-align:top;">${label}</td><td style="padding:8px 0;font-size:14px;color:${EMAIL_COLORS.ink};">${value}</td></tr>`
    )
    .join("");
  const body = `
<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.brand};">Aviso interno</p>
<p style="margin:0 0 20px;font-size:22px;font-weight:700;color:${EMAIL_COLORS.ink};">Novo briefing recebido pelo site</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.softBg};border-radius:8px;margin:0 0 24px;">
<tr><td style="padding:18px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr>
</table>
${adminLink ? emailButton(adminLink, "Abrir admin para triagem") : `<p style="margin:0;font-size:13px;color:${EMAIL_COLORS.inkMuted};line-height:1.6;">Abra o admin do Acompanhe para triagem.</p>`}`;
  const html = emailLayout({ previewText: `Novo briefing — ${input.marca} (protocolo ${input.protocol}).`, bodyHtml: body });
  return sendEmail({ to, subject, html, text });
}
