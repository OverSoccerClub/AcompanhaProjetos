# Runbook de deploy — Innovare Acompanhe (EasyPanel/Traefik)

> **Este deploy ainda NÃO foi publicado.** Este documento prepara tudo para
> você (o dono) revisar e disparar quando confirmar os itens da Seção 7
> ("O que precisa do dono"). Vulcano não publicou nada em produção.

Commit de referência: `ae3c51c` (Dockerfile + `docker-entrypoint.sh` já
rodam `prisma migrate deploy` no boot; `next build` já verde localmente).
Modelo de referência: `C:\Projetos\App\innovarecode-missoes` — o mesmo
raciocínio de Dockerfile/entrypoint/EasyPanel já validado em produção lá.

---

## 1. Serviço de banco — Postgres 16 DEDICADO

O Acompanhe guarda dados pessoais de clientes (LGPD) — **não** reaproveitar
o Postgres do Painel de Missões nem a credencial dele.

No EasyPanel:

1. Criar um novo serviço do tipo **Postgres** (imagem `postgres:16-alpine`
   ou a versão 16 oferecida pelo template do EasyPanel), nome sugerido
   `acompanhe-db`, no mesmo projeto/ambiente do app.
2. Volume persistente dedicado (ex. `acompanhe-pgdata`) — confirmar que o
   EasyPanel já cria isso por padrão ao criar o serviço de banco.
3. Gerar usuário e senha **novos e aleatórios** para este banco (o próprio
   EasyPanel costuma gerar; se pedir para você digitar, gere com
   `openssl rand -base64 24` e não reaproveite senha de nenhum outro serviço).
4. Banco **sem porta publicada externamente** — só acessível pela rede
   interna do EasyPanel entre os serviços do mesmo projeto.
5. Anote a **connection string interna** (nome do serviço interno, não o
   domínio público) — é o valor de `DATABASE_URL` da Seção 4.

---

## 2. Serviço do app — a partir do Dockerfile

1. Criar um novo serviço do tipo **App** (build por Dockerfile), apontando
   para o repositório `innovare-acompanhe`, branch `main`, commit
   `ae3c51c` (ou o mais recente de `main` no momento do deploy).
2. Build via `Dockerfile` na raiz do repo — nenhuma configuração de build
   command é necessária (o Dockerfile já faz `npm install` + `npm run build`
   multi-stage).
