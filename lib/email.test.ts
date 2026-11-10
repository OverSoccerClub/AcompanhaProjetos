// Unitário puro (sem SMTP real) dos templates de e-mail: só valida o HTML
// gerado, nunca a entrega — `sendEmail` já é testado via mock em outros
// specs que exercitam o fluxo (login/intake). Aqui o foco é o contrato
// visual/estrutural que a Lyra e o cliente final enxergam: logomarca
// hospedada, CTA presente/ausente conforme o tipo de e-mail, e nenhum dado
// sensível (token/link em claro teria que aparecer só onde é esperado).
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn().mockResolvedValue({});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

const LOGO_URL = "https://innovarecode.com.br/assets/logo-white.png";

describe("templates de e-mail — lib/email.ts", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.EMAIL_FROM = "Innovare Code <acompanhe@innovarecode.com.br>";
  });

  it("sendMagicLinkEmail: usa a logo hospedada, CTA com o link e aviso de expiração/uso único", async () => {
    const { sendMagicLinkEmail } = await import("./email");
    const link = "https://acompanhe.innovarecode.com.br/entrar?t=abc123";
    await sendMagicLinkEmail("cliente@exemplo.com.br", link);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe("cliente@exemplo.com.br");
    expect(call.subject).toMatch(/acesso/i);

    expect(call.html).toContain(LOGO_URL);
    expect(call.html).toContain('alt="Innovare Code"');
    expect(call.html).not.toContain("data:image"); // nunca base64 — Gmail não renderiza
    expect(call.html).toContain(link);
    expect(call.html).toContain("Acessar meu projeto");
    expect(call.html).toMatch(/15\s*minutos/);
    expect(call.html).toMatch(/uma vez/);
    expect(call.html).toMatch(/nunca pede sua senha/i);

    expect(call.text).toContain(link);
    expect(call.text).toMatch(/15 minutos/);
  });

  it("sendIntakeConfirmation: usa a logo, mostra o protocolo e NÃO contém link de acesso", async () => {
    const { sendIntakeConfirmation } = await import("./email");
    await sendIntakeConfirmation({ to: "lead@exemplo.com.br", protocol: "PRJ-0142", marca: "Loja Teste" });

    const call = sendMailMock.mock.calls[0][0];
    expect(call.html).toContain(LOGO_URL);
    expect(call.html).toContain("PRJ-0142");
    expect(call.html).toContain("Loja Teste");
    expect(call.html).not.toContain("Acessar meu projeto");
    expect(call.html).not.toMatch(/<a href="https?:\/\/[^"]*entrar/);
    expect(call.text).toContain("PRJ-0142");
  });

  it("sendNewIntakeNotification: usa a logo e lista protocolo/marca/contato", async () => {
    process.env.STAFF_NOTIFY_EMAIL = "staff@innovarecode.com.br";
    const { sendNewIntakeNotification } = await import("./email");
    await sendNewIntakeNotification({
      protocol: "PRJ-0142",
      marca: "Loja Teste",
      contactName: "Maria",
      contactEmail: "maria@exemplo.com.br",
    });

    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe("staff@innovarecode.com.br");
    expect(call.html).toContain(LOGO_URL);
    expect(call.html).toContain("PRJ-0142");
    expect(call.html).toContain("Loja Teste");
    expect(call.html).toContain("maria@exemplo.com.br");
  });
});
