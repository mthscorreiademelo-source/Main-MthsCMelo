# Lume

App pessoal minimalista, inspirado no Notion, para centralizar e administrar todas as áreas da sua vida — feito para ser usado principalmente no tablet.

É um **PWA local-first**: instala como app, funciona 100% offline e todos os dados ficam no seu dispositivo (IndexedDB). A sincronização em nuvem (conta com login por e-mail, dados acessíveis em qualquer aparelho) é **opcional** — enquanto não configurada, o app roda exatamente como acima. Veja [`SETUP-SUPABASE.md`](./SETUP-SUPABASE.md).

## Filosofia

Mais do que um conjunto de módulos, o Lume é pensado como um **sistema operacional pessoal**: um lugar onde tudo se conecta. Ele responde a duas perguntas — *"o que precisa da minha atenção agora?"* (a tela **Hoje**, o cérebro que agrega tudo) e *"como eu gerencio esta área da minha vida?"* (os **módulos**, cada um especializado e alimentando o Hoje). A arquitetura é modular e integrada: módulo novo se apresenta ao dashboard sozinho, e um **motor de inteligência** compartilhado cruza os dados para revelar padrões.

**v0.25 (atual)**
- ☁️ **Conta (opcional)** — fundação de sincronização em nuvem: login por e-mail (Supabase) e **sincronização** dos módulos entre aparelhos (mescla por "última edição vence", offline-first). Gated: sem configuração, o app segue local-first e idêntico. 
- 🌤️ **Hoje** — **dashboard integrado** de verdade, não uma lista: uma **faixa de resumo** ("cockpit") no topo com mini-tiles glanceáveis (hábitos do dia em anel, tarefas restantes, humor, passos/sono) e, abaixo, uma **grade masonry de 2 colunas** (1 no celular) com os cartões de cada módulo — os interativos (Tarefas, Hábitos) ancorando o topo e os glanceáveis (Humor, Saúde, Leitura, Finanças) ao lado. Inclui um cartão de **notas recentes** (as últimas editadas, úteis para o dia). Nenhum módulo é fixo no código — ao adicionar um novo (com `SecaoHoje` e, opcionalmente, um `HojeResumo`), ele aparece aqui sozinho
- ✅ **Tarefas** — módulo repensado (inspiração Todoist, identidade própria): visões **Hoje · Próximas · Entrada · Concluídas** e **Projetos** (com cor, contagem e visão por projeto). **Adição rápida inteligente** que entende `hoje`/`amanhã`/dias da semana, `p1`–`p4` e `#projeto` no texto (com chips de pré-visualização). **Cards** com checkbox colorido pela prioridade, chip de data (vermelho quando atrasada), horário, ícone de recorrência, contagem de subtarefas e etiquetas. **Subtarefas aninhadas** (aninhamento livre, expandir/recolher). **Editor rico** em painel lateral: prioridade **P1–P4**, data + hora, projeto, **recorrência** (diária/semanal/mensal/anual — ao concluir, a data avança), **etiquetas** e descrição. **Próximas** agrupada por dia. Tem **visão de Calendário** (mês colorido pelas prioridades do dia; toque num dia para ver/planejar), **busca** por título/descrição/etiqueta, **filtros por etiqueta** (chips com contagem), **reagendamento rápido** ("planejar": Hoje / Amanhã / Fim de semana / Próxima semana / data) num toque, e **reordenar arrastando** nas visões Entrada e Projeto. Tudo sincroniza e entra no backup.
- 📅 **Agenda** — calendário de eventos estilo Google Calendar, com **7 modos**: **Dia** (agenda-timeline minimalista), **3 / 4 dias** e **Semana** (grade de tempo com colunas por dia, régua de horas, **linha do agora**, faixa de dia inteiro, cabeçalho fixo que alinha com a grade), **Mês** (grade com chips por dia), **Trimestre** e **Ano** (mini-calendários com marcadores; tocar num dia abre o Dia). **Eventos** como blocos coloridos: crie **tocando ou arrastando** um intervalo, **mova** e **redimensione**; editor com título, dia inteiro, início/fim, cor, local, descrição, **repetição** (diária/semanal/mensal/anual — gera as ocorrências) e **presença** estilo Google (confirmado = bloco sólido; pendente = vazado só com a moldura; recusado = vazado com o nome riscado). **Time-blocking de tarefas**: tarefas com data e hora viram blocos na grade (com ✓, abrem o editor de tarefa) e ao **arrastar/redimensionar** gravam `horario`/`duração` de volta na tarefa; sem hora ficam na faixa de dia inteiro. Card **"Agenda de hoje"** e tile de próximo evento no dashboard. Local-first, sincroniza e entra no backup
- 📄 **Notas** — galeria de **grupos com capa 4:5** (nome + imagem, recorte automático) e notas soltas abaixo; dentro do grupo, lista das notas dele; **três tipos de nota**: **texto** (editor de blocos simples — parágrafo, título, lista, to-do — com atalhos `# `, `- `, `[] `), **desenho** (quadro infinito) e **arquivos** (importe PDFs, imagens, vídeos, áudios, textos e outros; ficam **agrupados por tipo**, com miniatura de imagens e pré-visualização de texto/imagem/vídeo/áudio/PDF); seletor de grupo em qualquer uma
- ✍️ **Quadro infinito** — desenho em **tela cheia** com **zoom por pinça** e **arrastar com os dedos** (stylus desenha, dedo navega); 4 canetas — lápis grafite, tinteiro, marca-texto e pincel — cada uma com **cor (paleta visual)**, **ponta** e **assistência de caligrafia** próprias; **régua** (1 dedo move, 2 dedos giram; o traço encosta e sai reto), **borracha de traço ou de pixels** com tamanho ajustável, **seleção por retângulo ou laço** (mover, girar e excluir), **imagens da galeria e PDFs** direto no quadro, **post-its** com 4 cores em que dá para riscar por cima (a tinta fica colada no papel e move/gira junto); barra de ferramentas **móvel** (acopla em qualquer borda) e **minimizável**, com inserção de imagem/PDF integrada; **tela cheia imersiva** que esconde a navegação do tablet ao desenhar; ferramenta **ponteiro** (toque seleciona, arrasto move; ativa sozinha após inserções) com **redimensionamento** pela alça do canto; **menu de toque longo** com copiar/colar (inclusive **imagens da área de transferência**); marca-texto com modo **linha reta** (o arrasto define ângulo/comprimento); ao importar PDF, escolha **uma página** ou o **documento inteiro como folheador** (setas para virar as páginas); **anotações feitas sobre o folheador grudam na página** — somem ao virar a página, reaparecem ao voltar e acompanham o PDF ao mover/girar/redimensionar; traços vetoriais + câmera salvos, miniatura na lista
- 🔥 **Hábitos** — módulo repensado (inspiração HabitNow, identidade própria): **cabeçalho de progresso do dia** (anel %, feitos/total, sequência), **categorias recolhíveis** (Saúde, Estudos, Exercícios…) e **cards modernos com um toque**. Cada hábito tem um **tipo de medição** — Sim/Não (**3 estados**: feito ✓ / não feito ✕ / pendente, num toque), Contador, Valor acumulado, Tempo, Distância, Quantidade e **Checklist** — com **meta, unidade e passo** próprios; personalização de **ícone, cor, categoria, descrição, horário, prioridade** e **frequência** (todo dia, dias da semana, dias alternados, X×/semana, dias do mês). **Tocar num hábito abre a página de métricas** (sequência atual, melhor sequência, taxa de conclusão, esta semana/mês e **mapa de calor**); a edição fica num ícone de lápis. Tem **aba de estatísticas** (conclusão em 30 dias, dias perfeitos, sequência geral, gráfico dos últimos 14 dias, mapa de calor global e ranking por hábito), **frequência semanal inteligente** (para de cobrar quando a meta da semana é batida, mostrando `1/3 nesta semana`), **lembretes** locais por horário (notificações enquanto o app está aberto) e **preenchimento automático por integração**: um hábito pode puxar o valor do dia direto da **Saúde** (passos, sono, exercício, calorias). Um **navegador de data** no topo permite **registrar/editar dias passados** (voltar a qualquer dia — nunca o futuro — e marcar/medir os hábitos daquele dia). Microinterações suaves em toda a tela (check com pop, anéis animados, colapso fluido das categorias).
- 🙂 **Humor** — diário inteligente de humor (estilo diário premium) com **navegação própria por barra inferior**: **Hoje** (humor do dia, sequência, gráfico dos últimos 14 dias, insight de padrão), **Novo Registro** em etapas curtas (5 rostos exclusivos do app → intensidade → emoções → fatores em grupos recolhíveis → nota + foto/desenho), **Linha do Tempo** (cards com rosto, tags, nota e miniatura; abrir para editar/excluir), **Calendário** (mês colorido pela média do dia; toque abre os registros do dia e permite registrar em datas passadas), **Insights** (motor de padrões: o que eleva/derruba seu humor, melhor dia da semana, tendência) e **Estatísticas** (distribuição, média, sequência, humor por dia da semana, fatores mais frequentes). Vários registros por dia. **Personalização completa** (engrenagem no topo): editar os 5 humores (nome, cor, descrição) e gerenciar **categorias + fatores** — criar, renomear, ícone, cor, descrição, reordenar, recolher grupos, arquivar e excluir (com as referências limpas dos registros)
- ❤️ **Saúde** — resumo diário de **sono, passos, calorias, FC de repouso e exercício**: registro manual por dia, **importação de arquivo** (CSV/JSON, com reconhecimento flexível de colunas — ponte para exports do relógio/Zepp) ou **conectar uma Planilha Google publicada como CSV** (relê e importa sozinho ao abrir a Saúde), cartões com tendência (mini-gráfico) e histórico. Alimenta o **motor de insights**: os Insights do Humor passam a mostrar correlações **humor × saúde** ("seu humor tende a ser melhor nos dias com mais sono")
- 💰 **Finanças** — entradas/saídas em reais, categorias, navegação por mês e resumo (entradas, saídas, saldo)
- 📚 **Biblioteca** — rastreador de leituras + agregador de arquivos: estantes **Quero ler · Lendo · Lido · Abandonei**, para livros, quadrinhos e mangás; adicione **importando o arquivo** (EPUB/PDF/CBZ — extrai **título, autor e capa** automaticamente) ou só o registro; por obra: capa (extraída do arquivo ou uma **imagem própria**), **coleção/série + número do volume**, **progresso (%)**, **nota (estrelas)**, **resenha**, gêneros; **visão agrupada por coleção** (ordenada pelo número) e badge do volume nas capas; busca e filtros na estante; card **"Leitura"** no Hoje com o que você está lendo. **Leitor embutido em tela cheia** (EPUB via epub.js, PDF e CBZ paginados) com **temas claro/sépia/escuro**, **tamanho de fonte** (EPUB), navegação por toque (esquerda/direita vira página, centro mostra/oculta as barras) e **progresso salvo automaticamente** — reabrir continua de onde parou. Os **metadados e a capa sincronizam** entre aparelhos; o **arquivo em si fica local** (leitura offline)
- 📱 **App Android (Lume)** — o mesmo Lume web num app nativo que, por baixo, lê o **Health Connect ("Conexão Saúde")** e envia sono/passos/calorias/FC/exercício para a sua nuvem, sincronizando sozinho em segundo plano (companion opcional; o web segue funcionando igual)
- 🌓 Modo claro/escuro
- 💾 Exportar/importar backup em JSON (na sidebar)

