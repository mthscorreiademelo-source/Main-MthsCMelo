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

## 3. Ligar o login com Google

1. Menu **Authentication → Providers → Google** → **Enable**.
2. Você precisa de um _OAuth Client ID_ do Google:
   - Vá em <https://console.cloud.google.com> → **APIs & Services →
     Credentials → Create credentials → OAuth client ID → Web application**.
   - Em **Authorized redirect URIs**, cole a URL que o Supabase mostra na
     tela do provedor Google (algo como
     `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
   - Copie o **Client ID** e o **Client secret** de volta para o Supabase e
     salve.
3. Menu **Authentication → URL Configuration → Redirect URLs**: adicione
   - `https://mthscorreiademelo-source.github.io/Main-MthsCMelo/`
   - `http://localhost:5173/Main-MthsCMelo/` (para desenvolvimento)

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
