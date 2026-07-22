# Biblioteca — IA e integrações (arquitetura)

> A Biblioteca já é uma **memória de conhecimento** offline: estante, leitor
> (EPUB/PDF/CBZ) com **seleção de texto → destaques e notas** ancorados no CFI,
> Visão geral (leitura atual, jornada, notas e destaques recentes, coleções),
> abas (Estante · Leituras · Notas · Autores · Coleções) e o **Workspace do
> Livro** (Visão · Notas · Destaques). Este documento descreve o que depende de
> IA/infra e fica para uma próxima fase — encaixando nos modelos que já existem.

## Princípios

- A IA **potencializa** a leitura, nunca a substitui. Toda geração é revisável.
- Heurística/local primeiro; LLM só quando agrega (resumo, perguntas, conexões).
- Opt-in e gated, como as demais integrações de nuvem/IA.

## 1. Flashcards

✅ **Implementado (local, offline):** aba **Flashcards** na Biblioteca com
criação **manual** (frente/verso, opcionalmente ligados a um livro) e **revisão
espaçada SM-2** (tabela `flashcards`, schema v30; sincroniza e entra no backup).
Botões de recordação Errei/Bom/Fácil, agendamento automático da próxima revisão.

Ainda futuro: **geração automática** de cartões a partir de um destaque/nota,
que exige um LLM (Edge Function) — não roda no cliente e não foi simulada.

## 2. Resumo e perguntas por IA (LLM)

- **Resumo de capítulo / do livro**, **perguntas sobre o livro**, **explicar
  trecho difícil**, **mapa mental** — Edge Function que recebe o texto do
  capítulo (ou os destaques/notas) e devolve o resultado. Nada roda no cliente.
- Encaixe: uma aba **"Resumo da IA"** no Workspace; os resultados podem virar
  notas com `origem: 'ia'`.

## 3. Conexões entre leituras (base de conhecimento)

- **Relacionar livros semelhantes** e **encontrar conceitos** entre diferentes
  leituras — começa heurístico (gêneros, autores, tags e busca por palavras nos
  destaques/notas) e evolui para **embeddings** (vetor por destaque/nota) num
  backend para busca semântica ("onde li sobre X?").
- Isso alimenta a "base de conhecimento da IA sobre o usuário": temas que
  interessam, autores frequentes, assuntos pouco explorados.

## 4. Integrações entre módulos

Ganchos a criar (os modelos-alvo já existem ou virão):

- **Documentos** (módulo futuro): PDFs disponíveis em Biblioteca **e**
  Documentos sem duplicação — mesma tabela de arquivos, duas visões.
- **Projetos** (módulo futuro): vincular uma nota/destaque a um projeto
  (`notaLivro.projetoId`).
- **Tarefas**: um trecho vira tarefa com 1 clique ("Implementar método GTD" →
  nova `task`) — reusa o modelo de Tarefas que já existe.
- **Aprendizagem** (módulo futuro): um livro faz parte de uma trilha.
- **Pessoas** (módulo futuro): associar livro a pessoa ("emprestado para João",
  "recomendado por Ana") via `livro.pessoaIds`.
- **Leitor**: além de destacar/anotar, **desenhar** sobre a página e **criar
  links** entre trechos (anotação-âncora ↔ anotação-âncora).

## Roadmap sugerido

1. **Flashcards manuais** + revisão espaçada (local) a partir de destaques/notas.
2. **Trecho → Tarefa** e **nota ↔ Projeto** (integrações com módulos existentes).
3. **Resumo/pergunta por IA** (Edge Function) — aba "Resumo da IA".
4. **Busca semântica** (embeddings) entre destaques/notas — "onde li sobre X?".
5. **Documentos/Aprendizagem/Pessoas** quando esses módulos existirem.
6. **Desenho e links** no leitor.

## Segurança & privacidade

- Enviar texto de livros para um LLM é opt-in e explícito; o conteúdo local
  continua funcionando sem nenhuma dessas integrações.
- Segredos/tokens vivem só no backend (mesmo padrão do Open Finance).

---

**TL;DR:** o essencial (ler, destacar, anotar, organizar, recuperar) roda
offline e já está pronto. As camadas de IA (resumo, perguntas, flashcards
gerados, conexões semânticas) e as integrações com módulos futuros apenas
**alimentam** os modelos de notas/destaques/arquivos que já existem — sem
refazer a interface.
