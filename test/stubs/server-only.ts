// Stub de `server-only` para o Vitest — ver o porquê em vitest.config.mts.
//
// O pacote real não existe para ser importado fora do bundler do Next (sua
// única função é FALHAR o build se um módulo de servidor for importado por
// código de cliente). Essa proteção continua valendo no `next build`; aqui
// ele só precisa resolver para que lib/intakes.ts, lib/magic-link.ts,
// lib/session.ts, lib/portal-data.ts etc. fiquem testáveis. Mesmo padrão do
// Painel de Missões (innovarecode-missoes/test/stubs/server-only.ts).
export {};
