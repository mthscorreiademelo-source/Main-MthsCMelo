# Lume no pulso — Wearable, notificações e Quick Actions em todo lugar

> Plano de arquitetura para levar o Lume para fora do celular/tablet: sincronizar
> métricas de saúde do relógio, notificar no celular **e** no relógio, e ter Quick
> Actions (tarefas, eventos, humor, hábitos, finanças…) diretamente no pulso.
>
> Dispositivo-alvo: **Amazfit Bip 6** (Zepp OS 4.5). Nada aqui muda o modelo
> local-first do Lume — o relógio é mais um cliente que fala com a mesma nuvem.

## 1. O que a gente quer (em uma frase cada)

1. **Registrar sozinho** — dados que o relógio já coleta (passos, sono, batimentos,
   SpO₂, estresse, calorias) entram no módulo Saúde do Lume sem digitação.
2. **Avisar onde eu estiver** — notificações no celular e espelhadas/geradas no
   relógio (lembrete de hábito, tarefa vencendo, evento, remédio, conta a pagar).
3. **Agir de qualquer lugar** — uma extensão das Quick Actions: adicionar/completar
   tarefa, evento, humor, hábito ou lançamento financeiro a partir do relógio.

## 2. O que é possível (verificado na doc do Zepp OS)

O Bip 6 roda **Zepp OS 4.5**, o que libera tudo que precisamos (as APIs abaixo
exigem no máximo API_LEVEL 3.0):

| Capacidade | API | Serve para |
|---|---|---|
| Ler sensores no relógio | `HeartRate`, `SLEEP`, passos, `SpO2`, estresse, calorias | Coletar métricas de saúde |
| Rodar em segundo plano | **App Service** (Zepp OS v3+) | Ler e enviar dados periodicamente, sem a tela aberta |
| Falar com a internet | **Fetch API** no *side service* (GET/POST, headers, body) | POST direto na REST do Supabase |
| Ponte relógio ⇄ celular | *Side service* (roda dentro do app Zepp) | Encaminhar dados e autenticação |
| Notificar no relógio | **System Notification** (`@zos/notification`, API 3.0+) | Lembretes com botões que abrem o app/App Service |
| Agendar | **Alarm** (timers persistentes) | Disparar leituras/lembretes na hora certa |
| Vibrar | `Vibrator` | Feedback tátil das ações/alertas |

Distribuição: instala pela **App Store do Zepp** (passa por review) ou em **modo
desenvolvedor** (`zeus-cli` + bridge) para uso pessoal — este último é o caminho
para a gente iterar sem publicar.

> **Limite honesto:** mini apps não fazem streaming 24/7 livre. O modelo real é
> *"App Service acorda de tempos em tempos → lê o acumulado do dia → envia"*. A
> coleta contínua quem faz é o sistema; a gente lê os agregados que ele expõe.

## 3. Arquitetura

Tudo gira em torno da **mesma tabela `documentos` do Supabase** que a sincronização
do Lume já usa. O relógio vira só mais um cliente que lê/escreve nela — quando o
PWA sincroniza, o que veio do relógio aparece, e vice-versa.

```
┌─────────────┐   sensores    ┌──────────────────┐  BLE   ┌────────────────────┐
│  Bip 6      │──────────────▶│  Mini App (relógio)│──────▶│ Side Service (Zepp │
│  (Zepp OS)  │  toques/UI    │  + App Service     │        │  app no celular)   │
└─────────────┘◀──────────────└──────────────────┘◀──────  └─────────┬──────────┘
      ▲  notificações                                                  │ HTTPS (Fetch)
      │                                                                ▼
      │                                            ┌────────────────────────────────┐
      │                                            │  Supabase (REST + Edge Functions)│
      │   push espelhado do celular                │  tabela `documentos` (LWW sync)  │
      │                                            └───────┬───────────────┬─────────┘
      │                                                    │ pull/push      │ pull/push
      │                                            ┌───────▼──────┐  ┌──────▼──────────┐
      └────────── Web Push ◀───────────────────────│  Lume (PWA)  │  │ Companion Android│
                                                   └──────────────┘  └─────────────────┘
```

