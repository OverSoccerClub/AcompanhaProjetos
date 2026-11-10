# Innovare Acompanhe: design system v1

Referência visual: `docs/mockup.html` (abrir no navegador, tem seletor Sistema / Claro / Escuro).
Este documento é a especificação; o mockup é o alvo. Quando os dois divergirem, vale o mockup, e este arquivo deve ser corrigido.

## 1. Conceito

**Sala de controle de entrega.** O cliente abre o portal para responder três perguntas: em que fase está meu software, o que foi entregue, quando precisam de mim. O visual responde isso como um painel de missão: preciso, calmo, com dados em fonte monoespaçada e a marca sempre presente.

Três assinaturas que tornam o app reconhecível (não remover):

1. **Shell navy fixo com a logomarca branca.** Topbar (portal) e sidebar (admin) são sempre navy, nos dois temas. É a âncora da marca. O conteúdo vive em superfícies claras (ou navy profundo no modo escuro).
2. **O chevron da logomarca vira a linha do tempo.** As 4 fases são segmentos em forma de seta encaixados (`< >` do símbolo), recortados com `clip-path`. Só a fase atual recebe o gradiente royal com um brilho de varredura lento.
3. **Dados em mono.** Códigos (`PRJ-0142`), datas (`10 NOV · 14:32`), contadores (`9/16`) e rótulos de seção (eyebrows) usam JetBrains Mono. É o que dá o ar "altamente tecnológico" sem enfeite.

Tudo o mais é quieto: sem gradiente arco-íris, sem glassmorphism no conteúdo, sem sombra em todo bloco.

## 2. Tokens de cor

Os nomes abaixo são os tokens finais. Substituem os de `app/globals.css` (tabela de migração na seção 10).

### Marca e shell (iguais nos dois temas, salvo indicação)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--brand` | `#0030B8` | `#1A47D6` | Preenchimento de botão primário, nó concluído, barra de progresso |
| `--brand-hover` | `#1A47D6` | `#2F5BEA` | Hover do primário |
| `--brand-press` | `#00237F` | `#0030B8` | Active do primário, início do gradiente da fase atual |
| `--brand-ink` | `#0030B8` | `#8BA6FF` | Links e texto em royal sobre superfície (no escuro o royal puro não tem contraste) |
| `--brand-soft` | `#E7ECFC` | `#13245E` | Fundo de fase concluída, item de etapa em andamento, ícone de marco |
| `--on-brand` | `#FFFFFF` | `#FFFFFF` | Texto sobre `--brand` |
| `--focus` | `#1A47D6` | `#7D9BFF` | Anel de foco |
| `--shell` | `#04081C` | `#03061A` | Topbar e sidebar (início do gradiente) |
| `--shell-2` | `#0A1230` | `#070D29` | Topbar e sidebar (fim do gradiente) |
| `--shell-line` | `rgba(176,184,201,.14)` | igual | Divisórias dentro do shell |
| `--shell-ink` / `--shell-ink-2` | `#FFFFFF` / `#A9B3CC` | igual | Texto no shell |
| `--shell-active` | `rgba(26,71,214,.28)` | `rgba(47,91,234,.30)` | Item de navegação ativo |
| `--silver` | `#C0C0C0` | igual | Prata da marca; só em detalhes (swatch, gradiente do título do login) |

### Superfícies e texto (neutros com viés azul, nunca cinza puro)

| Token | Claro | Escuro |
|---|---|---|
| `--bg` | `#F2F4FA` | `#050A1E` |
| `--surface` | `#FFFFFF` | `#0A1331` |
| `--surface-2` | `#F7F8FC` | `#0D1838` |
| `--surface-sunken` | `#ECEFF7` | `#070E27` |
| `--line` | `#E0E5F1` | `#1A2550` |
| `--line-strong` | `#C8D1E6` | `#2A3872` |
| `--ink` | `#0A1230` | `#EDF0F8` |
| `--ink-2` | `#47516D` | `#A6B0CB` |
| `--ink-3` | `#6F7994` | `#7C87A6` |

