export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Usamos tu llave actual (luego la pondremos como variable de entorno oculta en Vercel)
    const apiKey = process.env.VITE_GEMINI_API_KEY || 'AIzaSyCjGhe5CDPeH72AaNW1cjQbveLofkrNSlk';
    
    // Cambiamos a 1.5-flash que es la versión de producción estable
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const { textoUsuario } = req.body;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: "Eres el cerebro de recomendación del Kiosco Colgate. Analiza el texto del usuario y devuelve ÚNICAMENTE un JSON válido con dos claves: \"trigger_light\" y \"detected_need\".\n\nREGLAS DE CLASIFICACIÓN ESTRICTAS:\n\nSi el usuario menciona: café, té, vino, cigarrillo, manchas, dientes amarillos, o blanqueamiento estético ->\nDevuelve: {\"trigger_light\": \"v5_luminous_white_lovers\", \"detected_need\": \"manchas_cafe\"}\n\nSi el usuario menciona: salud bucal, encías, bacterias, sarro, caries, hijos, familia, dolor, o limpieza profunda ->\nDevuelve: {\"trigger_light\": \"v5_total_whitening\", \"detected_need\": \"proteccion_integral\"}\n\nSi el texto es ambiguo, por defecto recomienda protección integral. NO devuelvas texto fuera del JSON.\n\nIMPORTANTE: Devuelve el texto plano. NO envuelvas la respuesta en bloques de código markdown (```json). Solo devuelve las llaves del JSON." }]
        },
        contents: [{ parts: [{ text: textoUsuario }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200
        }
      })
    });

    const data = await response.json();
    res.status(200).json(data); // Devolvemos la data exacta que tu frontend espera

  } catch (error) {
    console.error("Error en el proxy de Vercel:", error);
    res.status(500).json({ error: 'Error comunicándose con Gemini' });
  }
}