# Lume (app Android)

App Android único do Lume. Um WebView abre o Lume web completo (toda a interface,
conta e sincronização) e, por baixo, uma ponte nativa lê o **Health Connect**
("Conexão Saúde", no seu Xiaomi) e envia os dados de saúde para a nuvem do Lume
(Supabase). Um ícone só: você usa o Lume normalmente e a saúde entra sozinha.

## O que ele lê do Health Connect
- Passos
- Sono (minutos)
- Calorias ativas (kcal)
- Frequência cardíaca de repouso
- Exercício (minutos)

Cada dia vira um registro na coleção `saude` — a mesma que o Lume web usa. O motor
de sincronização do Lume puxa esses dias por LWW.

## Como a conta funciona
Você entra **uma vez** na tela de login do próprio Lume (dentro do app). Esse login
é repassado ao lado nativo, que mantém a **sua própria sessão** do Supabase — assim
o `SyncWorker` sincroniza a saúde em segundo plano (a cada ~3h) mesmo com o app
fechado, sem conflitar com a sessão do WebView.

Na página **Saúde** (só dentro do app) aparecem os botões **Conectar Saúde**
(concede a permissão do Health Connect) e **Sincronizar agora**.

## Como instalar
1. Baixe o `app-debug.apk` gerado pelo GitHub Actions
   (aba **Actions → "Android (Lume Saúde)" → artifact `lume-saude-debug`**).
2. Copie para o aparelho e abra o APK (permita "instalar de fontes desconhecidas").
3. Abra o **Lume**, entre com seu e-mail/senha.
4. Vá em **Saúde → Conectar Saúde** e conceda as permissões do Health Connect.
5. Toque em **Sincronizar agora** (a primeira vez traz os últimos 30 dias).

Depois disso o `SyncWorker` roda em segundo plano a cada ~3h.

## Compilar localmente (opcional)
```
cd android
gradle assembleDebug   # precisa do Android SDK + JDK 17
```
