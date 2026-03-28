import { useState, useRef } from "react";
import { Camera, Upload, RefreshCw, Loader2, CheckCircle, XCircle, Ticket, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisResult {
  es_factura_valida: boolean;
  contiene_colgate: boolean;
  productos_encontrados: string[];
  motivo_rechazo: string | null;
}

type Step = "scan" | "ticket";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Scanner = () => {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<Step>("scan");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleScan = async () => {
    if (!file || scanning) return;
    setScanning(true);
    setResult(null);

    try {
      const base64Data = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-receipt", {
        body: { imageBase64: base64Data },
      });

      if (error) throw error;

      const analysis = data as AnalysisResult;
      setResult(analysis);

      if (analysis.es_factura_valida && analysis.contiene_colgate) {
        toast.success("🎉 ¡Factura válida con productos Colgate!");

        // Update participante status to activo using localStorage ID
        const leadId = localStorage.getItem("p3_lead_id");
        if (leadId) {
          await supabase
            .from("p3_demo_participantes")
            .update({ estatus: "activo" } as any)
            .eq("id", leadId);
        }

        setStep("ticket");
      } else {
        toast.error(analysis.motivo_rechazo || "Factura rechazada.");
      }
    } catch (err: any) {
      toast.error("Error al analizar: " + (err.message || "Intenta de nuevo."));
    } finally {
      setScanning(false);
    }
  };

  // Digital Raffle Ticket screen
  if (step === "ticket") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex flex-col items-center justify-center px-6 py-12 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="max-w-sm flex flex-col items-center gap-6">
          {/* Confetti / fanfare visual */}
          <div className="relative">
            <div className="text-7xl animate-bounce">🎉</div>
            <PartyPopper className="absolute -top-2 -right-6 w-8 h-8 text-primary-foreground/80 animate-pulse" />
            <PartyPopper className="absolute -top-2 -left-6 w-8 h-8 text-primary-foreground/80 animate-pulse scale-x-[-1]" />
          </div>

          <h1 className="text-3xl font-black text-primary-foreground leading-tight tracking-tight">
            ¡FACTURA APROBADA!
          </h1>

          <div className="w-full rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border-2 border-dashed border-primary-foreground/30 p-6 flex flex-col items-center gap-4">
            <Ticket className="w-12 h-12 text-primary-foreground" />
            <p className="text-primary-foreground text-lg font-bold leading-snug">
              Tu ticket ya está en la tómbola digital 🎰
            </p>
            <div className="w-12 h-px bg-primary-foreground/30" />
            <p className="text-primary-foreground/80 text-sm font-medium">
              Mira la pantalla del Stand 📺
            </p>
          </div>

          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-primary-foreground/60 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary px-4 py-5 text-center">
        <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
          Valida tu Factura — Sorteo iPhone
        </h1>
        <p className="text-xs text-primary-foreground/70 mt-1 font-medium">
          P3 Publicidad &amp; Nexus Flow AI
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-5 max-w-md mx-auto w-full">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
        />

        {!image ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-[3/4] max-h-[420px] rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Tomar foto de la factura</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Upload className="w-3 h-3" /> o subir desde galería
            </span>
          </button>
        ) : (
          <div className="w-full relative rounded-2xl overflow-hidden border border-border shadow-sm">
            <img src={image} alt="Vista previa" className="w-full aspect-[3/4] max-h-[420px] object-cover" />
            <button
              onClick={() => { setImage(null); setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md active:scale-95 transition-transform"
            >
              <RefreshCw className="w-3 h-3" /> Cambiar foto
            </button>
          </div>
        )}

        {result && !result.es_factura_valida && (
          <div className="w-full rounded-xl border p-4 text-sm border-destructive/40 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <XCircle className="w-5 h-5" /> Factura Rechazada
            </div>
            {result.productos_encontrados.length > 0 && (
              <p className="mb-1"><span className="font-medium">Productos:</span> {result.productos_encontrados.join(", ")}</p>
            )}
            {result.motivo_rechazo && (
              <p><span className="font-medium">Motivo:</span> {result.motivo_rechazo}</p>
            )}
          </div>
        )}

        <button
          onClick={handleScan}
          disabled={!image || scanning}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {scanning ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analizando con IA...</>
          ) : (
            <><CheckCircle className="w-5 h-5" /> Escanear Factura</>
          )}
        </button>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Tu factura será analizada por inteligencia artificial.
        </p>
      </main>
    </div>
  );
};

export default Scanner;
