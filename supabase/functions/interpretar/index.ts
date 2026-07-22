// Supabase Edge Function: interpretação de captura por IA (Google Gemini).
//
// Recebe um texto livre (pt-BR) + a data de hoje e devolve 1–3 candidatos de
// interpretação no MESMO formato que o app já usa (Interpretacao). O app sempre
// confirma antes de gravar — a IA é um palpite melhor, não uma ação automática.
//
// Segredo necessário: GEMINI_API_KEY (chave grátis do Google AI Studio).
// Modelo padrão: gemini-2.0-flash (tier gratuito). Ajustável por GEMINI_MODEL.
//
// Deploy: supabase functions deploy interpretar
// (verifica o JWT do usuário por padrão — só quem está logado chama.)

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TIPOS = ['tarefa', 'evento', 'nota', 'compra', 'despesa', 'receita', 'lembrete']

const SCHEMA = {
  type: 'object',
  properties: {
    candidatos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: TIPOS },
          confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          rotulo: { type: 'string' },
          campos: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              data: { type: 'string', description: 'yyyy-MM-dd' },
              horaInicio: { type: 'string', description: 'HH:mm' },
              duracaoMin: { type: 'integer' },
              valorCentavos: { type: 'integer' },
              categoria: { type: 'string' },
              local: { type: 'string' },
              pessoa: { type: 'string' },
            },
          },
        },
        required: ['tipo', 'confianca', 'rotulo', 'campos'],
      },
    },
  },
  required: ['candidatos'],
}

function prompt(texto: string, hoje: string): string {
  return `Você classifica uma anotação livre (português do Brasil) de um app pessoal de organização.
Hoje é ${hoje}. Devolva de 1 a 3 candidatos, do mais provável ao menos provável.

Regras:
- tipo: um de ${TIPOS.join(', ')}.
- "despesa"/"receita" só quando há valor em dinheiro; preencha valorCentavos (ex.: R$ 48,90 => 4890).
- "evento" quando há compromisso/horário/pessoa/data; preencha data (yyyy-MM-dd) e horaInicio (HH:mm) se houver.
- "tarefa" quando há uma ação a fazer (verbo). "lembrete" quando o texto pede para lembrar.
- "compra" para item de lista de compras.
- "nota" é sempre a saída segura quando nada mais se aplica.
- Resolva datas relativas ("amanhã", "quinta", "semana que vem") a partir de hoje.
- titulo: limpo, sem as palavras de data/hora.
- rotulo: frase curta em pt-BR explicando o palpite. NÃO invente dados ausentes.

Texto: """${texto}"""`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { texto, hoje } = await req.json()
    if (!texto || typeof texto !== 'string') {
      return new Response(JSON.stringify({ erro: 'texto ausente' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const chave = Deno.env.get('GEMINI_API_KEY')
    if (!chave) {
      return new Response(JSON.stringify({ erro: 'GEMINI_API_KEY não configurada' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const modelo = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'
    const hojeISO = typeof hoje === 'string' ? hoje : new Date().toISOString().slice(0, 10)

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt(String(texto).slice(0, 2000), hojeISO) }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
        }),
      },
    )
    if (!resp.ok) {
      const detalhe = await resp.text()
      return new Response(JSON.stringify({ erro: 'falha na IA', detalhe: detalhe.slice(0, 300) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }
    const dados = await resp.json()
    const txt = dados?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    let parsed: { candidatos?: unknown[] } = {}
    try { parsed = JSON.parse(txt) } catch { parsed = {} }
    const candidatos = Array.isArray(parsed.candidatos) ? parsed.candidatos.slice(0, 3) : []
    return new Response(JSON.stringify({ candidatos }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
