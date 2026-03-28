import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      throw new Error("No se recibió imagen.")
    }

    const apiKey = Deno.env.get('VITE_GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error("Llave API no encontrada en el servidor.")
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const result = await model.generateContent([
      {
        text: 'Eres un auditor de recibos de supermercado. Analiza esta imagen. Devuelve ÚNICAMENTE un objeto JSON válido sin markdown con esta estructura: {"es_factura_valida": boolean, "contiene_colgate": boolean, "productos_encontrados": ["item 1", "item 2"], "motivo_rechazo": "Explicación breve o null si todo está bien"}. REGLA DE MODO DEMO: Para efectos de esta presentación, SI LA IMAGEN CONTIENE LA PALABRA "COLGATE" (incluso si está escrita a mano con bolígrafo, en una hoja de cuaderno, o es un dibujo rápido), DEBES APROBARLA INMEDIATAMENTE. Marca obligatoriamente "es_factura_valida": true y "contiene_colgate": true. Ignora por completo las reglas estrictas de formato de recibo legal. El único requisito para el éxito hoy es que detectes la palabra Colgate.'
      },
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      }
    ])

    const text = result.response.text()
    const cleanJson = text.replace(/```json|```/g, "").trim()

    return new Response(cleanJson, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error("Error en analyze-receipt:", error)
    return new Response(JSON.stringify({
      es_factura_valida: false,
      contiene_colgate: false,
      productos_encontrados: [],
      motivo_rechazo: "Error del servidor: " + (error as Error).message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
