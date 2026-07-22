# Configurar a nuvem do Lume (Supabase)

O Lume funciona 100% offline sem isto. Este passo **liga a conta e a
sincronização** entre seus aparelhos. Leva ~10 minutos e só precisa ser feito
uma vez. Enquanto não estiver configurado, o app continua exatamente como hoje
(local-first, sem conta).

## 1. Criar o projeto

1. Acesse <https://supabase.com> e entre (pode ser com sua conta Google).
2. **New project** → dê um nome (ex.: `lume`), defina uma senha de banco
   (guarde-a) e escolha a região mais perto de você (ex.: São Paulo).
3. Espere alguns minutos até o projeto ficar pronto.

## 2. Rodar o schema

1. No projeto, abra **SQL Editor** (menu lateral).
2. Cole o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e clique
   em **Run**. Isso cria a tabela de dados, as regras de segurança e o
   armazenamento de arquivos.

## 3. Ligar o login por e-mail

O provedor de **e-mail já vem ligado** no Supabase — não precisa de Google
Cloud Console nem de nada externo. Só um ajuste opcional para ficar instantâneo:

1. Menu **Authentication → Providers → Email**: confirme que está **Enabled**.
2. Para não precisar clicar num link de confirmação a cada cadastro (é seu
   app pessoal), desligue **"Confirm email"** nesse mesmo painel. Assim, ao
   criar a conta você já entra direto. _(Se preferir manter a confirmação
   ligada, tudo bem — você só confirma o e-mail uma vez.)_

> Login com Google pode ser adicionado depois, quando você quiser — aí sim
> precisaria do passo do Google Cloud Console.

## 4. Pegar as chaves e me passar

Menu **Project Settings → API**. Copie:

- **Project URL** (ex.: `https://SEU-PROJETO.supabase.co`)
- **anon public** key (a chave `anon`, pública — pode aparecer no site sem
  risco; a segurança vem das regras por linha que o schema criou)

> ⚠️ **Nunca** use a chave `service_role` no app/site — ela ignora a segurança.
> Só a `anon public` entra aqui.

Duas formas de aplicar:

**A) Você me passa os dois valores** e eu configuro o build. _(mais simples)_

**B) Você adiciona como segredos do repositório** (Settings → Secrets and
variables → Actions → New repository secret):

- `VITE_SUPABASE_URL` = a Project URL
- `VITE_SUPABASE_ANON_KEY` = a chave anon public

O deploy passa a injetá-las automaticamente. Para rodar localmente, crie um
arquivo `.env.local` na raiz com as mesmas duas linhas:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=coloque-a-chave-anon-aqui
```

## Pronto

Com isso configurado, aparece a seção **Conta** na barra lateral do Lume para
entrar com o Google. A sincronização dos dados entra na sequência.

## Anexos na nuvem (fotos, PDFs, desenhos, arquivos de livro)

Por padrão, o Lume sincroniza **dados** (texto, números, metadados) entre os
aparelhos, mas os **arquivos binários** (imagens de desenho, PDFs, anexos de
nota, capas/arquivos de livro, fotos de pet) ficam **só no aparelho** — no outro
aparelho a referência aparece sem o conteúdo. O código para sincronizá-los pelo
**Supabase Storage** já está pronto, mas vem **desligado** até você criar o
depósito (bucket) e validar. Passos:

**1. Crie o bucket.** No painel do Supabase → **Storage** → **New bucket**:
- Nome: `anexos`
- **Private** (não marque "Public").

**2. Aplique as policies** (Storage → Policies, ou SQL Editor). Elas garantem
que cada usuário só acessa a própria pasta (`anexos/{seu-id}/…`):

```sql
-- Ler os próprios anexos
create policy "anexos: ler os meus"
on storage.objects for select to authenticated
using ( bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text );

-- Enviar/atualizar os próprios anexos
create policy "anexos: enviar os meus"
on storage.objects for insert to authenticated
with check ( bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text );

create policy "anexos: atualizar os meus"
on storage.objects for update to authenticated
using ( bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text );

-- Apagar os próprios anexos
create policy "anexos: apagar os meus"
on storage.objects for delete to authenticated
using ( bucket_id = 'anexos' and (storage.foldername(name))[1] = auth.uid()::text );
```

**3. Ligue o recurso.** Em `src/core/nuvem/sync/colecoes.ts`, troque
`export const ANEXOS_ATIVO = false` para `true` e faça o deploy. (Me avise que
eu troco e valido junto — vale testar em dois aparelhos: criar um desenho num,
confirmar que a imagem aparece no outro.)

Enquanto `ANEXOS_ATIVO` estiver `false`, **nada muda**: os blobs continuam
locais e o backup JSON segue sendo a forma de levá-los para outro aparelho.
Custo: o Storage do Supabase inclui **1 GB grátis**, suficiente para uso pessoal.

## IA na Captura Rápida (Gemini grátis, opcional)

A Captura Rápida entende texto por heurística (offline, sempre). Dá para
turbiná-la com IA de graça: uma Edge Function chama o **Google Gemini** (tier
gratuito) e devolve uma interpretação melhor — que você ainda confirma. Fica
**desligada** até você publicar a função; se ela falhar/estiver off, o app cai
na heurística (zero regressão).

**1. Pegue uma chave grátis do Gemini** em https://aistudio.google.com/apikey
(botão *Create API key* → **Create API key in a new project**, para o projeto ser
elegível ao tier gratuito). O tier gratuito cobre uso pessoal com folga.

> Modelo: a função usa `gemini-flash-latest` por padrão — um apelido que sempre
> aponta pro flash atual, então não quebra quando o Google descontinua uma
> versão. Se quiser fixar outro, crie o segredo `GEMINI_MODEL`.

**2. Publique a função** (precisa do [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase login                       # abre o navegador uma vez
supabase link --project-ref SEU_REF  # o ref está na URL do seu projeto
supabase secrets set GEMINI_API_KEY=coloque-sua-chave-aqui
supabase functions deploy interpretar
```

(O código da função já está no repositório em `supabase/functions/interpretar/`.
Ela verifica o login do usuário automaticamente — só quem está logado chama.)

**3. Ligue no app:** em `src/core/captura/ia.ts`, troque
`export const IA_CAPTURA_ATIVA = false` para `true` e faça o deploy. (Me avise
que eu troco e a gente testa: digitar "reunião com a Ana quinta 15h, cobrar
R$200" deve virar um evento certinho.)

Custo: a Edge Function é grátis (500k invocações/mês) e o Gemini free também —
para uso pessoal, **R$0/mês**.

## IA nos Insights (observações em linguagem natural, opcional)

Além da Captura Rápida, dá para deixar os **insights/observações** do app serem
redigidos por IA — sempre em cima dos **números reais** calculados no aparelho
(a IA só redige, não inventa) e com **cache** para não estourar o free tier.
Desligado até publicar a função `insights`.

1. Publique a segunda função (mesmo fluxo da `interpretar`, pelo painel ou CLI):
   o código está em `supabase/functions/insights/`. Reutiliza o mesmo segredo
   `GEMINI_API_KEY`.
2. Ligue no app: em `src/core/ia/insights.ts`, troque `IA_INSIGHTS_ATIVA = false`
   para `true` e faça o deploy. (Me avise que eu troco.)

Cache: cada observação é gerada no máximo a cada 6h (ou ao regenerar), então um
usuário pessoal faz pouquíssimas chamadas/dia — segue **grátis** no free tier.
