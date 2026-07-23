# Handoff — continuar o Lume na máquina local

Este documento é o "briefing" para uma nova sessão do Claude Code rodando **no
computador do usuário** (com acesso ao Chrome local, para testar/configurar o
que precisa de navegador de verdade — notificações push, instalação do PWA etc.).

## O que é o Lume

PWA local-first de organização pessoal (Notion/Apple minimalista), em **Vite +
React 19 + TypeScript + Tailwind v4**, dados em **Dexie/IndexedDB**, sincronização
**opcional** com **Supabase** (tabela genérica `documentos`, LWW por `updated_at`,
RLS por usuário). Deploy automático em **GitHub Pages** via `.github/workflows/deploy.yml`.
Módulos: Hoje, Tarefas, Agenda, Notas e Cadernos, Hábitos e Rotinas, Humor, Saúde,
Finanças, Biblioteca, Projetos, Pets, Compras, Lugares, Quick Actions.

- **Repositório:** `mthscorreiademelo-source/Main-MthsCMelo`
- **Branch de trabalho:** `claude/saas-life-management-app-6wku2r` (é onde TUDO é
  desenvolvido e para onde se dá push; não commitar direto na default)
- **Versão atual:** 0.81.0
- **App no ar:** https://mthscorreiademelo-source.github.io/Main-MthsCMelo/
- **Node:** 22.x. Rodar: `npm install` → `npm run dev` (dev) / `npm run build`
  (checa tipos) / `npm run lint` (oxlint) / `npx vitest run` (91 testes).

## Como o ambiente foi montado (para clonar localmente)

```bash
# dentro da pasta que você já criou:
git clone https://github.com/mthscorreiademelo-source/Main-MthsCMelo .
git checkout claude/saas-life-management-app-6wku2r
npm install
npm run dev
```

## Convenções e regras que NÃO podem quebrar

- **Honestidade dos dados**: a IA só REESCREVE números reais já calculados no app;
  nunca inventa valor/data/fato. Sempre há fallback heurístico e rótulo de origem.
- **Local-first**: nada pode exigir nuvem/login para funcionar offline. Recursos de
  nuvem são "gated" (só aparecem/agem com `nuvemAtiva()` + sessão).
- **Migrações não-destrutivas** (Dexie): campos novos entram como opcionais; nunca
  apagar dados do usuário.
- **Gráficos**: SVG próprio, na identidade do Lume (sem Chart.js/CDN — offline).
- **Reusar editores** existentes em fluxos novos (não duplicar UI).
- **Antes de commitar**: `npm run build` + `npm run lint` + `npx vitest run` verdes.
  Quando mexer em UI, validar num navegador (agora dá pra usar o Chrome local!).
- **Push**: sempre para a branch `claude/saas-life-management-app-6wku2r` com
  `git push -u origin <branch>`; depois confira o deploy no Actions (deploy.yml).
- **Trailers de commit** usados até aqui:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` e
  `Claude-Session: <link da sessão>`.
- **Nunca** colocar o identificador de modelo em commits/PRs/código/docs.

## Onde está a documentação (LER primeiro)

- `README.md` — visão geral do projeto.
- `SETUP-SUPABASE.md` — configuração da nuvem (SQL, chaves).
- `WEARABLE-E-QUICK-ACTIONS.md` — plano do smartwatch (Amazfit Bip 6 / Zepp OS),
  notificações e Quick Actions no pulso. Decisões fixadas: **Android**, MVP começa
  pela **Fase 1 (Web Push)**; saúde via **Health Connect + companion Android (TWA)**.
- `NOTIFICACOES-SETUP.md` — passo a passo do Web Push (tabela, segredos VAPID,
  deploy da Edge Function, cron). **Contém as chaves VAPID já geradas.**
- `ROADMAP-E-MELHORIAS.md` — melhorias e prioridades gerais.
- `supabase/schema.sql` — schema + RLS (inclui `push_assinaturas`).

## Estado recente (o que acabou de ser feito nesta sessão)

1. **Finanças → aba "Análise"** (v0.80.0): colunas mensais Receitas/Despesas/Aportes
   real + programado (SVG próprio) + gasto por categoria clicável.
2. **Importação da planilha do dashboard antigo**: foi gerado um backup do Lume a
   partir de um `.xlsx` (1.356 lançamentos, 2 objetivos, 12 recorrentes, orçamento,
   parcelas). O arquivo `lume-financas-import.json` foi ENTREGUE ao usuário (está no
   computador dele, provavelmente em Downloads) — importar por
   Configurações → Importar backup, logado. (Não está no repo.)
3. **Notificações Fase 1 (Web Push)** (v0.81.0): código pronto —
   `src/core/notificacoes/*`, `public/push-sw.js`, Edge Function
   `supabase/functions/enviar-lembretes`, tabela `push_assinaturas`. **Falta a
   configuração no Supabase e o teste real no navegador.**

## Tarefas imediatas (por isso mudamos para local)

### 1) Destravar as notificações push (prioridade — precisa do Chrome)
O usuário tentou "Ligar notificações" e **não conseguiu ativar**. Diagnosticar com
o Chrome local:
- Abrir o app (dev `npm run dev` OU o deploy), logar, Configurações → Notificações.
- Verificar no DevTools → Application → Service Workers se o SW está ativo e se
  `push-sw.js` foi importado; Console para erros de `subscribe`/permissão.
- Causas prováveis: (a) tabela `push_assinaturas` ainda não criada no Supabase
  (fazer Passo 1 do `NOTIFICACOES-SETUP.md`); (b) permissão bloqueada no site
  (liberar em chrome://settings/content/notifications); (c) service worker antigo
  em cache (atualizar/`skipWaiting`).
- Depois: definir os segredos VAPID + `CRON_SECRET`, `supabase functions deploy
  enviar-lembretes --no-verify-jwt`, e usar o botão "Enviar notificação de teste".
- **Nota**: no cliente, `ligar()` faz upsert em `push_assinaturas` — se a tabela não
  existir, a assinatura local é criada mas o teste não encontra o dispositivo.
  Considerar melhorar o tratamento de erro para avisar o usuário quando o upsert
  falhar.

### 2) Empacotar como app Android instalável de verdade (TWA)
Recomendação já acordada: **não** reescrever nativo; empacotar o PWA como **TWA
(Trusted Web Activity)**, reaproveitando o companion Android existente. Ganhos:
Play Store, cara de app nativo e — o principal — **acesso ao Google Health Connect**
para puxar passos/sono/batimentos do Amazfit (Fase 3 do plano do relógio). Ver
`WEARABLE-E-QUICK-ACTIONS.md`.

### 3) Depois: Fase 2 do plano do relógio — Quick Actions num mini app Zepp OS
(escrever no `documentos` do Supabase via side service). Ver o plano.

## Supabase (referência rápida)

- URL: `https://jcvjboqomgrdvigtdjhb.supabase.co` (chave anon é pública por design,
  já no código — a segurança vem do RLS).
- Edge Functions existentes: `interpretar`, `insights`, `enviar-lembretes`.
- O ambiente de sandbox anterior NÃO alcançava o Supabase do usuário (proxy). Na
  máquina local, com a CLI do Supabase logada, dá para deployar funções e rodar SQL.

---

*Gerado como briefing de transição. A sessão local deve começar lendo este arquivo
e os docs citados, depois atacar a Tarefa 1 (notificações) usando o Chrome local.*
