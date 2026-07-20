# Tarefas — inteligência futura (arquitetura)

> A tela de Tarefas já traz a camada de execução inteligente que roda **offline
> e sem custo**: ordenação por score (prazo + prioridade + energia + bloco),
> indicadores, resumo do mês, insights heurísticos (produtividade, melhor
> horário, taxa de conclusão, blocos livres), atributos de **energia**,
> **contexto** e **dependências**, e a **integração com a Agenda** (sugerir e
> reservar um bloco numa janela livre). Este documento descreve o que depende de
> IA de verdade / mais infra e fica para uma próxima fase.

## Princípios

- A IA **assiste**, nunca decide sozinha: toda sugestão é aceita com 1 clique e
  reversível.
- Heurística primeiro. Só subir para um LLM quando agrega valor real (linguagem
  natural, divisão de tarefas, reestimativa aprendida).
- Opt-in e gated, como as demais integrações de nuvem/IA.

## 1. Estimativas que aprendem

Hoje: a duração é informada à mão e usada no tempo estimado e no encaixe em
janelas livres.

Futuro: comparar **estimado × real** (quando o usuário conclui um bloco) e
ajustar as próximas estimativas do mesmo tipo/projeto. Começa heurístico
(média do histórico por projeto/label) e pode virar um modelo simples local.

## 2. Reorganização proativa dirigida por contexto

Hoje: ordenação inteligente sob demanda + sugestão de bloco na janela livre.

Futuro (precisa de sinais em tempo real):
- **Saúde:** se dormiu mal, rebaixar tarefas de **energia alta** e sugerir um
  bloco de descanso. (o campo `energia` já existe; falta a regra cruzando o
  sono do dia.)
- **Contexto/local:** se está fora de casa, priorizar tarefas de contexto
  compatível (Celular/Rua) e esconder as de Computador. (precisa de
  localização/manual — Web, ou o app Android.)
- **Agenda:** reunião cancelada → detectar a nova janela e sugerir mover a
  tarefa mais importante para lá (webhook/observador da Agenda).

## 3. IA de linguagem (backend/LLM)

- **Criar tarefas a partir de texto livre / voz** ("me lembra de renovar o
  seguro semana que vem" → tarefa com data).
- **Dividir tarefas grandes** em subtarefas sugeridas.
- **Agrupar semelhantes** e **detectar esquecidas** (sem data há muito tempo).
- **Detectar sobrecarga**: mais horas planejadas do que cabem no dia.

Arquitetura: uma Edge Function que recebe o contexto (tarefas, agenda, projeto)
e devolve sugestões estruturadas; nada roda no cliente. Mesmo padrão do Open
Finance/Saúde.

## 4. Integrações entre módulos (geração de tarefas)

O modelo já suporta o vínculo por `projetoId`; as demais são regras a escrever:

- **Projetos:** ao concluir tarefas, atualizar o progresso do projeto; um
  projeto pode gerar tarefas a partir de um checklist/itens planejados. (o
  módulo Projetos como página ainda será criado.)
- **Hábitos → Tarefas:** hábitos não viram tarefas, mas geram tarefas pontuais
  ("levar o cachorro ao veterinário", "renovar academia", "comprar vitaminas").
- **Finanças:** tarefas com impacto financeiro (comprar notebook, pagar
  condomínio, renovar seguro) podem lançar/estimar um movimento — reusando o
  padrão custo↔orçamento que já existe na Agenda.
- **Biblioteca/Aprendizagem:** um livro/curso gera tarefas ("ler capítulo 5",
  "revisar anotações").

## Roadmap sugerido

1. **Estimativas aprendidas** (heurístico local) + registrar tempo real dos
   blocos concluídos.
2. **Regras de reorganização por Saúde e Contexto** (cruzam dados que já temos).
3. **Observador da Agenda** para sugerir remanejamento quando abre uma janela.
4. **IA de linguagem** (criar/dividir/agrupar) via Edge Function.
5. **Geração de tarefas** a partir de Projetos, Hábitos, Finanças e Biblioteca.

---

**TL;DR:** a parte "inteligente" que dá para fazer bem offline já está na tela.
As peças que faltam precisam de sinais em tempo real (Saúde/contexto/agenda) ou
de um LLM no backend — e encaixam nos campos e no score que já existem, sem
refazer a interface.
