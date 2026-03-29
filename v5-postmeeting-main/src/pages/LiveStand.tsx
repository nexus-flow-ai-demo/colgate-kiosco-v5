import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const LiveStand = () => {
  const [activeLight, setActiveLight] = useState<string | null>(null);

  useEffect(() => {
    // 1. Escucha Local (Para cuando pruebas en la misma PC)
    const handleStorageChange = () => {
      const activeLight = localStorage.getItem('active_gondola_light');
      setActiveLight(activeLight);
    };
    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    
    // 2. LA MAGIA: Escucha Remota (Para cuando viene de la Tableta/Supabase)
    const channel = supabase
      .channel("livestand-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "v5_client_interactions" },
        (payload) => {
          console.log("🌟 [LiveStand] ¡Señal recibida desde Supabase!", payload.new);
          const newRecord = payload.new as any;
          
          if (newRecord.product_recommended) {
            setActiveLight(newRecord.product_recommended);
            // Sincronizamos la memoria local por si acaso
            localStorage.setItem('active_gondola_light', newRecord.product_recommended);
          }
        }
      )
      .subscribe();

    // Limpiar evento y canal al desmontar la pantalla
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLightsOff = () => {
    setActiveLight(null);
    localStorage.removeItem('active_gondola_light');
    localStorage.removeItem('light_timestamp');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      {/* Botón de apagar luces */}
      <button
        onClick={handleLightsOff}
        className="absolute top-4 right-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors z-50"
      >
        Apagar Luces
      </button>

      {/* Título */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <h1 className="text-3xl font-bold text-white mb-2">Góndola Virtual Colgate</h1>
        <p className="text-gray-400 text-center">Gemelo Digital de Luces de Pasillo</p>
      </div>

      {/* Anaquel de productos */}
      <div className="flex gap-12 items-center">
        {/* Producto 1: Total Whitening */}
        <div
          className={`relative transition-all duration-500 transform ${
            activeLight === 'v5_total_whitening' 
              ? 'scale-110 shadow-[0_0_30px_10px_rgba(0,100,255,0.8)]' 
              : 'scale-100 opacity-60'
          }`}
        >
          <div className="w-96 h-80 bg-zinc-900/80 rounded-lg flex items-center justify-center border-2 border-zinc-700">
            <img 
              src="/total.png" 
              alt="Total Whitening" 
              className="w-full h-full object-contain p-6 drop-shadow-xl" 
            />
            {activeLight === 'v5_total_whitening' && (
              <div className="absolute top-2 right-2 text-yellow-300 font-bold animate-pulse text-xl">
                ✨ ILUMINADO
              </div>
            )}
          </div>
        </div>

        {/* Producto 2: Luminous White Lovers */}
        <div
          className={`relative transition-all duration-500 transform ${
            activeLight === 'v5_luminous_white_lovers' 
              ? 'scale-110 shadow-[0_0_30px_10px_rgba(255,255,255,0.8)]' 
              : 'scale-100 opacity-60'
          }`}
        >
          <div className="w-96 h-80 bg-[#0a0f1c] rounded-lg flex items-center justify-center border-2 border-zinc-700">
            <img 
              src="/luminous.png" 
              alt="Luminous White" 
              className="w-full h-full object-contain p-6 drop-shadow-xl" 
            />
            {activeLight === 'v5_luminous_white_lovers' && (
              <div className="absolute top-2 right-2 text-yellow-300 font-bold animate-pulse text-xl">
                ✨ ILUMINADO
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estado actual */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-gray-400 text-sm">
          Estado: {activeLight ? `Producto activo: ${activeLight}` : 'Esperando señal del kiosco...'}
        </p>
      </div>
    </div>
  );
};

export default LiveStand;