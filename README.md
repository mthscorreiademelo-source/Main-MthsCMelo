# Lume

App pessoal minimalista, inspirado no Notion, para centralizar e administrar todas as áreas da sua vida — feito para ser usado principalmente no tablet.

É um **PWA local-first**: instala como app, funciona 100% offline e todos os dados ficam no seu dispositivo (IndexedDB). Sem conta, sem servidor, sem custo.

## Filosofia

Uma coisa de cada vez. O app nasce com um único módulo bem feito e uma fundação modular que permite adicionar novas áreas sem retrabalho.

**v0.16 (atual)**
- 🌤️ **Hoje** — saudação, data, tarefas do dia e hábitos com um toque
- ✅ **Tarefas** — adição rápida, data agendada, abas Hoje · Próximas · Todas · Concluídas, edição em painel lateral
- 📄 **Notas** — galeria de **grupos com capa 4:5** (nome + imagem, recorte automático) e notas soltas abaixo; dentro do grupo, lista das notas dele; **três tipos de nota**: **texto** (editor de blocos simples — parágrafo, título, lista, to-do — com atalhos `# `, `- `, `[] `), **desenho** (quadro infinito) e **arquivos** (importe PDFs, imagens, vídeos, áudios, textos e outros; ficam **agrupados por tipo**, com miniatura de imagens e pré-visualização de texto/imagem/vídeo/áudio/PDF); seletor de grupo em qualquer uma
- ✍️ **Quadro infinito** — desenho em **tela cheia** com **zoom por pinça** e **arrastar com os dedos** (stylus desenha, dedo navega); 4 canetas — lápis grafite, tinteiro, marca-texto e pincel — cada uma com **cor (paleta visual)**, **ponta** e **assistência de caligrafia** próprias; **régua** (1 dedo move, 2 dedos giram; o traço encosta e sai reto), **borracha de traço ou de pixels** com tamanho ajustável, **seleção por retângulo ou laço** (mover, girar e excluir), **imagens da galeria e PDFs** direto no quadro, **post-its** com 4 cores em que dá para riscar por cima (a tinta fica colada no papel e move/gira junto); barra de ferramentas **móvel** (acopla em qualquer borda) e **minimizável**, com inserção de imagem/PDF integrada; **tela cheia imersiva** que esconde a navegação do tablet ao desenhar; ferramenta **ponteiro** (toque seleciona, arrasto move; ativa sozinha após inserções) com **redimensionamento** pela alça do canto; **menu de toque longo** com copiar/colar (inclusive **imagens da área de transferência**); marca-texto com modo **linha reta** (o arrasto define ângulo/comprimento); ao importar PDF, escolha **uma página** ou o **documento inteiro como folheador** (setas para virar as páginas); **anotações feitas sobre o folheador grudam na página** — somem ao virar a página, reaparecem ao voltar e acompanham o PDF ao mover/girar/redimensionar; traços vetoriais + câmera salvos, miniatura na lista
- 🔥 **Hábitos** — **visão do mês inteiro** por hábito (grade de calendário estilo Habit Now): marque cada dia por toque, veja quantos dias cumpriu no mês, com **destaque para o dia de hoje** e a sequência (streak) automática; navegação entre meses
- 🙂 **Humor** — registro diário do humor em 5 níveis (estilo Daylio): toque num rosto para marcar como foi o dia (inclusive dias passados pelo calendário), nota opcional, **calendário do mês colorido pelo humor** e resumo mensal (humor médio + distribuição por nível)
- 💰 **Finanças** — entradas/saídas em reais, categorias, navegação por mês e resumo (entradas, saídas, saldo)
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
    components/    # UI base (Button, Checkbox, Sheet, EmptyState, Icons)
    modules.ts     # registro central de módulos
  modules/         # um diretório por área da vida
    hoje/
    tarefas/
    notas/
    habitos/
    humor/
    financas/
```

**Stack:** Vite · React · TypeScript · Tailwind CSS v4 · Dexie.js · react-router · date-fns · vite-plugin-pwa

### Como nasce um módulo novo

1. Crie a pasta `src/modules/<nome>/` com a página e os componentes.
2. Se precisar de dados, adicione a tabela numa **nova versão** do schema em `src/core/db/db.ts` (nunca edite uma versão publicada).
3. Registre o módulo em `src/core/modules.ts` (nome, ícone, rota, página).

Nada no core precisa mudar — a sidebar e as rotas são geradas a partir do registro.

## Design

Tokens definidos em `src/index.css` (paleta neutra estilo Notion, claro e escuro). Regras de UX para toque: alvos ≥ 44px, edição em sheet lateral, sidebar fixa em paisagem e overlay em retrato.
