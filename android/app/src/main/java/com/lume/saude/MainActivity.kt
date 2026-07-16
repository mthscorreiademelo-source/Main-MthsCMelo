package com.lume.saude

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * App Lume unificado: um WebView abre o Lume web (toda a interface e a conta),
 * e uma ponte JavaScript expõe a leitura do Health Connect (Conexão Saúde) para
 * a página Saúde. O login feito no Lume web é repassado ao lado nativo, que mantém
 * a sua própria sessão do Supabase para o [SyncWorker] rodar em segundo plano.
 */
class MainActivity : ComponentActivity() {

  private lateinit var prefs: Prefs
  private lateinit var web: WebView
  private var client: HealthConnectClient? = null
  private val escopo = CoroutineScope(Dispatchers.Main + SupervisorJob())

  private val pedirPermissoes =
    registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { concedidas ->
      if (concedidas.containsAll(Health.PERMISSOES)) {
        SyncWorker.agendar(this)
        emitir("ok", "Saúde conectada.")
        sincronizar()
      } else {
        emitir("erro", "Permissão de saúde não concedida. Abra “Conexão Saúde” e libere o Lume.")
      }
    }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    prefs = Prefs(this)
    if (HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) {
      client = HealthConnectClient.getOrCreate(this)
    }

    web = WebView(this).apply {
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      @Suppress("DEPRECATION")
      settings.databaseEnabled = true
      settings.mediaPlaybackRequiresUserGesture = false
      webViewClient = WebViewClient()
      webChromeClient = WebChromeClient()
      addJavascriptInterface(Ponte(), "AndroidSaude")
    }
    setContentView(web)
    web.loadUrl("https://mthscorreiademelo-source.github.io/Main-MthsCMelo/")

    onBackPressedDispatcher.addCallback(this) {
      if (web.canGoBack()) web.goBack() else finish()
    }

    // Se já há sessão salva e a permissão foi concedida, garante o trabalho de fundo.
    if (prefs.logado) escopo.launch { if (temPermissao()) SyncWorker.agendar(this@MainActivity) }
  }

  private suspend fun temPermissao(): Boolean {
    val c = client ?: return false
    return withContext(Dispatchers.IO) { c.permissionController.getGrantedPermissions() }
      .containsAll(Health.PERMISSOES)
  }

  private fun emitir(tipo: String, msg: String) {
    val js = "window.dispatchEvent(new CustomEvent('lume-saude',{detail:{" +
      "tipo:'$tipo',mensagem:${JSONObject.quote(msg)},ultimaSync:${prefs.ultimaSync}}}))"
    runOnUiThread { web.evaluateJavascript(js, null) }
  }

  private fun sincronizar() {
    val c = client ?: run { emitir("erro", "Health Connect indisponível neste aparelho."); return }
    val refresh = prefs.refresh ?: run { emitir("erro", "Entre na sua conta no Lume primeiro."); return }
    emitir("status", "Sincronizando saúde…")
    escopo.launch {
      try {
        val enviados = withContext(Dispatchers.IO) {
          val sessao = Supa.refresh(refresh)
          prefs.salvar(sessao)
          val rows = Health.coletar(c, sessao.uid, dias = 30)
          Supa.upsert(sessao.access, rows)
          rows.length()
        }
        prefs.ultimaSync = System.currentTimeMillis()
        emitir("ok", if (enviados == 0) "Nada novo de saúde." else "Saúde: $enviados dia(s) enviados.")
      } catch (e: Exception) {
        emitir("erro", e.message ?: "Falha ao sincronizar saúde.")
      }
    }
  }

  /** Métodos chamados pelo Lume web (window.AndroidSaude). Rodam em thread do binder. */
  inner class Ponte {
    @JavascriptInterface
    fun loginSaude(email: String, senha: String) {
      escopo.launch {
        try {
          val sessao = withContext(Dispatchers.IO) { Supa.login(email, senha) }
          prefs.salvar(sessao, email)
          if (temPermissao()) SyncWorker.agendar(this@MainActivity)
        } catch (_: Exception) {
          // O login do web já validou as credenciais; se aqui falhar, seguimos sem
          // sync de fundo e o usuário pode tentar "Conectar Saúde" de novo.
        }
      }
    }

    @JavascriptInterface
    fun sairSaude() {
      SyncWorker.cancelar(this@MainActivity)
      prefs.sair()
    }

    @JavascriptInterface
    fun conectarSaude() {
      runOnUiThread {
        if (client == null) {
          emitir("erro", "Health Connect (Conexão Saúde) indisponível neste aparelho.")
          return@runOnUiThread
        }
        escopo.launch {
          if (temPermissao()) {
            SyncWorker.agendar(this@MainActivity)
            sincronizar()
          } else {
            pedirPermissoes.launch(Health.PERMISSOES)
          }
        }
      }
    }

    @JavascriptInterface
    fun sincronizarAgora() {
      runOnUiThread { sincronizar() }
    }
  }
}
