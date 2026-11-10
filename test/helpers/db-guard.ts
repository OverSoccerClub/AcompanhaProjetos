// Guarda compartilhada pelos testes `*.db.test.ts`, que rodam contra um
// Postgres REAL (mocks não provam SQL — ver squad-custo.db.test.ts do Painel
// de Missões). Única responsabilidade: abortar ANTES de abrir qualquer
// conexão se `DATABASE_URL` não apontar para localhost/127.0.0.1 — nunca
// deixar um teste automatizado (que cria/apaga linhas) correr contra um
// banco de produção por engano de ambiente.
export function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error(
      `DATABASE_URL não aponta para localhost/127.0.0.1 (valor atual oculto por segurança) — abortado para não arriscar tocar um banco real. Configure .env com o Postgres de teste antes de rodar "npm test".`
    );
  }
}

/** Prefixo usado em todo dado de fixture criado pelos testes, para que a
 * limpeza (`afterAll`) e as buscas não colidam com dados reais nem com
 * outros arquivos de teste rodando em paralelo. */
export const QA_PREFIX = "qa-iris-";

export function qaId(suffix: string): string {
  return `${QA_PREFIX}${suffix}-${Math.random().toString(36).slice(2, 8)}`;
}
