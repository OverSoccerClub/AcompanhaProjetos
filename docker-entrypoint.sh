#!/bin/sh
# Entrypoint de produção do Innovare Acompanhe.
#
# Roda, em ordem:
#   1) `prisma migrate deploy` (aplica só migrações já commitadas, nunca
#      gera novas — seguro para produção).
#   2) Sobe o servidor Next.js.
#
# Se a migração falhar, o container encerra com erro e NÃO inicia o
# server — o orquestrador de deploy (EasyPanel) deve manter a versão
# anterior no ar até o health check (/api/health) do novo container
# responder 200. Mesmo padrão do Painel de Missões
# (innovarecode-missoes/docker-entrypoint.sh), sem o passo de seed de
# memória técnica (este app não tem essa tabela).
#
# Para desligar a migração automática (ex.: múltiplas réplicas rodando o
# mesmo release, migração já aplicada por outro processo), defina
# RUN_MIGRATIONS=false nas envs do serviço.

set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Rodando 'prisma migrate deploy'..."
  node node_modules/prisma/build/index.js migrate deploy
  echo "[entrypoint] Migrações aplicadas com sucesso."
else
  echo "[entrypoint] RUN_MIGRATIONS=false — pulando migrate deploy."
fi

echo "[entrypoint] Iniciando servidor Next.js..."
exec "$@"