### Status (semântica, separada da marca)

Cada tom tem três tokens: texto/ponto, fundo, borda. Royal **é** o tom `info`, e isso é intencional: "em andamento" é o estado normal e saudável do produto.

| Tom | Claro (fg / bg / line) | Escuro (fg / bg / line) | Estados que usam |
|---|---|---|---|
| `success` | `#0B7A46` / `#E3F5EB` / `#B7E3C9` | `#4CCF8C` / `#0D2B23` / `#1C5240` | Concluído(a), Publicado, Em suporte, Convertido |
| `warning` | `#935C00` / `#FCF1DB` / `#F0D39A` | `#F2B94A` / `#2D230C` / `#5A4415` | Aguardando cliente, Em revisão, Proposta enviada, Em triagem, ponto de aprovação |
| `danger` | `#B4241B` / `#FCE9E7` / `#F1BDB7` | `#FF8478` / `#351417` / `#642A2A` | Cancelado, erros |
| `neutral` | `#4A5470` / `#ECEFF6` / `#D3D9E8` | `#A6B0CB` / `#151F45` / `#27346A` | Pendente, Pulada, Pausado, Descartado |
| `info` | `#0030B8` / `#E7ECFC` / `#BCCBF5` | `#8BA6FF` / `#13245E` / `#2A43A0` | Novo, Em andamento, Em análise, Aprovado |

Nomes: no app, os tokens seguem os tons do `status-maps.ts` (`--success`, `--success-bg`, `--success-line`, e igual para `warning`, `danger`, `neutral`, `info`). O mockup usa apelidos curtos (`--ok`, `--warn`, `--bad`, `--idle`, `--info`) com os mesmos valores.

Regra: status nunca é só cor. O badge sempre tem ponto + rótulo em texto; a etapa sempre tem nó com forma diferente (check, anel, número).

O mapa tom → status já existe em `app/_components/status-maps.ts` e **não muda**. Só os valores de cor mudam.

### Modo escuro

Não é inversão. É navy profundo (`#050A1E`) com superfícies um degrau acima, bordas em vez de sombras para separar, royal clareado para texto (`--brand-ink`) e status mais luminosos. Estrutura obrigatória (já usada no mockup):

```css
:root { /* todos os tokens, valores claros */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* só redefine tokens */ color-scheme: dark; } }
:root[data-theme="dark"] { /* mesmos valores escuros */ color-scheme: dark; }
```

Nenhum componente usa cor literal fora do shell. Se um componente precisar de cor nova, ela vira token nos três blocos.

## 3. Tipografia

| Papel | Família | Pesos | Observação |
|---|---|---|---|
| Display | Outfit | 500, 600, 700 | Já carregada via `next/font` (`--font-outfit`). Títulos, números grandes, nome de fase |
| Corpo | Inter | 400, 500, 600 | Já carregada (`--font-inter`). Texto, formulários, tabelas |
| Dados | JetBrains Mono | 400, 500 | **Nova.** Adicionar em `app/layout.tsx` com `next/font/google`, `variable: "--font-mono"`. Ativar `font-feature-settings: "zero" 1` (zero cortado) |

Escala (px, base 15):