**Roadmap** (um módulo por versão)
- v0.7 — Sincronização opcional em nuvem

## Como rodar

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # build de produção (gera dist/ com PWA)
npm run preview   # serve o build localmente
```

## Como instalar no tablet

O app é publicado automaticamente a cada push (GitHub Actions → GitHub Pages):

**https://mthscorreiademelo-source.github.io/Main-MthsCMelo/**

1. Abra o endereço acima no navegador do tablet.
2. Use **"Adicionar à tela inicial"** (Safari/iPad) ou **"Instalar app"** (Chrome/Android).
3. Pronto: abre em tela cheia e funciona offline. Os dados ficam no aparelho — use *Exportar backup* de vez em quando.

## Arquitetura

```
src/
  core/            # fundação compartilhada
    db/            # Dexie (IndexedDB): schema versionado + backup
    theme/         # modo claro/escuro
    layout/        # AppShell: sidebar + conteúdo
    insights/      # motor de inteligência (correlações/padrões) — genérico
    components/    # UI base (Button, Sheet, EmptyState, SecaoDashboard, Icons)
    modules.ts     # registro central de módulos (rota, ícone, SecaoHoje…)
  modules/         # um diretório por área da vida
    hoje/          # dashboard que compõe as SecaoHoje de cada módulo
    tarefas/
    notas/
    habitos/
    humor/
    saude/
    financas/
