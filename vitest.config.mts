import { defineConfig } from "vitest/config";
import path from "node:path";

// Mesmo padrão do Painel de Missões (innovarecode-missoes/vitest.config.mts):
// resolve o alias "@/*" (ver tsconfig.json) e substitui `server-only` por um
// stub vazio — fora do bundler do Next esse pacote lança incondicionalmente
// ao ser importado (sua única função é quebrar o build de código de
// cliente), o que tornaria lib/intakes.ts, lib/magic-link.ts, lib/session.ts
// e lib/portal-data.ts impossíveis de importar num teste.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "server-only": path.resolve(import.meta.dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**"],
    // Os testes `*.db.test.ts` batem num Postgres real (ver test/helpers/db-guard.ts)
    // — rodar os arquivos em sequência evita duas suítes disputando a mesma
    // janela de rate-limit em memória por IP ou criando corrida desnecessária
    // na mesma tabela. A suíte inteira roda em segundos, não há custo real.
    fileParallelism: false,
  },
});