| Token sugerido | Tamanho / altura | Família, peso | Uso |
|---|---|---|---|
| `display-xl` | 34 / 1 | Outfit 600, tracking -0.02em | Número de progresso (`56%`) |
| `h1` | 28 / 1.2 | Outfit 600, tracking -0.01em | Título de página (26 no admin) |
| `h2` | 18 / 1.25 | Outfit 600 | Título de seção |
| `h3` | 16 / 1.3 | Outfit 600 | Título de card |
| `stat` | 17 / 1.3 | Outfit 600 | Valor de resumo (fase atual, próximo marco) |
| `body` | 15 / 1.55 | Inter 400 | Padrão |
| `body-sm` | 14 / 1.5 | Inter 400 | Tabelas, feed de atualizações |
| `caption` | 12.5–13 / 1.4 | Inter 400, `--ink-3` | Hints, metadados |
| `eyebrow` | 11 / 1 | Mono 500, UPPERCASE, tracking 0.12em, `--ink-3` | Rótulos de seção e de KPI |
| `data` | 11.5–12.5 | Mono 400 | Datas, códigos, contadores |

`text-wrap: balance` em títulos. `font-variant-numeric: tabular-nums` em todo número que aparece em coluna.

## 4. Espaçamento, raio, elevação

**Espaçamento** (grade de 4): 4, 8, 12, 16, 20, 24, 28, 32, 40, 48. Padding de card 20. Gap entre blocos da página 20. Gutter da página 24 (16 abaixo de 720px). Container máximo 1120.

**Raios**: `--r-xs 4` (chip), `--r-sm 6` (botão pequeno, item de nav), `--r-md 10` (botão, input, callout interno), `--r-lg 14` (card, frame), `--r-xl 20` (reservado), `--r-pill` (badge, filtro, seletor).

**Elevação** (por papel, não em tudo):

| Nível | Claro | Uso |
|---|---|---|
| `--shadow-1` | `0 1px 2px rgba(10,18,48,.06)` | Botão secundário, ícone de estado vazio |
| `--shadow-2` | `0 1px 2px rgba(10,18,48,.05), 0 8px 24px -8px rgba(10,18,48,.12)` | Cards |
| `--shadow-3` | `0 24px 60px -16px rgba(4,8,28,.35)` | Modais e o card de login |
| `--glow` | `0 0 0 1px rgba(26,71,214,.25), 0 8px 28px -6px rgba(0,48,184,.45)` | Hover do botão primário, selo da marca no login |

No escuro as sombras ficam mais densas e os cards se separam principalmente pela borda `--line`.

## 5. Estados de interação

| Estado | Regra |
|---|---|
| Hover (primário) | `--brand-hover` + `--glow` |
| Hover (secundário) | borda e texto vão para `--brand-ink` |
| Hover (linha de tabela) | fundo `--surface-2`; a seta `→` da última coluna aparece (opacidade 0 → 1, desloca 4px) |
| Active | `--brand-press` e `translateY(1px)` |
| Focus | `outline: 2px solid var(--focus); outline-offset: 2px`. Input: borda `--brand-ink` + halo `0 0 0 4px` de `--focus` a 22% (`color-mix`) |
| Disabled | opacidade .45, sem sombra, `cursor: not-allowed`. Input desabilitado: fundo `--surface-sunken` |
| Erro (input) | `aria-invalid="true"` → borda `--danger` + halo a 14%; mensagem abaixo em `--danger` dizendo como corrigir |
| Carregando | botão mantém largura, troca ícone por spinner (componente `SubmitButton` atual) |

Transições: 150ms ease. `prefers-reduced-motion` desliga o brilho da fase atual e o pulso do badge.

## 6. Componentes

### 6.1 Shell

**Portal (topbar)**: gradiente `100deg, --shell → --shell-2 → #0D1B4B`, borda inferior `--shell-line` e um fio de luz royal de 1px centralizado (pseudo-elemento, gradiente transparente → `#8BA6FF` → transparente). Conteúdo: lockup (logo branca 26px de altura · divisória vertical · "Acompanhe" em Outfit 15 + "PORTAL DO CLIENTE" em eyebrow) | nav | avatar com iniciais + nome/empresa + botão "Sair" com borda fina.

