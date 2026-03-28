import { useState } from "react";
import { Loader2, CheckCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const registroSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre debe tener al menos 2 caracteres").max(100),
  cedula: z.string().trim().min(4, "Cédula inválida").max(20),
  telefono: z.string().trim().min(7, "Teléfono inválido").max(20),
});

type Step = "form" | "waiting" | "whatsapp";

const Registro = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", cedula: "", telefono: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const parsed = registroSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);

    // Optimistic UI: advance to WhatsApp immediately
    setStep("whatsapp");
    toast.success("¡Datos guardados!");

    // Background insert — don't block UI
    supabase.from("p3_demo_participantes").insert({
      nombre: parsed.data.nombre,
      cedula: parsed.data.cedula,
      telefono: parsed.data.telefono,
      estatus: "pending",
    } as any).select("id").single().then(({ data, error }) => {
      if (error) {
        console.error("[Registro] Background insert failed:", error.message);
        return;
      }
      if (data) {
        localStorage.setItem("p3_lead_id", data.id);
      }
    });
  };

  const goToScanner = () => {
    navigate("/scanner");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary px-4 py-5 text-center">
        <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
          Regístrate — Sorteo iPhone
        </h1>
        <p className="text-xs text-primary-foreground/70 mt-1 font-medium">
          P3 Publicidad &amp; Nexus Flow AI
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-5 max-w-md mx-auto w-full">

        {/* STEP: FORM */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 animate-in fade-in duration-300">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Completa tus datos para participar por el iPhone 📱
            </p>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nombre Completo *</label>
              <input
                type="text"
                autoComplete="name"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Tu nombre completo"
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {formErrors.nombre && <p className="text-xs text-destructive mt-1">{formErrors.nombre}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Cédula de Identidad *</label>
              <input
                type="text"
                autoComplete="off"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                placeholder="V-12345678"
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {formErrors.cedula && <p className="text-xs text-destructive mt-1">{formErrors.cedula}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Teléfono (WhatsApp) *</label>
              <input
                type="tel"
                autoComplete="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+58 412-1234567"
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {formErrors.telefono && <p className="text-xs text-destructive mt-1">{formErrors.telefono}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg mt-2"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Registrarme</>
              )}
            </button>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Al registrarte, aceptas los términos y condiciones del sorteo.
            </p>
          </form>
        )}

        {/* STEP: WAITING */}
        {step === "waiting" && (
          <div className="w-full flex flex-col items-center text-center gap-5 py-12 animate-in fade-in duration-500">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <h2 className="text-xl font-bold text-foreground">¡Registro exitoso!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Ahora realiza tu compra con productos Colgate. En unos momentos recibirás un mensaje de WhatsApp para subir tu factura. 🛒
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Esperando mensaje de WhatsApp...
            </div>
          </div>
        )}

        {/* STEP: WHATSAPP */}
        {step === "whatsapp" && (
          <div className="w-full flex flex-col items-center text-center gap-5 py-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full rounded-2xl bg-[#25D366] p-6 shadow-2xl cursor-pointer active:scale-[0.98] transition-all" onClick={goToScanner}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Sorteo Colgate</p>
                  <p className="text-white/70 text-xs">ahora</p>
                </div>
              </div>
              <p className="text-white text-base font-medium text-left leading-relaxed">
                ¡Hola {formData.nombre.split(" ")[0]}! 👋 Haz clic aquí para subir la foto de tu factura y completar tu participación en el sorteo del iPhone. 📸
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Toca el mensaje para continuar</p>
          </div>
        )}

      </main>
    </div>
  );
};

export default Registro;
