# Lume — Roadmap e Melhorias

Documento vivo com o estado do app, o que já foi feito e o que vale fazer a
seguir. Escrito depois de uma **revisão completa do código** (correção,
arquitetura, segurança/privacidade). A régua é sempre a mesma: **app pessoal,
um usuário, local-first** — então priorizo robustez real e honestidade, e
deixo explícito o que só faz sentido "se um dia for multiusuário".

_Última atualização: 2026-07-22._

---

## 0. Veredito da revisão

O código está **bem construído**. Disciplina de schema, motor de sync puro e
testável, import dinâmico das libs pesadas, fluxo de atualização do PWA,
temas e o padrão honesto de IA ("a IA só REDIGE números reais, sempre com
fallback") estão todos acima da média para um PWA pessoal. Nada crítico.
Sem segredos vazados; RLS correto; sem XSS. O que segue é refino, não resgate.

---

## 1. Feito nesta rodada (já commitado)

- **Segurança/infra — bucket de anexos.** `schema.sql` criava um bucket
  `arquivos` que o código nunca usa; a sync de binários procura `anexos`.
  Num projeto montado só pelo schema, os anexos ficavam **local-only em
  silêncio**. Agora o schema provisiona `anexos` com uma política por
  operação (select/insert/update/delete).
- **Insights de Saúde e Finanças serviam número velho.** A chave de cache
  usava só ids fixos; o texto da IA ficava preso por até 24h enquanto os
  valores mudavam. Agora a assinatura reflete os textos e os números do
  payload (mesmo padrão que Pets já fazia certo).
- **Hoje não mostra mais erro cru da IA.** O diagnóstico vermelho (`sem
  cliente`, `exceção…`) aparecia na home de qualquer usuário sem nuvem.
  Saiu da UI (segue no console); a IA falha em silêncio e cai na heurística.
- **IA não dispara mais com dados não carregados** (`habilitado` só quando há
  observações) — evita gastar request e cachear texto vazio.
- **OCR de exame 10× errado.** O parser jogava fora todos os pontos, então um
  decimal em ponto (`0.9`) virava `9`. Agora detecta o estilo de separador
  (pt-BR e en) e o regex captura milhar + decimal.
- **Evento não some mais ao definir só categoria/pet/projeto/cor** sem título
  (`eventoVazio` ignorava esses campos → perda de dado).
- **Autosave da nota não ressuscita página excluída** (timer de 300ms podia
  regravar depois do delete).
- **Testes novos:** motor de insights (Pearson/correlação/impacto/tendência,
  15) e casos de OCR (decimais/milhar). Suíte: **55 passando.**
- **Code-splitting por rota + ErrorBoundary por módulo.** Cada página agora é
  um chunk sob demanda (a Hoje segue no bundle inicial). Um módulo que quebra
  na renderização não derruba mais o app inteiro.
- **Import de backup transacional + validação de forma.** Restaurar um backup
  agora é tudo-ou-nada (uma falha no meio não deixa o banco pela metade) e só
  grava registros bem-formados (objeto com chave presente); blob corrompido é
  pulado em vez de derrubar a restauração.
- **Sync com set por-registro (não varre o banco à toa).** Os hooks de escrita
  do Dexie marcam as CHAVES sujas (`colecao:id`); a coleta empurra só elas
  (modo parcial), inclusive durante edição ativa — sem ler as ~65 tabelas.
  Reconciliação completa fica como rede de segurança: 1ª coleta após carregar e
  periódica (pega qualquer escrita que escape dos hooks, ex.: importação em
  massa). A semântica do que é sincronizado é a mesma nos dois modos.
- **Testes de sync na camada Dexie (`fake-indexeddb`).** Cobrem o miolo onde
  bugs de sync moram: LWW (remoto/local vence), tombstone com carimbo fresco
  (sem ressurreição), preservação de blob no pull, `semBlob` no push, modo
  parcial × reconciliação, e round-trip de backup (exporta→apaga→restaura +
  rejeição de arquivo inválido / registro malformado). Suíte: **72 passando.**

---

## 2. Próximos passos — o que EU consigo fazer sozinho

Ordenado por valor/esforço. Nada aqui depende de você; é só dar o "vai".

### Médio / baixo

4. **Mais testes de lógica pura (S cada).** `proximaData` (recorrência de
   tarefa), `devidoNoDia`/`streakGeral` (hábitos, alimentam a Hoje),
   `interpretar` (já tem alguns). Barato e de alta confiança.
5. **Limpeza de cruft (S).** Tabelas legadas `humores` e `petItens` ainda
   passeiam pela sync/backup sem uso; a guarda de migração do humor
   (`nReg === 0`) é frágil. Remover com migração não-destrutiva.
6. **Faxina de anexos órfãos (S).** Ao apagar um registro com blob, o objeto
   no Storage nunca é removido (vazamento lento). Uma passada de limpeza pelos
   tombstones fecha isso.

---

## 3. Novas funcionalidades sugeridas (meu palpite)

Ideias que combinam com o que o Lume já é — sem inventar dependência cara.

- **Busca global (⌘K).** Um "abrir qualquer coisa": notas, tarefas, eventos,
  livros, pets. Os dados já estão todos no Dexie; falta uma tela de busca
  unificada. Provavelmente o recurso que mais aumenta a sensação de "cérebro
  único".
- **Revisão semanal / retrospectiva.** Uma tela que junta a semana (humor,
  hábitos, gastos, o que foi concluído) e deixa você escrever uma nota de
  fechamento. Encaixa no motor de insights e no padrão honesto de IA.
- **Exportações legíveis.** Além do backup JSON, exportar um mês de finanças
  em CSV e um caderno em Markdown/PDF (a base de Markdown já existe nas Notas).
- **Lembretes/notificações locais** (Notifications API + service worker) para
  hábitos e eventos do dia — sem servidor, tudo no aparelho.
- **"Modo foco" na Agenda** — bloquear tempo arrastando a tarefa pro dia
  (o time-blocking já existe; falta o gesto fluido).
- **Cofre de anexos** — uma visão única de todos os arquivos (capas, PDFs de
  livros, fotos de pet, notas fiscais) já que a sync de binários existe.

---

## 4. Depende de você (não consigo fazer daqui)

- **Domínio `lume.matheuscmelo.com.br`.** Quando quiser, eu preparo: trocar
  `base` para `'/'` no `vite.config.ts` + arquivo `CNAME`, e você aponta um
  CNAME "DNS only" (nuvem cinza) no Cloudflare para
  `mthscorreiademelo-source.github.io`. **Não empurro essa mudança antes do
  DNS estar pronto** — ela quebraria a URL atual do github.io.
- **Cota do Gemini (IA).** Os 429 que você viu não são bug: é a cota diária do
  free tier estourando com os testes. Reseta sozinha (meia-noite PT) ou some
  de vez ligando billing (centavos/mês). O modelo já está no
  `gemini-2.0-flash` (6× a cota do 2.5). Nada a mudar no código.
- **Rodar o `schema.sql` atualizado** no SQL Editor do Supabase para o bucket
  `anexos` passar a existir por lá também (o passo manual do
  `SETUP-SUPABASE.md` continua valendo se você já criou na mão).
- **Open Finance.** Continua precisando de um agregador (Pluggy/Belvo) e de um
  backend mínimo para guardar o token — inevitavelmente um custo e uma
  conversa à parte. É o item mais "trabalhoso × agora" da lista antiga;
  sugiro deixar por último.

---

## 5. O que decidimos NÃO priorizar (e por quê)

Escopo honesto para um app de um usuário só:

- **i18n.** Tudo em pt-BR de propósito. Extrair strings seria só custo.
- **a11y além do atual.** Já usa `aria-label` e `<button>` de verdade em toda
  parte. Suficiente.
- **HashRouter.** É a escolha **certa** para GitHub Pages (sem rewrite de
  servidor). Os contras (o `#`, SEO) não importam aqui.
- **Merge campo-a-campo (CRDT) na sync.** O last-writer-wins por documento é
  adequado para um usuário nos próprios aparelhos; CRDT seria over-engineering.
- **Rate-limit server-side / consentimento explícito de IA.** Só viram
  obrigatórios **se o app virar multiusuário** — aí entram como pré-requisito
  (a IA manda dados de saúde/finança derivados pro Google; hoje é a sua chave,
  seus dados, você sabe).

---

## 6. Se um dia compartilhar o app (multiusuário) — faça primeiro

1. Consentimento/aviso explícito de envio de dados à IA nas telas de insight
   (saúde/finança viram consentimento obrigatório).
2. Rate-limit e cota da IA no servidor, por `auth.uid()` (hoje o teto é só no
   `localStorage`, burlável; uma só chave Gemini serve todo mundo).
3. Endurecer o import de backup (validação de forma + allow-list de MIME nos
   blobs) e nunca renderizar blob não confiável inline.