**Admin (sidebar 248px)**: gradiente vertical `--shell → --shell-2`, brilho radial royal no canto inferior esquerdo. Logo branca 22px, abaixo o rótulo "PAINEL INTERNO" com ponto verde. Grupo de nav com eyebrow "OPERAÇÃO"; item 14px com ícone 17px; ativo = `--shell-active` + anel interno de 1px. Contador de novos briefings como pílula royal mono. Usuário fixo no rodapé.

Abaixo de 1000px a sidebar vira barra horizontal no topo (logo + itens em linha). Abaixo de 720px a topbar do portal esconde a nav textual e o nome; fica logo + avatar + Sair.

Logomarca: `logo-white.png` em todo fundo navy (shell, painel do login); `logo.png` só em fundo claro fora do shell. Nunca aplicar a logo colorida sobre o shell. Usar `next/image` com `priority` no shell.

### 6.2 Login (`/entrar`)

Duas colunas (1.05fr / 1fr). Esquerda: painel da marca com gradiente navy, dois brilhos radiais royal, textura de grade de 32px mascarada (blueprint), logo branca, headline "Seu projeto, *etapa por etapa.*" (a segunda parte em gradiente prata → `#8BA6FF`), subtítulo e 3 linhas de "telemetria" ilustrativas (decorativas, `aria-hidden`). Direita: cartão de 400px com selo do símbolo (`logo-mark-white` sobre gradiente navy→royal com `--glow`), título, campo de e-mail com ícone, botão primário grande de largura total, nota de segurança tracejada (15 min, uso único) e o estado de sucesso em verde.

Estado com `?t=token`: mesmo layout, cartão mostra "Confirmar entrada" + botão primário. Link expirado: callout `danger` do mockup.

Abaixo de 1000px: painel da marca vira faixa no topo (sem a telemetria), cartão embaixo.

### 6.3 Cards

`--surface`, borda `--line`, raio 14, `--shadow-2`. Cabeçalho opcional com 16/20 de padding e divisória inferior; título h3 à esquerda, ação ou eyebrow à direita. Não aninhar card dentro de card; agrupamentos internos usam `--surface-2` com borda (ex.: fases recolhidas).

### 6.4 Botões

Altura 40 (sm 32, lg 48), raio 10, Inter 600 14. Variantes: `primary` (royal com brilho interno de 1px no topo), `secondary` (superfície + borda forte), `ghost`, `danger` (contorno vermelho, preenche no hover). Ícone 16px à direita para ação que avança (`→`), à esquerda para ação de objeto. Uma ação primária por área.

### 6.5 Inputs

Altura 44, raio 10, borda `--line-strong`, label 13/600 acima, hint 12.5 `--ink-3` abaixo. Ícone opcional à esquerda (padding 38). Códigos e valores técnicos em mono. Busca da tabela: altura 34.

### 6.6 Badges e chips

**Badge de status**: pílula 24px, ponto de 6px em `currentColor`, texto 12/600, fundo/borda/texto do tom. `data-live` (só para "Em andamento" ativo) faz o ponto pulsar. Implementação: o `StatusBadge` atual já emite `className="badge" data-tone={tone}`; basta trocar o CSS.

**Chip** (tipo de atualização, código do projeto): 22px, raio 4, mono 11 UPPERCASE, `--surface-sunken` + borda. Chip não carrega status.

### 6.7 Resumo do projeto (topo do detalhe)

Um card dividido em 4 colunas por divisórias verticais (1.3fr + 3×1fr): Progresso geral (número grande + barra + `9/16 etapas`), Fase atual, Próximo marco, Início/entrega prevista. Cada coluna: eyebrow, valor `stat`, legenda. Progresso = etapas `CONCLUIDA` + `PULADA` sobre o total (mesma regra que o `PhaseTimeline` já usa por fase). Abaixo de 1000px: 2×2; abaixo de 720px: 1 coluna.

A barra de progresso é um medidor simples: trilho `--surface-sunken` 8px, preenchimento gradiente `--brand → --brand-hover`, ponta arredondada, `role="img"` com `aria-label` em texto.

