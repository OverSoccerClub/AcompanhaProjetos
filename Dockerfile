# syntax=docker/dockerfile:1

# Dockerfile multi-stage para o Innovare Acompanhe (Next.js 16 standalone +
# Prisma 7). Adaptado do Painel de Missões InnovareCode
# (innovarecode-missoes/Dockerfile) — mesmo raciocínio linha a linha, ver
# aquele repositório para o histórico completo de decisões.
#
# Notas importantes (leia antes de mexer):
# - Prisma 7 usa driver adapter (@prisma/adapter-pg) em runtime: o "query
#   engine" é WASM, embutido em node_modules/@prisma — não precisa de
#   binário nativo. Já `prisma migrate deploy` (CLI) usa um binário nativo
#   ("schema-engine") baixado no `npm install`, específico da plataforma —
#   por isso o `npm install` roda DENTRO deste Dockerfile (Linux), nunca
#   copiar node_modules do host (Windows/Mac).
# - Alpine usa musl libc: o schema-engine do Prisma precisa de OpenSSL —
#   instalado explicitamente (sem isso: "unable to open libssl.so").
# - DATABASE_URL real só existe em runtime (env do EasyPanel). No build
#   usamos um placeholder só para `prisma generate`/`next build` não
#   falharem; nenhuma conexão real é feita durante o build.

ARG NODE_VERSION=22

# ---------- Stage 1: deps (instala dependências + gera Prisma Client) ----------
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

ARG DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder"
ENV DATABASE_URL=${DATABASE_URL}

# npm ci falha aqui por causa de dependências opcionais nativas — usamos
# npm install (mesma decisão do Painel/Pontua.me).
RUN npm install --no-audit --no-fund

# ---------- Stage 2: builder (compila o Next.js) ----------
FROM node:${NODE_VERSION}-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ARG DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder"
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Opcional: chave estável para criptografar closures de Server Actions
# (embutida no build). Sem ela, redeploys podem gerar erro "Failed to find
# Server Action" para abas abertas durante o deploy. Gere uma vez com
# `openssl rand -base64 32` e passe como build arg no EasyPanel.
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=""
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}

# Cliente Prisma gerado dentro do container (stage `deps`, Linux) — nunca o
# gitignored `lib/generated/` que pode existir no disco do host fora do
# build. Build reprodutível: mesma saída não importa onde rode.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/generated ./lib/generated
COPY . .

RUN npm run build

# ---------- Stage 3: runner (imagem final, enxuta) ----------
FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Build enxuto do Next (server.js + apenas o node_modules traçado como usado).
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Reforço proposital (não confiar só no tracing automático do Next): Prisma
# Client gerado + node_modules COMPLETO do stage `deps` (o CLI de migração
# via `prisma.config.ts` puxa dependências transitivas que só existem
# instalando o pacote `prisma` inteiro, não módulo a módulo). Isso vem
# DEPOIS do `.next/standalone` para o node_modules completo prevalecer
# sobre o subconjunto que o standalone já traz. Imagem final maior;
# aceitável, confiabilidade do deploy > tamanho da imagem.
#
# `/app/lib` INTEIRO (não só lib/generated): `scripts/create-staff.ts` roda
# via `tsx` (não passa pelo build do Next, que só traça o que o SERVIDOR
# usa) e importa `lib/prisma.ts`/`lib/crypto.ts` como TypeScript fonte —
# sem isso, `npm run create-staff` falhava em produção com "Cannot find
# module /app/scripts/create-staff.ts" (scripts/ nem existia na imagem) e,
# mesmo corrigindo só scripts/, falharia de novo em "Cannot find module
# '../lib/prisma'". `tsx`/`dotenv` (devDependencies) já vêm no
# node_modules completo copiado abaixo — o stage `deps` instala com
# `npm install` sem `--production`.
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
