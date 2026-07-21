# Compras + Despensa Inteligente — IA, integrações e roadmap

Este documento registra o que o módulo **Compras** já faz de verdade hoje
(Fase 1) e o que está desenhado para as fases seguintes, que dependem da
infraestrutura de IA do Lume. A regra de sempre vale: **nada é fake**. O que
está na interface funciona com dados reais que o usuário registrou; o que
depende de OCR, visão computacional, código de barras ou geolocalização está
descrito aqui e sinalizado na UI como "em breve" — não simulado.

---

## Filosofia

> O usuário compra. O Lume registra. O Lume aprende os padrões de consumo.
> O Lume antecipa quando algo provavelmente vai acabar.

O objetivo não é controle de estoque obsessivo e manual — é **reduzir o
trabalho** com o tempo. O sistema começa com dados imperfeitos e melhora.
A pergunta central da página: *o que está acabando, o que preciso comprar e
como isso afeta minha rotina e meu orçamento?*

---

## Fase 1 — implementado (real)

Quatro seções modulares (reordenáveis, ocultáveis, recolhíveis via
*Personalizar*):

1. **Sugestões — "O que provavelmente está acabando?"**
   Heurística sobre a despensa: dias restantes (quantidade estimada ÷ consumo
   diário) e/ou intervalo médio entre compras. Cada sugestão traz **nível de
   confiança** (alta / moderada / poucos dados) e **linguagem cuidadosa**
   ("aproximadamente", "pode estar perto do fim"). Ações: *Adicionar à lista*,
   *Ainda tenho* (feedback bastante/metade/pouco/exato → recalibra), *Ignorar
   por enquanto*. **Nunca** adiciona nada sem confirmação.
2. **Lista de compras** — múltiplas listas por contexto (Mercado, Farmácia, Pet
   Shop, Casa + personalizadas). Item com quantidade, categoria, prioridade,
   preço estimado, **origem** (manual/IA/despensa/pet/…). Ações: comprar, mover,
   adiar, remover, transformar em aquisição. **Marcar como comprado** pergunta
   quantidade/valor/loja/data e pode, numa tacada: atualizar a despensa,
   registrar a despesa em Finanças, sair da lista e realimentar a previsão.
   **Modo mercado** em tela cheia: itens agrupados por corredor, checkboxes
   grandes, total estimado × total real conforme os preços são digitados.
3. **Despensa inteligente** — estoque amplo (comida, higiene, limpeza, pet,
   remédios, escritório…). Cadastro em **três formas**: quantidade exata, nível
   aproximado (cheio/metade/pouco…) ou só "tenho em casa". Barra de estoque,
   local, validade, previsão. Ajustes rápidos: +/−, abrir, acabou, descarte,
   favoritar. **Página de detalhe** com histórico de compras/ajustes, intervalo
   médio, preço médio, previsão de reposição e confiança.
4. **Aquisições planejadas** — itens caros/complexos com status
   (desejo → pesquisando → … → comprado), valor esperado, e **histórico de
   preços** (menor preço visto em destaque).

**Integrações reais já ligadas:** Finanças (`Movimento.petId` e categorias),
Pets (`ItemDespensa.petId` — ração etc.), Hoje (`SecaoHoje` "provavelmente
acabando" + tile), e o vínculo lista ↔ Agenda (`ListaCompra.eventoId`). Tudo
sincroniza; o backup inclui todas as tabelas `compras*`, `despensa*` e
`aquisicoes*`.

### O modelo de previsão (honesto)

Usa o que estiver disponível: datas e quantidades das compras, tamanho de
embalagem, data de abertura, nível informado e feedback do usuário. Deriva
**intervalo médio** entre compras e **consumo diário**. Confiança: ≥3 compras =
alta; 2 = moderada; menos = "poucos dados", com frase cuidadosa. **Sempre
estimativa, nunca certeza.** Fatores como nº de pessoas na casa, sazonalidade e
troca de marca estão previstos no modelo (`ComprasConfig.pessoasNaCasa`) e serão
incorporados conforme houver dados.

---

## Fase 2 — depende de IA/infra

- **Leitura de nota fiscal (OCR + IA)** — foto/PDF/NFC-e → estabelecimento,
  data, total, itens, quantidade, preço unitário, desconto, categoria. Tela de
  conferência item a item, com escolha por item: atualizar estoque / registrar
  em Finanças / tirar da lista / relacionar a Pet/Saúde/Projeto. Uma importação,
  vários efeitos.
- **Foto de produto** — fotografar a embalagem; a IA tenta nome, marca,
  categoria, volume/peso, unidade, código de barras. **Tela de confirmação
  obrigatória** antes de salvar.
- **Histórico de preços por produto** e **validade com alertas** (a estrutura de
  dados já existe; a captura em massa vem com OCR).
- **Localização dentro de casa** e integração mais profunda com **Pets** e
  **Saúde** (medicamentos/suplementos — nunca sugerir uso, só reposição).

## Fase 3 — avançado

- **Reconhecimento de vários produtos numa foto** (bancada/sacola/armário) →
  lista de revisão.
- **Código de barras** (o botão já existe no modo mercado, desabilitado).
- **Geolocalização + Lugares**: ao chegar num mercado/farmácia/pet shop, sugerir
  abrir a lista certa — opt-in, respeitando privacidade.
- **Aprendizado de marcas e substituições** ("Camil substitui o Tio João
  habitual?"), automações de reposição (opt-in) e integração com **receitas**
  (Notas) → ingredientes na lista.

---

## Integrações com o resto do Lume

| Módulo | Hoje | Planejado |
|--------|------|-----------|
| **Finanças** | compra → `Movimento` com categoria/pet; aquisição → despesa | herdar forma de pagamento, documento; aviso de impacto na margem diária (sem impedir) |
| **Pets** | item da despensa com `petId` (ração, antipulgas…) | unificar 1:1 com o estoque de itens do Workspace do Pet (`petItens`), sem duplicação |
| **Agenda** | `ListaCompra.eventoId` (lista ligada a um evento) | destacar a lista no Hoje ao se aproximar do evento/lugar |
| **Saúde** | vínculo de medicamentos/suplementos (`saudeVinculo`) | alerta de reposição; nunca sugerir uso ou alterar tratamento |
| **Projetos / Lugares / Notas** | `projetoId` reservado no modelo | itens de projeto no Workspace; lojas em Lugares; receita→ingredientes |

### Unificação com `petItens` (dívida técnica consciente)

O Workspace do Pet já tem um estoque próprio (`petItens`, do módulo Pets) e o
Compras tem a `despensa` com `petId`. Hoje eles coexistem. A meta é ter **uma
fonte única**: a `despensa` com `petId` passa a ser a verdade, e o card de
estoque do Pet a lê — eliminando a duplicação. Fica para uma fase de
consolidação para não desestabilizar o módulo Pets já publicado.

---

## Privacidade e controle

Fotos, notas fiscais, hábitos de consumo e dados financeiros são **privados**.
O usuário controla o que entra na IA, quais integrações ficam ativas, o uso de
localização, o armazenamento de imagens e a exclusão de histórico. Nada sai do
aparelho sem autorização — e a sincronização em nuvem é opt-in, como no resto do
Lume.

---

## Critério de sucesso

A aba cumpre seu objetivo quando o usuário **deixa de depender da própria
memória** para saber o que comprar: o Lume sugere → o usuário confirma → a lista
aparece na hora certa → a compra atualiza estoque e Finanças → o sistema aprende
e melhora a próxima previsão.
