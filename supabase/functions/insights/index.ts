// Supabase Edge Function: insight/observação em linguagem natural (Gemini).
//
// Recebe um "contexto" (o que estamos observando) + "dados" (números REAIS já
// calculados no app) e devolve UMA observação curta e honesta em pt-BR.
// A IA só REDIGE em cima dos dados fornecidos — não inventa nada, e é instruída
// a nunca afirmar causa (só correlação/padrão observado). O app confirma/guarda.
//
// Segredo necessário: GEMINI_API_KEY. Modelo padrão: gemini-flash-latest.

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function prompt(contexto: string, dados: unknown, hoje: string): string {
  return `Você é um observador honesto dos dados pessoais de alguém num app de organização. Hoje é ${hoje}.
Contexto: ${contexto}.
Dados REAIS (JSON) já calculados pelo app:
${JSON.stringify(dados)}

Escreva UMA observação curta (1 a 2 frases, no máximo ~240 caracteres), em português do Brasil, tom calmo e útil.
Regras rígidas:
- Use SOMENTE os dados acima. NÃO invente números, datas ou fatos que não estejam aí.
- Descreva um padrão/tendência/correlação OBSERVADA. NUNCA afirme causa ("porque", "por causa de"); prefira "coincide com", "nos dias em que", "junto com".
- Nada de conselho médico/financeiro categórico; pode sugerir algo leve e opcional.
- Se os dados forem insuficientes para algo interessante, responda com uma string vazia.
- Responda só com o texto da observação, sem aspas, sem markdown, sem prefixos.`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
  try {
    const { contexto, dados, hoje } = await req.json()
    if (!contexto || dados == null) return json({ erro: 'contexto/dados ausentes' }, 400)

    const chave = Deno.env.get('GEMINI_API_KEY')
    if (!chave) return json({ erro: 'GEMINI_API_KEY não configurada' }, 500)
    const modelo = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'
    const hojeISO = typeof hoje === 'string' ? hoje : new Date().toISOString().slice(0, 10)

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt(String(contexto), dados, hojeISO) }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    )
    if (!resp.ok) {
      const detalhe = await resp.text()
      return json({ erro: 'falha na IA', status: resp.status, detalhe: detalhe.slice(0, 400) }, 502)
    }
    const dadosResp = await resp.json()
    const texto = String(dadosResp?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
    return json({ texto })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
