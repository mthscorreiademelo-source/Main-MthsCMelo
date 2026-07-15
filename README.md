# Vida

App pessoal minimalista, inspirado no Notion, para centralizar e administrar todas as áreas da sua vida — feito para ser usado principalmente no tablet.

É um **PWA local-first**: instala como app, funciona 100% offline e todos os dados ficam no seu dispositivo (IndexedDB). Sem conta, sem servidor, sem custo.

## Filosofia

Uma coisa de cada vez. O app nasce com um único módulo bem feito e uma fundação modular que permite adicionar novas áreas sem retrabalho.

**v0.8 (atual)**
- 🌤️ **Hoje** — saudação, data, tarefas do dia e hábitos com um toque
- ✅ **Tarefas** — adição rápida, data agendada, abas Hoje · Próximas · Todas · Concluídas, edição em painel lateral
- 📄 **Notas** — galeria de **grupos com capa 4:5** (nome + imagem, recorte automático) e notas soltas abaixo; dentro do grupo, lista das notas dele; editor de blocos simples (parágrafo, título, lista, to-do) com atalhos `# `, `- `, `[] ` e seletor de grupo
- ✍️ **Quadro infinito** — desenho em **tela cheia** com **zoom por pinça** e **arrastar com os dedos** (stylus desenha, dedo navega); 4 canetas — lápis grafite, tinteiro, marca-texto e pincel — cada uma com **cor (paleta visual)**, **ponta** e **assistência de caligrafia** próprias; **régua** (1 dedo move, 2 dedos giram; o traço encosta e sai reto), **borracha de traço ou de pixels** com tamanho ajustável, **seleção por retângulo ou laço** (mover, girar e excluir), **imagens da galeria e PDFs** direto no quadro; traços vetoriais + câmera salvos, miniatura na lista
- 🔥 **Hábitos** — visão dos últimos 7 dias com marcação por toque (inclusive dias passados) e sequência (streak) automática
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
