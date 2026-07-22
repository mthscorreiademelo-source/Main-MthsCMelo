// Supabase Edge Function: interpretação de captura por IA (Google Gemini).
//
// Recebe um texto livre (pt-BR) + a data de hoje e devolve 1–3 candidatos de
// interpretação no MESMO formato que o app já usa (Interpretacao). O app sempre
// confirma antes de gravar — a IA é um palpite melhor, não uma ação automática.
//
// Segredo necessário: GEMINI_API_KEY (chave grátis do Google AI Studio).
// Modelo padrão: gemini-2.0-flash (tier gratuito). Ajustável por GEMINI_MODEL.

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TIPOS = ['tarefa', 'evento', 'nota', 'compra', 'despesa', 'receita', 'lembrete']

function prompt(texto: string, hoje: string): string {
  return `Você classifica uma anotação livre (português do Brasil) de um app pessoal de organização.
Hoje é ${hoje}. Devolva de 1 a 3 candidatos, do mais provável ao menos provável.

Responda APENAS com JSON válido, sem texto fora do JSON e sem crases, exatamente neste formato:
{"candidatos":[{"tipo":"...","confianca":"alta|media|baixa","rotulo":"...","campos":{"titulo":"...","data":"yyyy-MM-dd","horaInicio":"HH:mm","duracaoMin":0,"valorCentavos":0,"categoria":"...","local":"...","pessoa":"..."}}]}
Inclua em "campos" só os campos que existem no texto (omita o resto).

Regras:
- tipo: um de ${TIPOS.join(', ')}.
- "despesa"/"receita" só quando há valor em dinheiro; valorCentavos em centavos (R$ 48,90 => 4890).
- "evento" quando há compromisso/horário/pessoa/data; preencha data e horaInicio se houver.
- "tarefa" quando há uma ação a fazer (verbo). "lembrete" quando o texto pede para lembrar.
- "compra" para item de lista de compras. "nota" é a saída segura quando nada mais se aplica.
- Resolva datas relativas ("amanhã", "quinta", "semana que vem") a partir de hoje.
- titulo: limpo, sem as palavras de data/hora. rotulo: frase curta explicando o palpite.
- NÃO invente dados ausentes.

Texto: """${texto}"""`
}

// Remove cercas ```json ... ``` que o modelo às vezes adiciona.
function limparJson(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
  try {
    const { texto, hoje } = await req.json()
    if (!texto || typeof texto !== 'string') return json({ erro: 'texto ausente' }, 400)

    const chave = Deno.env.get('GEMINI_API_KEY')
    if (!chave) return json({ erro: 'GEMINI_API_KEY não configurada' }, 500)
    const modelo = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'
    const hojeISO = typeof hoje === 'string' ? hoje : new Date().toISOString().slice(0, 10)

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt(String(texto).slice(0, 2000), hojeISO) }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      },
    )
    if (!resp.ok) {
      const detalhe = await resp.text()
      return json({ erro: 'falha na IA', status: resp.status, detalhe: detalhe.slice(0, 400) }, 502)
    }
    const dados = await resp.json()
    const txt = dados?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    let parsed: unknown = {}
    try { parsed = JSON.parse(limparJson(txt)) } catch { parsed = {} }
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { candidatos?: unknown[] })?.candidatos)
        ? (parsed as { candidatos: unknown[] }).candidatos
        : []
    return json({ candidatos: arr.slice(0, 3) })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
