# Notificações push (Fase 1) — guia de setup

Este é o passo a passo para ligar as notificações do Lume no seu Supabase. O
**código** já está pronto no app; falta só a **configuração** do lado do servidor,
que só você consegue fazer (eu não alcanço seu projeto Supabase deste ambiente).

## Visão geral

```
App (permite + assina) → tabela push_assinaturas → Edge Function enviar-lembretes → Web Push → celular → (espelha no relógio)
```

- **Teste**: um botão no app dispara uma notificação na hora, pra validar tudo.
- **Resumo diário**: um cron chama a função de manhã e envia "Hoje: N tarefas,
  N eventos, N hábitos" pra quem ligou.

## Chaves VAPID (já geradas)

- **Pública** (já está no código, em `src/core/notificacoes/config.ts`):
  `BEfWxgzw9h1n5kD6GQfRFWnhPnK6s4CRQPuoqAv0XN05jqW7JdubyprjPrLFTfTGT7dnh8-7o5ZG0-EcB5kk8uE`
- **Privada** (⚠️ segredo — só no Supabase, nunca no código):
  `h0HufdG4Nf_hWUHCClqJjkzRVIkg5wTigWHwDmn7X6Q`

## Passo 1 — Criar a tabela

No **SQL Editor** do Supabase, rode o bloco novo de `supabase/schema.sql`
(a seção "Notificações push"). Ele cria `push_assinaturas` com RLS por usuário.
(Rodar o `schema.sql` inteiro de novo também funciona — é idempotente.)

## Passo 2 — Definir os segredos da função

Em **Project Settings → Edge Functions → Secrets** (ou via CLI), adicione:

| Segredo | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | `BEfWxgzw9h1n5kD6GQfRFWnhPnK6s4CRQPuoqAv0XN05jqW7JdubyprjPrLFTfTGT7dnh8-7o5ZG0-EcB5kk8uE` |
| `VAPID_PRIVATE_KEY` | `h0HufdG4Nf_hWUHCClqJjkzRVIkg5wTigWHwDmn7X6Q` |
| `VAPID_SUBJECT` | `mailto:mthscorreia.m@gmail.com` |
| `CRON_SECRET` | uma senha aleatória sua (ex.: gere uma longa) |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já vêm por padrão — não precisa criar.

## Passo 3 — Deploy da Edge Function

Com a CLI do Supabase:

```bash
supabase functions deploy enviar-lembretes --no-verify-jwt
```

> `--no-verify-jwt` é necessário porque o cron chama sem token de usuário (ele se
> autentica pelo header `x-cron-secret`). O modo teste continua seguro: valida o
> usuário pelo próprio JWT que o app envia.

## Passo 4 — Testar

1. Abra o Lume **instalado** (tela de início do Android) e **logado**.
2. **Configurações → Notificações → Ligar notificações** → aceite a permissão.
3. Toque em **Enviar notificação de teste**. Deve chegar no celular em segundos —
   e espelhar no Bip 6.

Se não chegar: confira se a permissão foi concedida, se os 3 segredos VAPID estão
certos e se a função foi deployada. Os logs ficam em **Edge Functions → Logs**.

## Passo 5 — Agendar o resumo diário

A função manda o resumo para quem escolheu aquela hora (fuso de Brasília). Rode o
cron **de hora em hora** que a função filtra sozinha. Duas opções:

**a) pg_cron + pg_net** (no SQL Editor; troque a URL e o `CRON_SECRET`):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'lume-lembretes-horario',
  '0 * * * *',                       -- todo minuto 0, de hora em hora
  $$
  select net.http_post(
    url     := 'https://jcvjboqomgrdvigtdjhb.functions.supabase.co/enviar-lembretes',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','SEU_CRON_SECRET'),
    body    := '{}'::jsonb
  );
  $$
);
```

**b)** Qualquer agendador externo (GitHub Actions, cron-job.org…) fazendo um POST
horário para a URL da função com o header `x-cron-secret`.

## Como está montado (referência)

- `src/core/notificacoes/config.ts` — chave pública + preferências.
- `src/core/notificacoes/push.ts` — permissão, assinatura, on/off, teste, prefs.
- `src/core/notificacoes/NotificacoesSheet.tsx` — tela em Configurações → Notificações.
- `public/push-sw.js` — handlers de `push` e clique (injetados no service worker).
- `supabase/functions/enviar-lembretes/index.ts` — envia teste e resumo diário.
- `supabase/schema.sql` — tabela `push_assinaturas` + RLS.

## Limitações honestas (Fase 1)

- **Só funciona com o app instalado** (PWA na tela de início) e **logado**.
- O resumo de hábitos usa uma contagem simples (hábitos ativos ainda sem registro
  hoje) — não aplica ainda a regra de frequência de cada hábito. Refinável depois.
- Lembretes por horário exato de cada item (ex.: remédio às 14h) ficam para uma
  fase seguinte; a Fase 1 entrega o **resumo do dia** + o **teste**.
