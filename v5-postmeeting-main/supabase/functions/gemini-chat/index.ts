import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const DEFAULT_RESPONSE = { intencion: "DEFAULT", producto_id: "total_12", accion_ui: "play_video" }

const SYSTEM_PROMPT = 'Eres un clasificador rápido. Devuelve SOLO el JSON con el producto_id correspondiente (ej. sensitive_pro, luminous_white, total_12). NO generes texto de recomendación.'

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    intencion: { type: "string" },
    producto_id: { type: "string" },
    accion_ui: { type: "string" },
  },
  required: ["intencion", "producto_id", "accion_ui"],
}

const safeJsonParse = (value: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const normalize = (value: unknown): string => String(value ?? "").trim()

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { textoUsuario } = await req.json()
    const apiKey = Deno.env.get('VITE_GEMINI_API_KEY')

    if (!apiKey) throw new Error('API key missing')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 15,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    })

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: String(textoUsuario ?? '') },
    ])

    const raw = result.response.text().trim()
    console.log('=== GEMINI RAW ===', raw)

    const parsed = safeJsonParse(raw)
    const body = {
      intencion: normalize(parsed?.["intencion"]) || DEFAULT_RESPONSE.intencion,
      producto_id: normalize(parsed?.["producto_id"]) || DEFAULT_RESPONSE.producto_id,
      accion_ui: normalize(parsed?.["accion_ui"]) || DEFAULT_RESPONSE.accion_ui,
    }

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('GOOGLE_API_ERROR:', error instanceof Error ? error.message : error)
    return new Response(JSON.stringify(DEFAULT_RESPONSE), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
