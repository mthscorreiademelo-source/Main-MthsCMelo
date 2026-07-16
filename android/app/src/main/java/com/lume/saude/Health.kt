package com.lume.saude

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.reflect.KClass

/** Lê o Health Connect e monta linhas prontas para a tabela `documentos`. */
object Health {
  val PERMISSOES: Set<String> = setOf(
    HealthPermission.getReadPermission(StepsRecord::class),
    HealthPermission.getReadPermission(SleepSessionRecord::class),
    HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    HealthPermission.getReadPermission(RestingHeartRateRecord::class),
    HealthPermission.getReadPermission(ExerciseSessionRecord::class),
  )

  private class Acc {
    var sonoMin = 0.0
    var passos = 0.0
    var cal = 0.0
    var exMin = 0.0
    var fcSum = 0.0
    var fcN = 0
    var algum = false
  }

  private suspend fun <T : Record> lerTudo(
    client: HealthConnectClient,
    tipo: KClass<T>,
    range: TimeRangeFilter,
    onRec: (T) -> Unit,
  ) {
    var token: String? = null
    do {
      val resp = client.readRecords(
        ReadRecordsRequest(recordType = tipo, timeRangeFilter = range, pageToken = token),
      )
      resp.records.forEach(onRec)
      token = resp.pageToken
    } while (!token.isNullOrEmpty())
  }

  suspend fun coletar(client: HealthConnectClient, uid: String, dias: Long): JSONArray {
    val zone = ZoneId.systemDefault()
    val inicio = LocalDate.now(zone).minusDays(dias - 1).atStartOfDay(zone).toInstant()
    val range = TimeRangeFilter.between(inicio, Instant.now())
    fun dia(i: Instant): String = i.atZone(zone).toLocalDate().toString()

    val mapa = HashMap<String, Acc>()
    fun acc(d: String) = mapa.getOrPut(d) { Acc() }

    lerTudo(client, StepsRecord::class, range) { r ->
      val a = acc(dia(r.startTime)); a.passos += r.count.toDouble(); a.algum = true
    }
    lerTudo(client, ActiveCaloriesBurnedRecord::class, range) { r ->
      val a = acc(dia(r.startTime)); a.cal += r.energy.inKilocalories; a.algum = true
    }
    lerTudo(client, SleepSessionRecord::class, range) { r ->
      val a = acc(dia(r.endTime)); a.sonoMin += Duration.between(r.startTime, r.endTime).toMinutes().toDouble(); a.algum = true
    }
    lerTudo(client, ExerciseSessionRecord::class, range) { r ->
      val a = acc(dia(r.startTime)); a.exMin += Duration.between(r.startTime, r.endTime).toMinutes().toDouble(); a.algum = true
    }
    lerTudo(client, RestingHeartRateRecord::class, range) { r ->
      val a = acc(dia(r.time)); a.fcSum += r.beatsPerMinute.toDouble(); a.fcN += 1; a.algum = true
    }

    val agora = System.currentTimeMillis()
    val rows = JSONArray()
    for ((data, a) in mapa) {
      if (!a.algum) continue
      val doc = JSONObject().put("id", data).put("data", data).put("criadoEm", agora).put("atualizadoEm", agora)
      if (a.sonoMin > 0) doc.put("sonoMin", Math.round(a.sonoMin))
      if (a.passos > 0) doc.put("passos", Math.round(a.passos))
      if (a.cal > 0) doc.put("caloriasAtivas", Math.round(a.cal))
      if (a.exMin > 0) doc.put("exercicioMin", Math.round(a.exMin))
      if (a.fcN > 0) doc.put("fcRepouso", Math.round(a.fcSum / a.fcN))
      rows.put(
        JSONObject()
          .put("user_id", uid)
          .put("colecao", "saude")
          .put("id", data)
          .put("doc", doc)
          .put("deleted", false),
      )
    }
    return rows
  }
}
