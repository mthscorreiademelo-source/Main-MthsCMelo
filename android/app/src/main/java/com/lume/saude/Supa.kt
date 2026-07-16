package com.lume.saude

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/** Cliente REST mínimo do Supabase (login + upsert na tabela `documentos`). */
object Supa {
  const val URL = "https://jcvjboqomgrdvigtdjhb.supabase.co"
  const val ANON = "sb_publishable_rqsp9Z1qNlcMPVqASuQkjQ_B8ExdDru"

  private val JSON = "application/json; charset=utf-8".toMediaType()
  private val http = OkHttpClient()

  data class Sessao(val access: String, val refresh: String, val uid: String)

  private fun parseSessao(txt: String): Sessao {
    val j = JSONObject(txt)
    return Sessao(
      j.getString("access_token"),
      j.getString("refresh_token"),
      j.getJSONObject("user").getString("id"),
    )
  }

  fun login(email: String, senha: String): Sessao {
    val body = JSONObject().put("email", email.trim()).put("password", senha).toString().toRequestBody(JSON)
    val req = Request.Builder()
      .url("$URL/auth/v1/token?grant_type=password")
      .addHeader("apikey", ANON)
      .post(body)
      .build()
    http.newCall(req).execute().use { r ->
      val txt = r.body?.string().orEmpty()
      if (!r.isSuccessful) throw RuntimeException("Login falhou (${r.code}): ${msg(txt)}")
      return parseSessao(txt)
    }
  }

  fun refresh(refreshToken: String): Sessao {
    val body = JSONObject().put("refresh_token", refreshToken).toString().toRequestBody(JSON)
    val req = Request.Builder()
      .url("$URL/auth/v1/token?grant_type=refresh_token")
      .addHeader("apikey", ANON)
      .post(body)
      .build()
    http.newCall(req).execute().use { r ->
      val txt = r.body?.string().orEmpty()
      if (!r.isSuccessful) throw RuntimeException("Sessão expirada. Entre novamente.")
      return parseSessao(txt)
    }
  }

  fun upsert(access: String, rows: JSONArray) {
    if (rows.length() == 0) return
    val req = Request.Builder()
      .url("$URL/rest/v1/documentos?on_conflict=user_id,colecao,id")
      .addHeader("apikey", ANON)
      .addHeader("Authorization", "Bearer $access")
      .addHeader("Prefer", "resolution=merge-duplicates,return=minimal")
      .post(rows.toString().toRequestBody(JSON))
      .build()
    http.newCall(req).execute().use { r ->
      val txt = r.body?.string().orEmpty()
      if (!r.isSuccessful) throw RuntimeException("Envio falhou (${r.code}): ${msg(txt)}")
    }
  }

  private fun msg(t: String): String = try {
    val j = JSONObject(t)
    j.optString("msg", j.optString("error_description", j.optString("message", t)))
  } catch (e: Exception) {
    t.take(200)
  }
}
