import { useState, useEffect, useRef, useCallback } from "react";
import { analizarIntencionCliente } from "@/services/geminiService";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types-simple";

const STORAGE_BASE =
  "https://mephvrrrzjzvvtauqlyh.supabase.co/storage/v1/object/public/videos_avatar/";

const VIDEO_MAP: Record<string, string> = {
  video_hook: "v5_video_hook.mp4",
  v5_total_whitening: "v5_total_whitening.mp4",
  v5_luminous_white_lovers: "v5_luminous_white_lovers.mp4",
  v5_idle: "v5_idle.mp4"
};

type MicStatus = "off" | "listening" | "thinking" | "speaking";

const MicIndicator = ({ status }: { status: MicStatus }) => {
  if (status === "off") return null;

  const colors: Record<MicStatus, string> = {
    off: "",
    listening: "bg-green-500 shadow-green-500/60",
    thinking: "bg-yellow-400 shadow-yellow-400/60 animate-pulse",
    speaking: "bg-white/20 shadow-none",
  };

  return (
    <div className="absolute top-6 right-6 z-50 flex items-center gap-2 pointer-events-none">
      <div className={`w-3 h-3 rounded-full ${colors[status]} shadow-lg transition-all duration-300`} />
    </div>
  );
};

const Index = () => {
  const [started, setStarted] = useState(false);
  const [kioskState, setKioskState] = useState(0);
  const [actionPlaying, setActionPlaying] = useState(false);
  const [micStatus, setMicStatus] = useState<MicStatus>("off");
  const [actionVideoReady, setActionVideoReady] = useState(false);
  const [isTouchMode, setIsTouchMode] = useState(false);

  const actionVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const kioskStateRef = useRef(0);
  const actionPlayingRef = useRef(false);
  const isTouchModeRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { kioskStateRef.current = kioskState; }, [kioskState]);
  useEffect(() => { actionPlayingRef.current = actionPlaying; }, [actionPlaying]);
  useEffect(() => { isTouchModeRef.current = isTouchMode; }, [isTouchMode]);

  // --- Táctica 1: Precarga Extrema (Pre-fetch en RAM) ---
  useEffect(() => {
    const preloadVideo = (url: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = url.startsWith("http") ? url : `${STORAGE_BASE}${url}`;
      document.head.appendChild(link);
    };

    // Precargar todos los videos definidos
    Object.values(VIDEO_MAP).forEach(videoUrl => preloadVideo(videoUrl));
  }, []);

  // --- Play action video overlay ---
  const playActionVideo = useCallback((key: string) => {
    const videoSource = VIDEO_MAP[key];
    if (!videoSource || !actionVideoRef.current) return;
    console.log('[Kiosk] Playing action video:', key);
    const vid = actionVideoRef.current;
    vid.src = videoSource.startsWith("http") ? videoSource : `${STORAGE_BASE}${videoSource}`;
    vid.currentTime = 0;
    setActionPlaying(true);
    actionPlayingRef.current = true;
    setActionVideoReady(false);
    shouldListenRef.current = false;
    setMicStatus("speaking");
    stopListening();
    vid.play().catch((err) => {
      console.log('[Kiosk] Video play failed:', err);
      // If this is the easter egg, do NOT reset to idle — retry once
      if (key === 'easter_egg') {
        console.log('[Kiosk] Easter egg play blocked, retrying...');
        setTimeout(() => { vid.play().catch(() => {}); }, 500);
        return;
      }
      setActionPlaying(false);
      actionPlayingRef.current = false;
      shouldListenRef.current = true;
      setMicStatus("listening");
      startListening();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Dedicated restart function (try-catch for DOMException) ---
  const restartMicrophone = useCallback(() => {
    if (isTouchModeRef.current) {
      console.log("🛑 [Bloqueo] restartMicrophone bloqueado por Modo Touch.");
      return;
    }
    console.log('[Kiosk] restartMicrophone called');
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        console.log('[Kiosk] Mic restarted successfully');
        setMicStatus("listening");
      } else {
        console.log('[Kiosk] No recognition instance, creating new one');
        startListening();
      }
    } catch (error) {
      console.log('[Kiosk] Mic already listening or error, retrying in 200ms...', error);
      setTimeout(() => {
        startListening();
      }, 200);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Action video ended: always resume listening ---
  const handleActionEnded = useCallback(() => {
    console.log('[Kiosk] Action video ended, kioskState:', kioskStateRef.current);
    setActionVideoReady(false);

    // Fade out first, then clean up after transition
    setTimeout(() => {
      setActionPlaying(false);
      actionPlayingRef.current = false;

    // If easter egg just finished → full reset to start screen
    if (kioskStateRef.current === 4) {
      console.log('[Kiosk] Easter egg ended, resetting to start');
      shouldListenRef.current = false;
      stopListening();
      setKioskState(0);
      setMicStatus("off");
      setActionPlaying(false);
      setStarted(false);
      if (actionVideoRef.current) {
        actionVideoRef.current.pause();
        actionVideoRef.current.removeAttribute("src");
      }
        return;
      }

      // Normal flow: resume listening
      shouldListenRef.current = true;
      setTimeout(() => {
        restartMicrophone();
      }, 300);
    }, 200); // 200ms fade-out delay
  }, [restartMicrophone]);

  // --- Continuous Speech Recognition with auto-restart ---
  const startListening = useCallback(() => {
    if (isTouchModeRef.current) {
      console.log("🛑 [Bloqueo] startListening bloqueado por Modo Touch.");
      return;
    }
    console.log('[Kiosk] startListening called');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.log('[Kiosk] SpeechRecognition not supported');
      return;
    }

    const recognition = new SR();
    recognition.lang = "es-VE";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const result = event.results[last];
      const transcript = result[0].transcript;
      console.log('[Kiosk] Heard:', transcript, 'isFinal:', result.isFinal);

      if (actionPlayingRef.current) {
        console.log('[Kiosk] Ignoring input, avatar is speaking');
        return;
      }

      // Optimization: on final result, stop mic immediately & switch to "thinking"
      if (result.isFinal) {
        console.log('[Kiosk] Final result detected, stopping mic & processing');
        shouldListenRef.current = false;
        try { recognition.stop(); } catch {}
        setMicStatus("thinking");
        handleVoiceInput(transcript);
      }
    };

    recognition.onerror = (e: any) => {
      console.log('[Kiosk] Recognition error:', e.error);
    };

    // Chrome silence resurrector
    recognition.onend = () => {
      console.log('[Kiosk] Recognition onend fired, shouldListen:', shouldListenRef.current);
      if (shouldListenRef.current && !actionPlayingRef.current) {
        console.log('[Kiosk] Resurrecting mic (silence timeout)');
        try {
          recognition.start();
          setMicStatus("listening");
        } catch {
          setTimeout(() => startListening(), 200);
        }
      }
    };

    try {
      recognition.start();
      shouldListenRef.current = true;
      setMicStatus("listening");
      console.log('[Kiosk] Recognition started');
    } catch (e) {
      console.log('[Kiosk] Failed to start recognition:', e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setMicStatus("off");
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // --- Realtime listener for Easter Egg ---
  useEffect(() => {
    const channel = supabase
      .channel("p3-realtime-participantes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "p3_demo_participantes" },
        (payload) => {
          const newRecord = payload.new as any;
        if (newRecord.estatus === "activo") {
            // Immediate trigger: play final video
            shouldListenRef.current = false;
            stopListening();
            setKioskState(4);
            playActionVideo("easter_egg");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [playActionVideo, stopListening]);

  // --- Handle voice input ---
  const handleVoiceInput = async (text: string) => {
    if (!text.trim() || actionPlayingRef.current) return;

    const lower = text.trim().toLowerCase();

    if (kioskStateRef.current === 0) return;

    // State 2: check for raffle confirmation

    // Check for negative raffle response

    // 🚀 INTERCEPTOR DE LATENCIA CERO — Short-circuit antes de Gemini
    if (lower.includes('sensibilidad') || lower.includes('sensitive') || lower.includes('aliviar') || lower.includes('sensible')) {
      console.log("🚀 [Bypass Local] Keyword detectada. Saltando Gemini.");
      
      // Lógica de Bypass: Omitimos luces para sensibilidad por ahora (como estaba original), solo reproducimos video
      playActionVideo("v5_idle");
      setKioskState(2);
      return;
      
    } else if (lower.includes('blanqueamiento') || lower.includes('luminous') || lower.includes('blanquear') || lower.includes('blanco') || lower.includes('café') || lower.includes('cafe') || lower.includes('manchas')) {
      console.log("🚀 [Bypass Local] Keyword detectada: Luminous. Saltando Gemini.");
      
      const triggerValue = 'v5_luminous_white_lovers';
      const detectedNeed = 'manchas_cafe';
      
      // 1. Enviar señal de luz local
      localStorage.setItem('active_gondola_light', triggerValue);
      localStorage.setItem('light_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
      
      // 2. Reproducir video
      playActionVideo(triggerValue);
      
      // 3. Registrar en Supabase (para que LiveStand y Dashboard en otros dispositivos se enteren)
      recordInteraction('voice', triggerValue, detectedNeed);
      
      setKioskState(2);
      return;
      
    } else if (lower.includes('familia') || lower.includes('protección') || lower.includes('proteccion') || lower.includes('total')) {
      console.log("🚀 [Bypass Local] Keyword detectada: Total 12. Saltando Gemini.");
      
      const triggerValue = 'v5_total_whitening';
      const detectedNeed = 'proteccion_integral';
      
      // 1. Enviar señal de luz local
      localStorage.setItem('active_gondola_light', triggerValue);
      localStorage.setItem('light_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
      
      // 2. Reproducir video
      playActionVideo(triggerValue);
      
      // 3. Registrar en Supabase
      recordInteraction('voice', triggerValue, detectedNeed);
      
      setKioskState(2);
      return;
    }

    // 🧠 Frase compleja — fallback a Gemini
    console.log("🧠 [Gemini] Frase compleja. Consultando IA...");
    try {
      const result = await analizarIntencionCliente(text.trim());
      
      if (!result.respuesta_completa) {
        playActionVideo("v5_idle");
        return;
      }

      // INTERCEPTOR DEL TRIGGER JSON
      let textoParaUsuario = result.respuesta_completa;
      let triggerValue = null;
      let detectedNeed = 'interaccion_estandar';
      
      if (textoParaUsuario.includes('{"trigger_light"')) {
        const jsonMatch = textoParaUsuario.match(/{"trigger_light":\s*"[^"]+",\s*"detected_need":\s*"[^"]+"}/);
        if (jsonMatch) {
          try {
            const triggerData = JSON.parse(jsonMatch[0]);
            triggerValue = triggerData.trigger_light;
            detectedNeed = triggerData.detected_need;
            console.log('💡 ILUMINANDO PASILLO:', triggerValue, 'NECESIDAD:', detectedNeed);
            
            // Enviar señal a otras pestañas (Gemelo Digital)
            localStorage.setItem('active_gondola_light', triggerValue);
            localStorage.setItem('light_timestamp', Date.now().toString()); // Para forzar el evento de storage incluso si es el mismo producto
            window.dispatchEvent(new Event('storage')); // Fuerza el evento en la misma pestaña por si acaso
            
            // Eliminar el JSON del texto para que no se lea en voz alta
            textoParaUsuario = textoParaUsuario.replace(jsonMatch[0], '').trim();
            
            // Disparar el video correspondiente
            if (triggerValue === 'v5_total_whitening') {
              playActionVideo('v5_total_whitening');
              recordInteraction('voice', 'v5_total_whitening', detectedNeed);
            } else if (triggerValue === 'v5_luminous_white_lovers') {
              playActionVideo('v5_luminous_white_lovers');
              recordInteraction('voice', 'v5_luminous_white_lovers', detectedNeed);
            }
          } catch (e) {
            console.error('Error parsing trigger JSON:', e);
          }
        }
      }

      // Aquí iría la lógica de voz para leer textoParaUsuario
      // Por ahora solo mostramos en consola
      console.log('🗣️ Texto para usuario:', textoParaUsuario);
      
      setKioskState(2);
    } catch {
      playActionVideo("v5_idle");
    }
  };

  // --- Tap to Start ---
  const handleStart = async () => {
    // Entrar en pantalla completa total (Modo Kiosco Agresivo)
    const elem = document.documentElement as any;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) { // Safari y Chrome móvil
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { // Edge/IE
        await elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) { // Firefox
        await elem.mozRequestFullScreen();
      }
    } catch (err) {
      console.warn("El navegador bloqueó la pantalla completa automática:", err);
    }

    setStarted(true);
    setKioskState(1);
    playActionVideo("video_hook");
  };

  const handleReset = () => {
    shouldListenRef.current = false;
    stopListening();
    setKioskState(0);
    setMicStatus("off");
    setActionPlaying(false);
    setStarted(false);
    setIsTouchMode(false);
    if (actionVideoRef.current) {
      actionVideoRef.current.pause();
      actionVideoRef.current.removeAttribute("src");
    }
  };

  // --- Toggle Touch/Voice Mode ---
  const toggleMode = () => {
    if (isTouchMode) {
      // Switching to Voice mode
      setIsTouchMode(false);
      console.log("🎤 [Mode] Cambiando a Modo Voz");
      if (started && kioskStateRef.current >= 1 && !actionPlayingRef.current) {
        shouldListenRef.current = true;
        startListening();
      }
    } else {
      // Switching to Touch mode
      setIsTouchMode(true);
      console.log("👆 [Mode] Cambiando a Modo Pantalla");
      shouldListenRef.current = false;
      stopListening();
    }
  };

  // --- Data Collection Function ---
  const recordInteraction = async (interactionMode: 'voice' | 'touch', triggerProduct: string, detectedNeed: string = 'interaccion_estandar') => {
    try {
      await supabase.from('v5_client_interactions').insert([{
        kiosk_code: 'V5-CCS-001',
        interaction_type: interactionMode,
        identified_need: detectedNeed,
        product_recommended: triggerProduct,
        session_status: 'completed'
      }]);
      console.log(`📊 [Data] Interaction recorded: ${interactionMode} -> ${triggerProduct} (${detectedNeed})`);
    } catch (error) {
      console.error('❌ [Data] Error recording interaction:', error);
    }
  };

  // --- Touch button handler ---
  const handleTouchButton = (videoKey: string, nextState: number, detectedNeed?: string) => {
    console.log("👆 [Touch] Botón presionado:", videoKey);
    playActionVideo(videoKey);
    setKioskState(nextState);
    
    // Enviar señal a LiveStand para botones táctiles
    if (videoKey === 'v5_luminous_white_lovers' || videoKey === 'v5_total_whitening') {
      localStorage.setItem('active_gondola_light', videoKey);
      localStorage.setItem('light_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('storage')); // Fuerza el evento en la misma pestaña por si acaso
      
      // Registrar interacción en Supabase con detected_need específico
      const need = detectedNeed || (videoKey === 'v5_luminous_white_lovers' ? 'manchas_cafe' : 'proteccion_integral');
      recordInteraction('touch', videoKey, need);
    }
  };

  // State 4 (Easter Egg) now just plays the video in the action layer — no hardcoded UI

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
      }}
    >
      {/* ===== BASE LAYER: Looping idle video ===== */}
      <video
        src={`${STORAGE_BASE}v5_idle.mp4`}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          objectFit: 'contain',
          backgroundColor: 'transparent',
          zIndex: 0,
          /* Táctica 2: Aceleración GPU */
          transform: 'translateZ(0)',
          willChange: 'transform, opacity',
        }}
      />

      {/* ===== ACTION LAYER: Response video overlay ===== */}
      <video
        ref={actionVideoRef}
        onEnded={handleActionEnded}
        onTimeUpdate={undefined}
        onPlaying={() => setActionVideoReady(true)}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          objectFit: 'contain',
          backgroundColor: 'transparent',
          opacity: actionPlaying && actionVideoReady ? 1 : 0,
          zIndex: 10,
          pointerEvents: actionPlaying ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
          /* Táctica 2: Aceleración GPU */
          transform: 'translateZ(0)',
          willChange: 'transform, opacity',
        }}
      />

      
      {/* ===== MIC STATUS INDICATOR ===== */}
      <MicIndicator status={micStatus} />

      {/* ===== MODE TOGGLE BUTTON ===== */}
      {started && !actionPlaying && kioskState >= 1 && kioskState < 4 && (
        <button
          onClick={toggleMode}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 px-8 py-3 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.8), rgba(34, 197, 94, 0.8))',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <span className="text-white font-medium text-lg tracking-wide">
            {isTouchMode ? 'Modo Táctil' : 'Modo Voz'}
          </span>
        </button>
      )}

      {/* ===== TOUCH MODE BUTTONS PANEL ===== */}
    {/* ===== TOUCH MODE: FASE 1 — Recomendación (kioskState 1) ===== */}
    {isTouchMode && started && !actionPlaying && kioskState === 1 && (
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          width: '400px',
        }}
      >
        {[
          { label: '☕ Amantes del Café', key: 'v5_luminous_white_lovers', state: 2 },
          { label: '🦷 Blancura y Protección Total', key: 'v5_total_whitening', state: 2 },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => handleTouchButton(btn.key, btn.state)}
            style={{
              padding: '22px 32px',
              borderRadius: '20px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
              backdropFilter: 'blur(25px)',
              color: '#fff',
              fontSize: '20px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(255,255,255,0.1)',
              transition: 'all 200ms ease',
              width: '100%',
              textAlign: 'center',
              letterSpacing: '0.5px',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
            onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {btn.label}
          </button>
        ))}
      </div>
    )}


      {/* ===== TAP TO START OVERLAY ===== */}
      {!started && (
        <div
          onClick={handleStart}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-10 h-10 text-white"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <p className="text-white text-2xl md:text-3xl font-bold tracking-tight">
              Toca la pantalla para hablar con Valentina
            </p>
            <p className="text-white/50 text-sm">Avatar IA · Colgate</p>
          </div>
        </div>
      )}

      {/* ===== Bóveda de Pre-carga Invisible ===== */}
      <div style={{ display: 'none' }}>
        <video src={`${STORAGE_BASE}v5_idle.mp4`} preload="auto" />
        <video src={`${STORAGE_BASE}v5_video_hook.mp4`} preload="auto" />
        <video src={`${STORAGE_BASE}v5_total_whitening.mp4`} preload="auto" />
        <video src={`${STORAGE_BASE}v5_luminous_white_lovers.mp4`} preload="auto" />
      </div>
    </div>
  );
};

export default Index;