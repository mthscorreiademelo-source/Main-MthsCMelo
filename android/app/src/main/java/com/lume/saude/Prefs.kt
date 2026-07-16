package com.lume.saude

import android.content.Context

/** Guarda a sessão do Supabase e a data da última sincronização. */
class Prefs(ctx: Context) {
  private val sp = ctx.getSharedPreferences("lume", Context.MODE_PRIVATE)

  var email: String?
    get() = sp.getString("email", null)
    set(v) = sp.edit().putString("email", v).apply()

  var access: String?
    get() = sp.getString("access", null)
    set(v) = sp.edit().putString("access", v).apply()

  var refresh: String?
    get() = sp.getString("refresh", null)
    set(v) = sp.edit().putString("refresh", v).apply()

  var uid: String?
    get() = sp.getString("uid", null)
    set(v) = sp.edit().putString("uid", v).apply()

  var ultimaSync: Long
    get() = sp.getLong("ultimaSync", 0L)
    set(v) = sp.edit().putLong("ultimaSync", v).apply()

  val logado: Boolean get() = !refresh.isNullOrEmpty() && !uid.isNullOrEmpty()

  fun salvar(sessao: Supa.Sessao, email: String? = this.email) {
    sp.edit()
      .putString("email", email)
      .putString("access", sessao.access)
      .putString("refresh", sessao.refresh)
      .putString("uid", sessao.uid)
      .apply()
  }

  fun sair() {
    sp.edit()
      .remove("access").remove("refresh").remove("uid").remove("ultimaSync")
      .apply()
  }
}