### Contrato de sincronização que o relógio "fala"

Um cliente REST minúsculo sobre a tabela `documentos`, reaproveitando o modelo
atual (por coleção, `atualizadoEm` para Last-Write-Wins, `user_id` + RLS):

- **Escrever** (criar/completar): `POST /rest/v1/documentos` com
  `{ tabela, id, dados, atualizadoEm, user_id }`. Ex.: marcar hábito → upsert em
  `habitoRegistros`; nova tarefa → insert em `tasks`; humor → `registros`;
  lançamento → `movimentos`.
- **Ler** (o que mostrar no relógio): `GET /rest/v1/documentos?tabela=eq.tasks&...`
  para "tarefas de hoje", hábitos pendentes, próximos eventos.
- **Saúde**: `POST` em `saude` / `saudeMedidas` com os agregados do dia.

Como o relógio escreve no mesmo formato do `engine.ts`, a reconciliação do PWA
absorve tudo naturalmente — **zero mudança no motor de sync**.

### Autenticação do relógio

O *side service* precisa de credencial para o Supabase. Plano:

1. Tela de **Settings App** (página de config do mini app, exibida no app Zepp)
   onde você loga uma vez (e-mail/senha ou cola um token).
2. O side service guarda o token/refresh em *persistent storage* e o renova.
3. Todas as chamadas usam esse token → RLS garante que só mexe nos seus dados.

## 4. Os três pilares em detalhe

### Pilar A — Saúde automática (relógio → Lume)

Dois caminhos, podem coexistir:

- **A1 · No relógio (nativo):** App Service lê os agregados do dia (passos, sono,
  FC de repouso/média, SpO₂, estresse, calorias) 1–3×/dia e faz POST em
  `saude`/`saudeMedidas`. Sem depender de nuvem de terceiros. É o mais "puro".
- **A2 · Via nuvem Zepp (sem código de relógio):** a Zepp já sincroniza para
  **Google Health Connect / Apple Health / Strava**. O **companion Android** do
  Lume lê do Health Connect e envia pro Lume. Mais robusto para histórico, e não
  exige instalar nada no relógio. Existe também a API móvel não-oficial da Zepp
  (estilo `zepp-health-cli`) como plano C, mas é frágil e não recomendada como base.

**Recomendação:** A2 (Health Connect ↔ companion) como espinha dorsal da saúde; A1
como complemento para métricas em tempo quase-real quando o app estiver aberto.

### Pilar B — Notificações (celular + relógio)

- **B1 · Celular (Web Push):** o PWA registra push (VAPID) e uma **Edge Function**
  agenda/dispara os lembretes (hábito do dia, tarefa vencendo, remédio, conta a
  pagar, evento). Funciona no Android (PWA instalado) e no iOS 16.4+ (PWA na tela
  de início). Reaproveita as Edge Functions que já existem.
- **B2 · Relógio (espelho grátis):** o Bip 6 espelha as notificações do celular.
  Ou seja, **todo push do Lume já chega no relógio** sem escrever uma linha.
- **B3 · Relógio (nativo, opcional):** para alertas gerados no próprio relógio
  (ex.: "você bateu a meta de passos", "hora do hábito"), o App Service usa a
  **System Notification** com botões — tocar "Concluir" chama o App Service que faz
  o POST. Fecha o ciclo notificar→agir sem tirar o telefone do bolso.

### Pilar C — Quick Actions no pulso

Uma extensão do launcher de Quick Actions que o Lume já tem, agora no relógio:

- **UI enxuta:** lista de ações favoritas (as mesmas categorias: tarefa, evento,
  humor, hábito, finança). Entrada por toques/rolagem, presets e — onde suportado —
  ditado por voz do relógio.
- **Fluxos:** "marcar hábito ✓", "completar tarefa", "novo lançamento R$", "registrar
  humor 😀→😞", "próximos eventos de hoje".
