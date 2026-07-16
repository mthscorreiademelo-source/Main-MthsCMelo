package com.lume.saude

import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Tela única do Lume Saúde: login por e-mail, permissão do Health Connect e sincronização manual.
 * A sincronização automática em segundo plano fica a cargo do [SyncWorker].
 */
class MainActivity : ComponentActivity() {

  private lateinit var prefs: Prefs
  private var client: HealthConnectClient? = null

  private lateinit var status: TextView
  private lateinit var raiz: LinearLayout

  private val pedirPermissoes =
    registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { concedidas ->
      if (concedidas.containsAll(Health.PERMISSOES)) {
        SyncWorker.agendar(this)
        sincronizar()
      } else {
        setStatus("Permissão de saúde não concedida. Abra “Conexão Saúde” e libere o Lume.")
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    prefs = Prefs(this)

    raiz = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#faf9f7"))
      setPadding(dp(28), dp(48), dp(28), dp(28))
    }
    setContentView(raiz)

    if (prefs.logado) montarPainel() else montarLogin()
  }

  // ---------- Login ----------

  private fun montarLogin() {
    raiz.removeAllViews()
    raiz.addView(titulo("Lume Saúde"))
    raiz.addView(subtitulo("Entre com a mesma conta do Lume para enviar seus dados de saúde para a nuvem."))

    val email = campo("E-mail", InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS or InputType.TYPE_CLASS_TEXT)
    prefs.email?.let { email.setText(it) }
    val senha = campo("Senha", InputType.TYPE_TEXT_VARIATION_PASSWORD or InputType.TYPE_CLASS_TEXT)

    raiz.addView(email)
    raiz.addView(senha)

    val botao = botaoPrimario("Entrar")
    raiz.addView(botao)

    status = TextView(this).apply {
      setTextColor(Color.parseColor("#8a8577")); textSize = 13f
      setPadding(0, dp(16), 0, 0)
    }
    raiz.addView(status)

    botao.setOnClickListener {
      val e = email.text.toString().trim()
      val s = senha.text.toString()
      if (e.isEmpty() || s.isEmpty()) {
        setStatus("Preencha e-mail e senha."); return@setOnClickListener
      }
      botao.isEnabled = false
      setStatus("Entrando…")
      lifecycleScope.launch {
        try {
          val sessao = withContext(Dispatchers.IO) { Supa.login(e, s) }
          prefs.salvar(sessao, e)
          montarPainel()
        } catch (ex: Exception) {
          botao.isEnabled = true
          setStatus(ex.message ?: "Não foi possível entrar.")
        }
      }
    }
  }

  // ---------- Painel principal ----------

  private fun montarPainel() {
    raiz.removeAllViews()
    raiz.addView(titulo("Lume Saúde"))
    raiz.addView(subtitulo("Conta: ${prefs.email ?: "—"}"))

    status = TextView(this).apply {
      setTextColor(Color.parseColor("#8a8577")); textSize = 13f
      setPadding(0, dp(4), 0, dp(20))
    }
    raiz.addView(status)

    val disponivel = HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE
    if (!disponivel) {
      setStatus("Health Connect (Conexão Saúde) não está disponível neste aparelho.")
    } else {
      client = HealthConnectClient.getOrCreate(this)
    }

    val bConectar = botaoPrimario("Conectar Saúde")
    val bSync = botaoSecundario("Sincronizar agora")
    val bSair = botaoTexto("Sair")
    raiz.addView(bConectar)
    raiz.addView(bSync)
    raiz.addView(bSair)

    bConectar.isEnabled = disponivel
    bSync.isEnabled = disponivel

    bConectar.setOnClickListener {
      lifecycleScope.launch {
        val c = client ?: return@launch
        val concedidas = withContext(Dispatchers.IO) { c.permissionController.getGrantedPermissions() }
        if (concedidas.containsAll(Health.PERMISSOES)) {
          SyncWorker.agendar(this@MainActivity)
          sincronizar()
        } else {
          pedirPermissoes.launch(Health.PERMISSOES)
        }
      }
    }
    bSync.setOnClickListener { sincronizar() }
    bSair.setOnClickListener {
      SyncWorker.cancelar(this)
      prefs.sair()
      montarLogin()
    }

    mostrarUltimaSync()
    // Se já autorizado, agenda o trabalho de fundo desde já.
    if (disponivel) {
      lifecycleScope.launch {
        val c = client ?: return@launch
        val concedidas = withContext(Dispatchers.IO) { c.permissionController.getGrantedPermissions() }
        if (concedidas.containsAll(Health.PERMISSOES)) SyncWorker.agendar(this@MainActivity)
      }
    }
  }

  private fun sincronizar() {
    val c = client ?: run { setStatus("Health Connect indisponível."); return }
    val refresh = prefs.refresh ?: run { montarLogin(); return }
    setStatus("Sincronizando…")
    lifecycleScope.launch {
      try {
        val (enviados) = withContext(Dispatchers.IO) {
          val sessao = Supa.refresh(refresh)
          prefs.salvar(sessao)
          val rows = Health.coletar(c, sessao.uid, dias = 30)
          Supa.upsert(sessao.access, rows)
          Resultado(rows.length())
        }
        prefs.ultimaSync = System.currentTimeMillis()
        setStatus(if (enviados == 0) "Nada novo para enviar." else "Pronto — $enviados dia(s) enviados.")
        mostrarUltimaSync()
      } catch (ex: Exception) {
        setStatus(ex.message ?: "Falha ao sincronizar.")
      }
    }
  }

  private data class Resultado(val enviados: Int)

  private fun mostrarUltimaSync() {
    val t = prefs.ultimaSync
    if (t > 0) {
      val fmt = SimpleDateFormat("dd/MM 'às' HH:mm", Locale.forLanguageTag("pt-BR"))
      setStatus("Última sincronização: ${fmt.format(Date(t))}")
    }
  }

  private fun setStatus(txt: String) {
    if (::status.isInitialized) status.text = txt
    else Toast.makeText(this, txt, Toast.LENGTH_SHORT).show()
  }

  // ---------- Helpers de UI ----------

  private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

  private fun titulo(t: String) = TextView(this).apply {
    text = t; setTextColor(Color.parseColor("#2b2a26")); textSize = 26f
    setPadding(0, 0, 0, dp(8))
  }

  private fun subtitulo(t: String) = TextView(this).apply {
    text = t; setTextColor(Color.parseColor("#6b6659")); textSize = 14f
    setPadding(0, 0, 0, dp(16))
  }

  private fun campo(hint: String, tipo: Int) = EditText(this).apply {
    this.hint = hint; inputType = tipo
    setTextColor(Color.parseColor("#2b2a26"))
    setHintTextColor(Color.parseColor("#a8a294"))
    layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(8) }
  }

  private fun botaoPrimario(t: String) = Button(this).apply {
    text = t; isAllCaps = false; textSize = 16f
    setTextColor(Color.WHITE)
    setBackgroundColor(Color.parseColor("#2b2a26"))
    layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(20) }
  }

  private fun botaoSecundario(t: String) = Button(this).apply {
    text = t; isAllCaps = false; textSize = 16f
    setTextColor(Color.parseColor("#2b2a26"))
    setBackgroundColor(Color.parseColor("#ece9e2"))
    layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(12) }
  }

  private fun botaoTexto(t: String) = Button(this).apply {
    text = t; isAllCaps = false; textSize = 14f
    setTextColor(Color.parseColor("#8a8577"))
    setBackgroundColor(Color.TRANSPARENT)
    gravity = Gravity.CENTER
    layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(24) }
  }
}