```

**Integração e inteligência.** O `modules.ts` é um registro central: cada módulo declara rota, ícone e, opcionalmente, uma `SecaoHoje` (sua contribuição para o dashboard). O `Hoje` compõe todas elas sem conhecer nenhum módulo pelo nome — módulo novo aparece sozinho. O `core/insights` é um motor genérico de padrões: módulos publicam "sinais diários" e "fatores", e o motor cruza qualquer par (hoje o Humor é o primeiro cliente; Sono, Exercícios e Finanças plugam no mesmo motor no futuro).

**Stack:** Vite · React · TypeScript · Tailwind CSS v4 · Dexie.js · react-router · date-fns · vite-plugin-pwa

### Como nasce um módulo novo

1. Crie a pasta `src/modules/<nome>/` com a página e os componentes.
2. Se precisar de dados, adicione a tabela numa **nova versão** do schema em `src/core/db/db.ts` (nunca edite uma versão publicada).
3. Registre o módulo em `src/core/modules.ts` (nome, ícone, rota, página).

Nada no core precisa mudar — a sidebar e as rotas são geradas a partir do registro.

## Design

Tokens definidos em `src/index.css` (paleta neutra estilo Notion, claro e escuro). Regras de UX para toque: alvos ≥ 44px, edição em sheet lateral, sidebar fixa em paisagem e overlay em retrato.
