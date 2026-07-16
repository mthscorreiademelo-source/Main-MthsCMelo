package com.lume.saude

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Faz a sincronização em segundo plano: renova a sessão, lê o Health Connect e envia ao Supabase. */
class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

  override suspend fun doWork(): Result {
    val prefs = Prefs(applicationContext)
    val refresh = prefs.refresh ?: return Result.success()

    if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) {
      return Result.success()
    }
    val client = HealthConnectClient.getOrCreate(applicationContext)
    val concedidas = client.permissionController.getGrantedPermissions()
    if (!concedidas.containsAll(Health.PERMISSOES)) return Result.success()

    return try {
      val sessao = Supa.refresh(refresh)
      prefs.salvar(sessao)
      val rows = Health.coletar(client, sessao.uid, dias = 8)
      Supa.upsert(sessao.access, rows)
      prefs.ultimaSync = System.currentTimeMillis()
      Result.success()
    } catch (e: Exception) {
      Result.retry()
    }
  }

  companion object {
    private const val NOME = "lume-sync"

    /** Agenda a sincronização periódica (a cada ~3h) enquanto houver sessão. */
    fun agendar(ctx: Context) {
      val req = PeriodicWorkRequestBuilder<SyncWorker>(3, TimeUnit.HOURS)
        .build()
      WorkManager.getInstance(ctx)
        .enqueueUniquePeriodicWork(NOME, ExistingPeriodicWorkPolicy.UPDATE, req)
    }

    fun cancelar(ctx: Context) {
      WorkManager.getInstance(ctx).cancelUniqueWork(NOME)
    }
  }
}