3. **Build Arguments** (só existem durante o build da imagem, nunca em
   runtime — ver Seção 4.3):
   - `DATABASE_URL`: **não precisa configurar** — o Dockerfile já tem um
     placeholder próprio só para `prisma generate`/`next build` não
     falharem. Não usar o valor real aqui.
   - `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: ver Seção 4.3 — gerar **uma vez**
     e reusar em todo deploy futuro.
4. Porta exposta do container: `3000` (já fixada no Dockerfile via `EXPOSE
   3000` e `ENV PORT=3000`).

---

## 3. Domínio e HTTPS

Subdomínio: `acompanhe.innovarecode.com.br`.

**⚠️ Confirmar com o dono antes de criar o registro DNS** (ver Seção 7) —
este runbook assume que é esse o nome definitivo (D11 da arquitetura já
recomendava este nome, mas o registro em si ainda não existe).

No EasyPanel, mesmo padrão já usado para `painel.innovarecode.com.br`:

1. Na configuração do serviço do app, aba de domínios, adicionar
   `acompanhe.innovarecode.com.br`.
2. Ativar HTTPS automático (Let's Encrypt via Traefik) — o EasyPanel emite
   o certificado sozinho assim que o DNS apontar para o VPS.
3. Fora do EasyPanel: criar o registro `A` (ou `CNAME`, se o padrão da casa
   usar CNAME para subdomínios) de `acompanhe` apontando para o IP do VPS —
   **isso é ação do dono no provedor de DNS**, não dá para fazer daqui.

---

## 4. Variáveis de ambiente — lista completa

Duas categorias no EasyPanel, não confundir:
- **Environment Variables** (runtime — lidas pelo container já rodando).
- **Build Arguments** (só durante o build da imagem).

### 4.1 Obrigatórias — sem elas o app não sobe ou ninguém loga

| Variável | O que é | De onde vem o valor | Sintoma se faltar |
|---|---|---|---|
| `DATABASE_URL` | Connection string do Postgres **dedicado** (Seção 1), formato `postgresql://usuario:senha@host-interno:5432/banco?schema=public`. Use a URL **interna** do serviço, nunca externa/pública. | Gerada ao criar o serviço `acompanhe-db` (Seção 1). | `docker-entrypoint.sh` roda `prisma migrate deploy` antes de tudo; sem conexão válida, o comando falha, o script encerra (`set -e`) e o servidor **nunca inicia**. Log mostra erro do Prisma logo após "Rodando 'prisma migrate deploy'...", sem nunca chegar em "Iniciando servidor Next.js...". Container em crash loop. |
| `APP_URL` | URL pública do app, usada para montar o link mágico de login enviado por e-mail. Sem barra final. | `https://acompanhe.innovarecode.com.br` (depende da Seção 3 estar confirmada). | Link mágico sai com domínio errado (ex. `localhost:3000`) — cliente clica e cai em endereço que não existe. |
| `SMTP_HOST` | Servidor SMTP para enviar o link mágico de login e notificações. **Reaproveitar o mesmo SMTP que o Painel de Missões já usa em produção** (mesmo provedor, mesmas credenciais — só trocar `EMAIL_FROM`, Seção 4.2). | Olhar o valor atual configurado no serviço `painel` no EasyPanel (aba Environment Variables) — não documentado em texto por não ser meu para expor aqui. | Sem SMTP, não existe "modo finge que enviou" — ninguém consegue logar (não há fallback). |
| `SMTP_PORT` | Porta do SMTP acima. | Mesmo valor já usado pelo Painel (tipicamente `587`). | Cai no padrão `587` do `.env.example` se omitido — mas confirme que bate com o provedor real. |
| `SMTP_USER` | Usuário/conta do SMTP acima. | Mesmo valor já usado pelo Painel. | Envio falha silenciosamente se o provedor exigir autenticação (quase todos exigem) — mesmo sintoma de `SMTP_HOST` ausente. |
| `SMTP_PASS` | Senha/token do SMTP acima. | Mesmo valor já usado pelo Painel — copiar do cofre/variáveis do EasyPanel do serviço `painel`, nunca do código. | Idem acima. |
| `EMAIL_FROM` | Remetente exibido no e-mail de login/notificação. **Não** é o mesmo do Painel — este é o remetente do Acompanhe. | Valor sugerido pela arquitetura: `InnovareCode Acompanhe <acompanhe@innovarecode.com.br>` (já é o default do `.env.example`, pode deixar implícito ou declarar explicitamente). | Usa o default do `.env.example` se omitido — mas o ideal é declarar, porque o remetente padrão do código pode mudar. |

### 4.2 Obrigatória para a API pública de intake funcionar

| Variável | O que é | De onde vem o valor | Sintoma se faltar |
|---|---|---|---|
| `INTAKE_ALLOWED_ORIGINS` | Origens autorizadas (CORS) a chamar `POST /api/v1/intakes` — só o(s) domínio(s) do site institucional público, separados por vírgula. | `https://www.innovarecode.com.br,https://innovarecode.com.br` (confirmar com quem mantém o site se há mais algum domínio/alias servindo o formulário). | Toda chamada do formulário do site público responde `403 ORIGIN_NOT_ALLOWED` — o briefing nunca chega, mas o fallback de WhatsApp do site cobre o lead (não é um apagão total, mas é silencioso). |
| `ALLOWED_ORIGINS` | Origens extras para **Server Actions** do próprio Acompanhe (admin/portal) atrás do proxy reverso (Traefik/EasyPanel) — armadilha já documentada no Painel. | `acompanhe.innovarecode.com.br` (sem protocolo, mesmo padrão usado no Painel — confirmar o formato exato olhando o valor configurado lá, pode exigir ou não o `https://`). | Formulários internos (converter intake, mudar status, login) podem falhar com erro de origem/CSRF do Next — sintoma aparece só ao usar o app pelo domínio público, não em `localhost`. |

### 4.3 Build Argument (não runtime)

| Variável | O que é | De onde vem o valor | Sintoma se faltar |
|---|---|---|---|
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Chave estável para criptografar closures de Server Actions, embutida no build. | Gerar **uma única vez** com `openssl rand -base64 32` e **reusar o mesmo valor em todo deploy futuro** (não regenerar a cada deploy — diferente de uma senha de banco). Guardar no cofre de variáveis do EasyPanel como Build Argument do serviço do app. | Sem ela, o Next gera uma chave aleatória a cada build — quem estiver com uma aba aberta durante a troca de versão pode ver "Failed to find Server Action" ao submeter algo (basta recarregar a página, sem perda de dado). Baixo risco, mas fácil eliminar configurando uma vez. |