- **Escrita:** cada ação vira um `POST` no contrato da seção 3 → aparece no Lume na
  próxima sincronização.
- **Atalho de mostrador (tile/app-widget):** um bloco no watchface com 2–3 ações
  de 1 toque (ex.: hábito-âncora e humor), o acesso mais rápido possível.

## 5. Roteiro em fases (menor risco → maior valor primeiro)

| Fase | Entrega | Esforço | Risco |
|---|---|---|---|
| **0** | Confirmar API level do Bip 6 + criar projeto Zepp OS "olá mundo" no relógio, em modo dev | Baixo | Baixo |
| **1** | **Notificações**: Web Push no PWA + Edge Function de lembretes (espelha no relógio de graça) | Médio | Baixo |
| **2** | **Quick Actions no relógio (escrita)**: mini app + side service autenticado → POST em `tasks`/`habitoRegistros`/`registros`/`movimentos` | Médio-alto | Médio |
| **3** | **Saúde via Health Connect** ↔ companion Android → módulo Saúde | Médio | Médio |
| **4** | **App Service + System Notification nativas** no relógio (alertas e ações locais, botão "Concluir") | Alto | Médio |
| **5** | **Leitura no relógio** ("hoje": tarefas/hábitos/eventos) + tile de watchface + saúde nativa (A1) | Alto | Médio |

MVP recomendado = **Fase 1 + Fase 2**: já entrega "me avisa em qualquer lugar" +
"marco/adiciono do pulso". As demais empilham por cima.

## 6. Riscos e verdades inconvenientes

- **Publicação/instalação:** modo dev exige recarregar às vezes; publicar na Zepp
  Store passa por review. Para uso pessoal, dev mode resolve.
- **Background limitado:** nada de coleta contínua livre — leituras periódicas.
- **API móvel da Zepp é não-oficial** e pode quebrar; não deve ser base de nada.
- **Testes:** o relógio e o simulador Zepp não rodam neste ambiente de dev do Lume —
  o código do mini app é escrito aqui e carregado/validado por você no aparelho.
  A iteração da parte de relógio é necessariamente com você no circuito.
- **iOS:** Web Push só em PWA instalado (iOS 16.4+); Health Connect é Android — no
  iPhone o equivalente é Apple Health (muda o companion).

## 7. Decisões (atualizado)

- ✅ **Celular: Android** → saúde via **Google Health Connect** + companion Android.
- ✅ **MVP começa pela Fase 1 (Notificações / Web Push)** — roda dentro do PWA +
  Supabase atuais, sem código de relógio, e o Bip 6 espelha os avisos de graça.
- ⏳ Publicar na Zepp Store vs. só modo dev — decidir quando chegarmos na Fase 2.
- ⏳ Saúde nativa no relógio (A1) — opcional, depois da rota Health Connect (A2).

### Fase 1 — recorte de responsabilidades

**Eu escrevo (no PWA/repo):**
- Service worker: handlers `push` e `notificationclick` (abre a tela certa do Lume).
- Fluxo de assinatura: pedir permissão + `pushManager.subscribe(VAPID)` + salvar a
  subscription no Supabase.
- SQL de uma tabela `push_assinaturas` (com RLS por `user_id`).
- Edge Function `enviar-lembretes`: monta e dispara os pushes (Web Push + VAPID).
- Lógica de "o que avisar e quando" (hábito do dia, tarefa vencendo, remédio, conta,
  evento) + tela de Ajustes para ligar/escolher os lembretes.

**Você configura (no seu Supabase, que não alcanço deste ambiente):**
- Rodar o SQL da tabela nova.
- Definir os segredos `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (eu gero o par).
- Fazer deploy da Edge Function e agendar (pg_cron/Scheduler) a execução periódica.

---

*Este documento é um plano vivo. Nada aqui foi implementado ainda; é o desenho da
arquitetura e do roteiro para levar o Lume ao pulso.*