### 6.8 Callout de ação do cliente

Aparece no portal quando existe etapa com `isApprovalPoint` em andamento ou próxima. Fundo `--warning-bg`, borda `--warning-line`, ícone de bandeira num quadrado de superfície, título em 600 e descrição em `--ink-2`, botão secundário pequeno. Mesmo componente serve para erro (tons `danger`) e confirmação (tons `success`).

### 6.9 Linha do tempo: trilho das fases

`<ol>` de 4 itens em grade de 4 colunas, gap 6. Cada fase é um chevron (`clip-path` com entalhe de 16px; a primeira sem entalhe à esquerda, a última sem ponta à direita). Conteúdo: eyebrow `FASE n · CONCLUÍDA/AGORA`, nome em Outfit 15/600, contagem mono `x/y etapas`, barra fina de 3px.

| Estado da fase | Visual |
|---|---|
| `done` (todas concluídas/puladas) | `--brand-soft`, texto `--brand-ink` |
| `current` (a primeira não concluída) | gradiente `110deg, --brand-press → --brand → --brand-hover`, texto branco, brilho de varredura de 3.5s; `aria-current="step"` |
| `next` | `--surface-sunken`, texto `--ink-2` |

Abaixo de 720px: o trilho empilha em 1 coluna e perde o recorte (vira lista de blocos com raio 6).

### 6.10 Linha do tempo: etapas

Mostra a fase atual expandida. As fases já concluídas e as futuras viram uma linha recolhida (`--surface-2`, "Descoberta e Planejamento & Design concluídas · 7/7"). No admin, todas expandidas (precisa dos controles).

Cada etapa: grade `28px | conteúdo | badge`. Trilho vertical de 2px atrás dos nós; o trecho fica royal até a última concluída. Nó por status:

| Status | Nó |
|---|---|
| `CONCLUIDA` | círculo royal cheio com check branco |
| `EM_ANDAMENTO` | anel `--brand-ink` com ponto interno e halo de 5px; a linha inteira ganha fundo `--brand-soft` desvanecendo para a direita |
| `PENDENTE` | círculo vazio com borda `--line-strong` e o número da etapa em mono |
| `PULADA` | como pendente, com o nome riscado e o badge neutral "Pulada" |

Ponto de aprovação: marcador losango âmbar + "SUA APROVAÇÃO" (portal) ou "APROVAÇÃO DO CLIENTE" (admin) em mono 11 ao lado do nome. Datas em mono abaixo do nome. No admin, os controles (`renderControls`) ficam à direita do badge, alinhados ao topo.

### 6.11 Feed de atualizações

Lista com divisórias. Grade `32px | conteúdo`. Ícone por tipo num quadrado de raio 9: Etapa (`< >`), Marco (bandeira, em royal), Arquivo (folha), Comentário (balão), Status (ponto). Linha de cabeçalho: chip do tipo à esquerda, data mono à direita. Texto 14 `--ink-2` com o objeto em negrito `--ink`. Arquivo: pílula mono com nome e tamanho. No admin, adicionar badge de visibilidade (`Interna (equipe)` neutral / `Visível ao cliente` info) no cabeçalho.

### 6.12 Tabelas e listas (admin)

Card com barra de ferramentas (filtros em pílula à esquerda, busca à direita), tabela, rodapé de paginação mono. Cabeçalho da tabela: eyebrow em `--surface-2`. Linha 14px, padding 14/16, hover `--surface-2`, linha inteira clicável com seta que aparece no hover. Briefing não lido (`NOVO`): faixa royal de 3px à esquerda (`box-shadow inset`). Primeira coluna: avatar de iniciais + empresa (600) + contato (`--ink-3`). Valores e datas em mono. Filtro ativo: pílula preenchida `--ink` com texto `--bg`; contagem em mono dentro da pílula.

