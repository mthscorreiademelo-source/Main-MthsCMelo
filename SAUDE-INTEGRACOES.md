# Saúde — integrações futuras (arquitetura)

> Documento de planejamento. O módulo Saúde já é um **prontuário pessoal**
> completo com entrada manual + anexos (fotos/PDF). Este documento descreve as
> integrações que dependem de infra/IA que o Lume ainda não tem, e como a
> estrutura atual foi pensada para acomodá-las sem retrabalho.

## Princípios

- **Opt-in e gated**, como Open Finance e a sincronização em nuvem: quem não
  ativar, segue com o prontuário 100% manual e local-first.
- **Nunca diagnóstico** — só observações e correlações, sempre com período
  analisado, nº de dados e nível de confiança (já é assim nos insights).
- O **modelo de dados atual não muda** para receber essas integrações: elas só
  *preenchem/atualizam* as tabelas que já existem (`saude`, `saudeMedidas`,
  `atividades`, `refeicoes`, `exames`, `medicamentos`, `consultas`, `vacinas`,
  `doacoesSangue`). Cada registro ganhará apenas um campo `origem` (ex.:
  `'manual' | 'appleHealth' | 'garmin' | 'ocr' | 'ia'`) para rastreio e dedup.

## 1. Reconhecimento de comida por foto (IA)

Hoje: registro manual de refeição + **foto anexada** (guardada em `arquivos`).

Futuro: ao anexar a foto, um serviço de visão identifica alimentos, porções e
estima calorias/macros; o usuário **confirma**. Requer backend + modelo de
visão (não roda offline no PWA).

- **Arquitetura:** Edge Function `/saude/foto-refeicao` recebe a imagem, chama
  um provedor de reconhecimento nutricional (ex.: LogMeal, Foodvisor, Nutritionix
  ou um modelo próprio) e devolve `{alimentos[], calorias, proteinaG, ...}`.
- **Encaixe:** o resultado só **pré-preenche** o `EditorRefeicao` atual; nada
  muda no schema. Campo `origem: 'ia'` e `confianca`.
- **Privacidade:** a foto sai do aparelho só se o usuário ativar o recurso.

## 2. OCR de exames (PDF/imagem → valores)

Hoje: exame com **PDF/imagem anexado** + valores digitados à mão; histórico e
gráfico por marcador já funcionam.

Futuro: extrair automaticamente marcadores, valores, unidades e faixas de
referência do PDF do laboratório.

- **Arquitetura:** Edge Function `/saude/ocr-exame` (OCR + parsing por layout de
  laboratório, ou um LLM com o texto extraído). Retorna uma lista de
  `Exame` candidatos para o usuário revisar.
- **Encaixe:** cria vários `exames` com `marcador` já preenchido → o gráfico de
  evolução por marcador (que já existe) passa a se montar sozinho. `origem:'ocr'`.

## 3. Wearables e dispositivos

Hoje: entrada manual + import CSV/planilha + a ponte **Health Connect** do app
Android companion (já envia sono/passos/calorias/FC/exercício).

Futuro: sincronização direta com **Apple Health, Garmin, Fitbit, Whoop, Oura**,
**balanças inteligentes**, **glicosímetros** e **medidores de pressão**.

- **Apple Health / Health Connect:** via apps nativos (companion) — leem no
  aparelho e enviam para a nuvem; o web só consome. Já temos o caminho no
  Android; iOS seguiria o mesmo padrão (HealthKit → nuvem).
- **Garmin/Fitbit/Whoop/Oura:** APIs de nuvem com **OAuth** — exigem backend
  para guardar tokens e receber webhooks (mesmo padrão do Open Finance).
  Edge Functions `/saude/wearable/connect|callback|webhook`.
- **Balanças/glicosímetros/pressão:** ou via o app do fabricante → Health
  Connect/HealthKit, ou **Web Bluetooth** para leitura direta no navegador
  (quando suportado).
- **Encaixe:** cada fonte grava nas tabelas existentes (`saude`, `saudeMedidas`,
  `atividades`) com `origem`. Dedup por (data, tipo, origem).

## 4. Interpretação e comparação de exames por IA

Futuro: além do gráfico por marcador, um resumo em linguagem natural
("seu colesterol caiu e voltou à faixa desde o último exame"), **sempre como
observação, nunca diagnóstico**, com período e confiança.

- **Arquitetura:** Edge Function que recebe a série do marcador e devolve um
  texto factual. Encaixa no cartão de **Insights** que já existe.

## 5. Compartilhamento temporário do prontuário

Futuro: gerar um **link/token temporário** (ou PDF) para compartilhar com um
médico um recorte do prontuário (exames + medicamentos + consultas de um
período), com expiração.

- **Arquitetura:** Edge Function que monta uma visão somente-leitura assinada e
  expira em N horas/dias; nada é público por padrão. LGPD: consentimento
  explícito, escopo mínimo, expiração e revogação.

## Roadmap sugerido

1. **origem/dedup:** adicionar `origem` aos registros de Saúde (campo opcional,
   retrocompatível) e a lógica de deduplicação por fonte.
2. **Wearables via companion** (Apple Health/Health Connect) — reaproveita a
   ponte que já existe.
3. **OCR de exames** — maior ganho de tempo com o menor risco clínico.
4. **Wearables de nuvem** (Garmin/Fitbit/…): OAuth + webhooks (backend).
5. **Foto-comida por IA** e **interpretação de exames** — camada de IA.
6. **Compartilhamento com médicos** — visão assinada e temporária.

## Segurança & LGPD

- Dados de saúde são **sensíveis**: qualquer envio para fora do aparelho é
  opt-in, com escopo mínimo, e some ao desconectar (política de retenção).
- Tokens de wearables/serviços vivem **só no backend** (Vault), como no Open
  Finance.
- O prontuário local continua funcionando sem nenhuma dessas integrações.

---

**TL;DR:** o prontuário já está estruturado (tabelas + anexos + gráficos por
marcador + linha do tempo). As integrações futuras apenas **alimentam** essas
tabelas via um backend fino + serviços de IA/OCR/wearables, sempre opt-in e sem
mudar as telas — exatamente como o Open Finance faz para as Finanças.
