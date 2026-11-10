import type { NextConfig } from "next";

// Origens extras autorizadas para Server Actions (ex.: domínio público atrás
// de proxy reverso/EasyPanel — mesma armadilha documentada no Painel de
// Missões: sem isso, Server Actions são rejeitadas em produção atrás de
// proxy). Vazio em dev local.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Build enxuto para Docker (ver Dockerfile) — mesma decisão do Painel.
  output: "standalone",
  devIndicators: false,
  experimental: {
    serverActions: {
      ...(allowedOrigins.length > 0 && { allowedOrigins }),
    },
  },
  async headers() {
    // CSP conservadora (defesa em profundidade, não é o controle principal
    // contra XSS — isso é saneamento de entrada/saída no código). Fontes
    // (`next/font/google`, ver app/layout.tsx) são self-hosted no build, sem
    // chamada externa em runtime — por isso nenhuma origem externa precisa
    // entrar aqui. `'unsafe-inline'` em script/style fica porque o App
    // Router do Next injeta script/estilo inline no boot (hidratação,
    // `__NEXT_DATA__`) sem usar nonce nesta configuração; se isso mudar para
    // nonce-based no futuro, reapertar removendo o `'unsafe-inline'`.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