A tabela fica em `overflow-x: auto` com `min-width: 720px`. Alternativa recomendada abaixo de 720px: renderizar cada linha como item de lista (as classes `.list` / `.list-item` atuais) com empresa + badge na primeira linha e tipo · data na segunda.

KPIs do admin: 4 cards pequenos (eyebrow, número Outfit 28, legenda com variação em verde ou âmbar). Só no topo das listas do admin; o portal não usa tiles de número.

### 6.13 Estado vazio

Caixa tracejada `--line-strong` sobre `--surface-2`, ícone de 22px num quadrado de 52 com sombra leve, título 16/600, texto até 34ch dizendo o que vai aparecer ali e quando, e uma ação secundária. Exemplos de texto:

- Portal sem projetos: "Nenhum projeto por aqui ainda" / "Quando a equipe iniciar seu projeto, ele aparece nesta lista com o andamento de cada fase."
- Admin sem briefings no filtro: "Nenhum briefing com este status" / "Novos briefings enviados pelo site aparecem aqui."
- Projeto sem atualizações: "Ainda sem atualizações" / "A equipe publica aqui cada etapa concluída."

## 7. Ícones

Traço 1.8, cantos arredondados, `currentColor`, 16–18px. Se a Lyra quiser biblioteca, Lucide (`lucide-react`) tem o mesmo desenho; os ícones do mockup são equivalentes a `Mail`, `ArrowRight`, `Check`, `Lock`, `LogOut`, `Flag`, `File`, `MessageCircle`, `Code` (para "Etapa"), `Inbox`, `LayoutGrid`, `Folder`, `Users`, `Search`, `TriangleAlert`.

## 8. Movimento

Só três movimentos: brilho de varredura na fase atual (3.5s), pulso do ponto `data-live` (2s), hover de botões/linhas (150ms). Nada de entrada animada de página. Tudo desligado em `prefers-reduced-motion`.

## 9. Acessibilidade

- Contraste: textos sobre superfície passam AA nos dois temas; o royal puro `#0030B8` não é usado como texto no escuro (usa `--brand-ink`).
- Status sempre com texto + forma. Trilho das fases com `aria-current="step"`; medidor com `aria-label` textual.
- Foco visível em tudo que é clicável, inclusive linha de tabela (usar `<a>` no nome ou tornar a linha um link acessível, não só `onClick`).
- Manter o `skip-link` e o `id="conteudo-principal"` atuais.

## 10. Migração dos tokens atuais de `globals.css`

| Atual | Novo |
|---|---|
| `--royal` | `--brand` (preenchimento) e `--brand-ink` (texto/link) |
| `--royal-light` | `--brand-hover` / `--focus` |
| `--royal-dark` | `--brand-press` |
| `--navy-900`, `--navy-800` | `--shell`, `--shell-2` |
| `--text`, `--text-muted`, `--text-faint` | `--ink`, `--ink-2`, `--ink-3` |
| `--border`, `--border-strong` | `--line`, `--line-strong` |
| `--surface-muted` | `--surface-2` |
| `--success/-bg` etc. | `--success`, `--success-bg`, `--success-line` (acrescentar `-line` a cada tom) |
| `--radius-sm/md/lg` (6/10/16) | `--r-sm/md/lg` (6/10/14) |
| `--font-heading/body` | mantidos; acrescentar `--font-mono` |

Classes que já existem e só trocam de pele: `.topbar`, `.brand`, `.auth-*`, `.card*`, `.btn*`, `.field`, `.input`, `.badge`, `.alert`, `.list*`, `.empty-state`, `.filters` / `.filter-pill`, `.pagination`, `.phase-*`, `.stage-*`, `.update-*`, `.kv-grid`, `.breadcrumb`, `.page-title-row`. Componentes novos: trilho de fases (dentro do `PhaseTimeline`), resumo do projeto, callout de aprovação, sidebar do admin, KPIs do admin.
