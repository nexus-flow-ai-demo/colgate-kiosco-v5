import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
const DEFAULT_PRODUCT = "total_12"

serve(async (req) => {
  // 1. MANEJO DE CORS ESTRICTO E INMEDIATO (PREFLIGHT)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    // 2. TU LÓGICA DE GEMINI AQUÍ...
    const { transcript, textoUsuario } = await req.json()
    const texto = String(transcript ?? textoUsuario ?? '')

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY not set')

    const payload = {
      system_instruction: {
        parts: [{ text: 'Eres un clasificador ultrarrápido. Devuelve SOLO el ID del producto (ej. sensitive_pro, luminous_white, total_12) en base al problema del usuario. CERO texto adicional.' }]
      },
      contents: [{ parts: [{ text: texto }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: {
          type: 'OBJECT',
          properties: {
            producto_id: { type: 'STRING' }
          },
          required: ['producto_id']
        },
        maxOutputTokens: 10,
        temperature: 0,
      }
    }

    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Gemini API error: ${resp.status} - ${errText}`)
    }

    const result = await resp.json()
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let producto_id = DEFAULT_PRODUCT
    try {
      const parsed = JSON.parse(rawText)
      if (parsed?.producto_id) {
        producto_id = String(parsed.producto_id).trim().toLowerCase()
      }
    } catch {
      // Si falla el parseo, se mantiene el producto por defecto
    }

    const tuRespuestaJson = { producto_id }

    // 3. RESPUESTA FINAL SIEMPRE CON HEADERS CORS
    return new Response(JSON.stringify(tuRespuestaJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // 4. MANEJO DE ERRORES TAMBIÉN CON HEADERS CORS
    console.error(error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
