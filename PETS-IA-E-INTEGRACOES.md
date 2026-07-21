# Pets — IA, integrações e futuro

Este documento registra o que o módulo **Pets** já faz de verdade hoje, e o que
está desenhado para quando o Lume ganhar sua infraestrutura de IA e os módulos
que ainda não existem. A regra do Lume vale aqui também: **nada é fake**. O que
está no app funciona com dados reais que o tutor registrou; o que depende de
infra futura está descrito aqui, não simulado na interface.

---

## O que já existe (real, offline, local-first)

Cada pet é um **Workspace** modular — como Projetos ou Biblioteca. O tutor monta
os cards que fazem sentido (adicionar, ocultar, reordenar, recolher). Cards:

- **Cuidados de hoje** — checklist diário por pet (template por espécie), com
  marcação por dia. Alimenta o dashboard **Hoje** (pendências do dia).
- **Próximos compromissos** — eventos do pet que **também vivem na Agenda
  principal** (mesma fonte; `Evento.petId`).
- **Carteira de vacinação** — vacinas aplicadas + próxima dose. Agendar a
  próxima dose **cria automaticamente um evento na Agenda**.
- **Histórico veterinário** — linha do tempo do prontuário (consultas, exames,
  cirurgias, diagnósticos, receitas, observações). Custo lançado **vai para
  Finanças** vinculado ao pet.
- **Alimentação e estoque** — ração/comida principal + itens. A estimativa de
  "dura ~N dias" é **aritmética pura** (pacote ÷ consumo diário × dias abertos).
- **Saúde** — histórico de peso com gráfico, faixa ideal, alergias/condições e
  medicamentos contínuos.
- **Documentos** — anexos (carteira, receitas, exames, plano, pedigree, nota
  fiscal), guardados localmente. Prontos para aparecer também num hub central
  de Documentos quando ele existir.
- **Gastos** — lançados como movimentos de **Finanças** (`Movimento.petId`),
  com quebra por categoria. Fonte única: aparecem nos dois lugares.
- **Fotos** — álbum local por pet.
- **Insights** — leituras **heurísticas e honestas** (ver abaixo).

### Insights heurísticos (o "IA" de hoje)

`gerarInsights()` só interpreta o que foi registrado — datas, pesos, estoque.
Exemplos gerados: "A ração dura aproximadamente mais 9 dias", "Próxima vacina
em 18 dias", "Faz 6 meses desde a última consulta", "O peso permanece estável há
cerca de 5 meses", "O peso está dentro da faixa ideal". **Nunca** há diagnóstico;
a interface diz explicitamente que são observações e que, na dúvida, o
veterinário decide.

### Integrações já ligadas

| Módulo | Como conecta hoje |
|--------|-------------------|
| **Agenda** | Vacinas e compromissos do pet criam `Evento` com `petId` e categoria; aparecem na Agenda principal. |
| **Finanças** | Gastos e custos de consulta viram `Movimento` com `petId`; contam no mês e no orçamento. |
| **Hoje** | `SecaoHoje` (cuidados pendentes por pet) + `HojeResumo` (tile de contagem). |
| **Hábitos** | Os cuidados diários reusam a mecânica de checklist; `PetCuidado.habitoId` reserva o vínculo 1:1 com um hábito global. |

Tudo isso sincroniza pela nuvem (as tabelas `pet*` estão no motor de sync);
os **blobs** (fotos/documentos) ficam locais, como os arquivos da Biblioteca,
até a etapa de Storage.

---

## Futuro que depende de IA real (LLM/infra)

Quando o Lume tiver o backend de IA, o card **Insights** ganha uma camada
generativa — sempre por cima dos dados reais, sempre com a ressalva de que não
substitui o veterinário:

1. **Resumo em linguagem natural do pet** — "O Oli está estável, com vacinas em
   dia; a ração acaba na próxima semana e faz ~6 meses desde a última consulta."
2. **Previsão de consumo** a partir do histórico real de reposições (não da
   conta fixa de hoje): aprende o ritmo de gasto de ração/areia/antipulgas.
3. **OCR de documentos** — ler a carteira de vacinação enviada e **preencher
   automaticamente** vacinas, datas e validades (hoje é manual).
4. **Leitura de fotos** — estimar porte/condição corporal a partir de fotos ao
   longo do tempo, **como observação**, nunca diagnóstico.
5. **Triagem de sintomas** — o tutor descreve algo; a IA organiza perguntas e
   **sempre** encaminha ao veterinário, sem afirmar doença.
6. **Lembretes inteligentes** — "compre ração antes de sexta", cruzando estoque,
   Agenda e horários de pet shop.

Nenhum desses aparece na UI hoje — para não fingir capacidade que não temos.

---

## Módulos do Lume que ainda vão nascer

O Workspace já foi desenhado para se conectar a eles assim que existirem:

- **Pessoas** — veterinário, adestrador, pet sitter, hotel, creche, passeador.
  Hoje esses nomes são texto livre em consultas/vacinas; passarão a ser
  `pessoaId` com contato, histórico e atalho de ligação/mensagem.
- **Lugares** — parques, pet shops, clínicas, hospitais. Ganharão mapa,
  favoritos e vínculo com compromissos (`local` → `lugarId`).
- **Documentos** — hub central. Os documentos do pet já são um modelo separado
  (`petDocumentos` + blob), prontos para espelhar nesse hub **sem duplicar**.

---

## Compartilhamento temporário (desenho)

Objetivo: dar a um terceiro (veterinário, hotel, creche, familiar) uma visão
**parcial e temporária** do pet, com permissões específicas.

- **Escopos** por card: rotina/cuidados, medicamentos, vacinas, alimentação,
  contatos de emergência — cada um ligado/desligado.
- **Acesso somente leitura** por padrão, com validade (ex.: enquanto durar a
  hospedagem) e revogação a qualquer momento.
- **Como**: link/token temporário assinado (depende do backend de contas que já
  existe para o sync). Um "cartão do pet" público-limitado, sem expor o resto do
  Lume do tutor.

Enquanto o backend de compartilhamento não existe, o botão **Compartilhar** no
Workspace apenas explica o que virá — não simula um envio.

---

## Notas de modelo de dados

- Schema Dexie **v21**. Tabelas sincronizadas: `pets`, `petPesos`, `petVacinas`,
  `petConsultas`, `petCondicoes`, `petMedicamentos`, `petAlimentos`, `petItens`,
  `petCuidados`, `petCuidadoRegistros`, `petFotos`, `petDocumentos`. Blobs em
  `petArquivos` (local).
- O layout modular do Workspace vive em `Pet.modulos` (sincroniza junto).
- Vínculos cross-módulo: `Evento.petId` (Agenda) e `Movimento.petId` (Finanças).
- Exclusão de um pet remove em cascata seus registros, blobs, eventos e gastos
  vinculados.