### 4.4 Opcionais / recomendadas

| Variável | O que é | Efeito se faltar |
|---|---|---|
| `STAFF_NOTIFY_EMAIL` | E-mail interno que recebe o aviso de "novo briefing recebido" a cada `POST /api/v1/intakes` bem-sucedido. | Se vazio, só loga internamente — a equipe não é avisada por e-mail de novos briefings (mas o briefing é gravado normalmente). Recomendo configurar com o e-mail que a equipe já monitora. |
| `TRUST_PROXY_HOPS` | Número de proxies reversos **confiáveis** na frente do app, usado para extrair o IP real do cliente de dentro de `X-Forwarded-For` sem confiar em valor forjável pelo próprio requisitante (rate limit por IP depende disso). | Default `"1"` já assume a topologia padrão (cliente → Traefik/EasyPanel → container). **Ver Seção 7 — item que precisa confirmação da topologia real antes do deploy.** Se o número estiver errado, o rate-limit por IP pode ficar contornável (número baixo demais) ou passar a rejeitar IPs legítimos (número alto demais). |
| `RUN_MIGRATIONS` | Desliga o `prisma migrate deploy` automático no boot. | Padrão `true`. **Não mudar para `false` neste primeiro deploy** — é a primeira vez que o schema precisa ser criado no banco novo. |

**Nunca escrever o valor real de nenhuma destas variáveis em arquivo
versionado.** Todas vão direto no painel do EasyPanel (Environment
Variables ou Build Arguments, conforme a tabela). O `.env.example` do repo
já documenta cada uma com o mesmo texto explicativo, sem valores reais.

---

## 5. Health check

Configurar, na aba de deploy/health do serviço do app no EasyPanel:

```
GET /api/health
```

Esse endpoint faz `SELECT 1` no banco e responde:
- `200 {"status":"ok"}` → banco acessível, app saudável.
- `503 {"status":"error","reason":"database"}` → banco não responde.

Se o EasyPanel oferecer alguma opção de "aguardar ficar saudável antes de
trocar o tráfego" / rollout gradual, **ativar antes deste primeiro deploy**
— é o que garante que, se o container novo cair em crash loop (ex.:
`DATABASE_URL` errada), o container anterior continue no ar em vez de o
EasyPanel simplesmente derrubar o antigo e deixar o ar sem serviço.

Rollback manual (se o EasyPanel não fizer sozinho): redeploy do commit
anterior pelo histórico de deploys do serviço. A migração deste primeiro
deploy cria o schema do zero (não há "schema antigo" para ficar incompatível
com código revertido) — não há passo de reversão de banco a fazer.

---

## 6. Passo a passo de execução (ordem)

1. Confirmar os 3 itens da Seção 7 (acesso ao EasyPanel, DNS, topologia do XFF).
2. Criar o serviço `acompanhe-db` (Seção 1).
3. Criar o serviço do app a partir do Dockerfile (Seção 2), com o domínio
   (Seção 3) e todas as env vars + build args (Seção 4) configurados.
4. Configurar o health check (Seção 5).
5. Disparar o deploy e acompanhar os logs — ordem esperada:
   ```
   [entrypoint] Rodando 'prisma migrate deploy'...
   [entrypoint] Migrações aplicadas com sucesso.
   [entrypoint] Iniciando servidor Next.js...
   ```
   - Parou na primeira linha com erro do Prisma → `DATABASE_URL` errada ou
     banco inacessível.
   - "Migrações aplicadas" e depois crash sem a terceira linha → raro neste
     app (não há segredo de assinatura que faça `throw` no boot, diferente
     do Painel) — se acontecer, checar log completo do erro.
6. Confirmar de fora:
   ```bash
   curl -i https://acompanhe.innovarecode.com.br/api/health
   ```
   Esperado: `200 {"status":"ok"}`.
7. **Criar o primeiro STAFF** — via console/terminal do EasyPanel no
   container do app (ou `docker exec` no VPS, se tiver acesso direto):
   ```bash
   npm run create-staff -- --email="voce@innovarecode.com.br" --name="Seu Nome"
   ```
   Isso faz um `upsert` do usuário com `role: STAFF` — rode de novo com o
   mesmo e-mail se precisar reativar alguém. Depois disso, essa pessoa entra
   por `https://acompanhe.innovarecode.com.br/entrar` com o e-mail cadastrado
   (login é só por link mágico — não existe senha).
