const GEMINI_API_KEY = 'AIzaSyCjGhe5CDPeH72AaNW1cjQbveLofkrNSlk';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const DEFAULT_PRODUCT_ID = "total_12";

const normalizeValue = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const resolveProductId = (rawProductId: unknown): string => {
  const producto = normalizeValue(rawProductId).replace(/\s+/g, "_");

  if (producto.includes("SENSITIVE") || producto.includes("SENSIBILIDAD") || producto.includes("ENCI")) {
    return "sensitive_pro";
  }
  if (producto.includes("BLANQUEAMIENTO") || producto.includes("LUMINOUS") || producto.includes("WHITE")) {
    return "luminous_white";
  }
  if (producto.includes("TOTAL_12") || producto.includes("DEFAULT")) {
    return DEFAULT_PRODUCT_ID;
  }
  return DEFAULT_PRODUCT_ID;
};

export const analizarIntencionCliente = async (
  textoUsuario: string
): Promise<{ respuesta_completa: string }> => {
  try {
    console.log("[Intent] Fetch directo a Gemini:", textoUsuario);

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
    console.log("=== DATA CRUDA DE GOOGLE ===", JSON.stringify(data));

    // Extracción a prueba de fallos con optional chaining
    let textoRespuesta = "";
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (parts && parts.length > 0 && parts[0]?.text) {
      textoRespuesta = parts[0].text;
      // Limpiar cualquier posible markdown por seguridad
      textoRespuesta = textoRespuesta.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    console.log("=== TEXTO EXTRAÍDO ===", textoRespuesta);

    return { respuesta_completa: textoRespuesta };
  } catch (error) {
    console.error("Error en Gemini Service:", error);
    return { respuesta_completa: "" };
  }
};
