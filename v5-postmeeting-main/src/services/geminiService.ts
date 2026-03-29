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
    console.log("[Intent] Petición enviada al puente de Vercel:", textoUsuario);

    // En vez de ir a Google, vamos a nuestro propio servidor seguro
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textoUsuario })
    });

    const data = await response.json();
    console.log("=== DATA CRUDA DEL PROXY ===", JSON.stringify(data));

    // Mantenemos tu misma lógica de extracción a prueba de fallos
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