# Lume Saúde (app Android companheiro)

App nativo minúsculo que lê o **Health Connect** ("Conexão Saúde", no seu Xiaomi)
e envia os dados de saúde direto para a nuvem do Lume (Supabase). Sem planilha,
sem passo manual: você entra uma vez, concede a permissão de saúde e ele passa a
sincronizar sozinho em segundo plano.

## O que ele lê
- Passos
- Sono (minutos)
- Calorias ativas (kcal)
- Frequência cardíaca de repouso
- Exercício (minutos)

Cada dia vira um registro na coleção `saude` (mesma que o Lume web usa). O motor
de sincronização do Lume puxa esses dias por LWW — nada muda no lado web.

## Como instalar
1. Baixe o `app-debug.apk` gerado pelo GitHub Actions
   (aba **Actions → Android (Lume Saúde) → artifact `lume-saude-debug`**).
2. Copie para o tablet e abra o APK (permita "instalar de fontes desconhecidas").
3. Abra o **Lume Saúde**, entre com o mesmo e-mail/senha do Lume.
4. Toque em **Conectar Saúde** e conceda as permissões na tela do Health Connect.
5. Toque em **Sincronizar agora** (a primeira vez traz os últimos 30 dias).

Depois disso o `SyncWorker` roda em segundo plano a cada ~3h. Abrir o app e tocar
em "Sincronizar agora" força uma atualização na hora.

## Compilar localmente (opcional)
```
cd android
gradle assembleDebug   # precisa do Android SDK + JDK 17
```