8. Rodar o checklist da Seção 8 antes de considerar o deploy fechado.

---

## 7. O QUE PRECISA DO DONO (bloqueios reais — não dá para seguir sem isto)

- [ ] **Acesso ao EasyPanel** para criar os dois serviços (Postgres e app),
  configurar domínio/env vars e disparar o deploy — eu (Vulcano) preparei
  tudo neste runbook, mas não tenho credencial para executar sozinho no
  painel do VPS.
- [ ] **DNS do subdomínio**: confirmar que `acompanhe.innovarecode.com.br` é
  o nome definitivo (D11 da arquitetura já recomendava este, mas o registro
  ainda não existe) e criar o registro `A`/`CNAME` apontando para o VPS no
  provedor de DNS do domínio `innovarecode.com.br`.
- [ ] **Topologia real do proxy (`X-Forwarded-For`) — achado ALTO do Órion.**
  Eu tentei confirmar isto lendo o código e a documentação de deploy do
  Painel de Missões (mesmo VPS, mesmo EasyPanel) e **não encontrei
  configuração explícita de Traefik versionada em nenhum dos dois
  repositórios** — o `lib/request-ip.ts` do Painel lê o primeiro valor de
  `X-Forwarded-For` como "melhor esforço", sem nunca documentar se o Traefik
  **substitui** esse header (descarta o que o cliente mandou e escreve só o
  que ele próprio viu) ou **acrescenta** (concatena na lista existente — nesse
  caso um cliente malicioso poderia forjar o início da lista). Isso só se
  confirma inspecionando a configuração real do Traefik no VPS (arquivo de
  config ou painel do EasyPanel) ou testando na prática: enviar uma
  requisição com `X-Forwarded-For: 1.2.3.4` manualmente para
  `painel.innovarecode.com.br` (serviço já em produção) e comparar o que o
  app efetivamente recebe/loga contra o IP real de quem fez a chamada.
  **Enquanto não confirmado, `TRUST_PROXY_HOPS="1"` (o default) é a aposta
  mais razoável** — é a topologia padrão de um único proxy na frente
  (cliente → Traefik/EasyPanel → container) e é o mesmo valor implícito que
  o Painel já usa em produção sem incidente reportado. Mas fica registrado
  como suposição, não fato confirmado, e deve ser revisto se algum dia
  houver um load balancer adicional antes do Traefik.

---

## 8. Checklist pós-deploy

- [ ] `prisma migrate deploy` aplicou sem erro (ver log do Passo 5 da Seção 6).
- [ ] `GET /api/health` responde `200 {"status":"ok"}` de fora (Passo 6).
- [ ] Primeiro STAFF criado (Passo 7) e consegue pedir o link mágico em
  `/entrar`.
- [ ] **O e-mail de login mágico chega fora da caixa de spam.** Testar com
  pelo menos duas contas (ex. Gmail e Outlook/outro provedor). Se cair no
  spam: conferir SPF, DKIM e DMARC do domínio remetente (`acompanhe@
  innovarecode.com.br` ou o remetente real configurado em `EMAIL_FROM`) —
  a arquitetura (seção 5.5) já marca isto como pré-requisito, não é opcional.
- [ ] Testar o formulário de briefing do site institucional
  (`solicitar-site.html`) de verdade contra
  `https://acompanhe.innovarecode.com.br/api/v1/intakes` — confirma que
  `INTAKE_ALLOWED_ORIGINS` está certo e que o protocolo (`BRF-...`) volta
  na resposta.
- [ ] Testar login do STAFF e uma ação no `/admin` (ex. converter um intake
  de teste) — confirma que `ALLOWED_ORIGINS`/Server Actions não estão sendo
  rejeitadas atrás do Traefik.
- [ ] **CSP não quebrou o visual**: abrir `/entrar`, `/admin` e `/portal` no
  navegador com o DevTools aberto (aba Console/Network) e confirmar que não
  há erro de Content-Security-Policy bloqueando script/estilo/imagem — checar
  visualmente que CSS e qualquer imagem carregam normalmente no domínio de
  produção (o comportamento pode diferir de `localhost` por causa de
  cabeçalhos que só o proxy de produção aplica).
- [ ] Confirmar que o STAFF novo e-mail de boas-vindas (quando aplicável) e o
  e-mail interno de `STAFF_NOTIFY_EMAIL` (se configurado) também chegam.
