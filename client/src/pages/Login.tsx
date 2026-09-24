import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Recycle, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1d7953] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f6f7f4] px-5 py-10 text-[#17362a]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#d6efad]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#77be78]/25 blur-3xl" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-[24px] bg-[#1d7953] text-white shadow-[0_20px_40px_-16px_rgba(29,121,83,0.8)]">
            <Recycle className="h-8 w-8" />
          </div>
          <h1 className="mt-8 text-3xl font-black tracking-tight sm:text-4xl">Lixo Certo</h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-[#6d8a7b]">Educação em ação</p>
        </div>

        <div className="mt-10 rounded-[32px] border border-[#dfe9e1] bg-white/80 p-8 shadow-[0_32px_64px_-24px_rgba(23,54,42,0.15)] backdrop-blur-xl sm:p-10">
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#edf5e9] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#3e8257]">
                <Sparkles className="h-3.5 w-3.5" />
                Inicie sua jornada
              </span>
              <h2 className="mt-5 text-xl font-black">Bem-vindo à plataforma</h2>
              <p className="mt-3 text-sm leading-6 text-[#6c8879]">Acesse para acompanhar seu impacto, participar de desafios e colaborar com a educação ambiental.</p>
            </div>

            <button
              type="button"
              onClick={() => startLogin()}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#17362a] py-4 text-sm font-black text-white shadow-[0_16px_32px_-16px_rgba(23,54,42,0.6)] transition hover:-translate-y-0.5 hover:bg-[#1d4638]"
            >
              Entrar com Manus ID
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </button>

            <p className="text-center text-[11px] font-semibold text-[#8ba496]">
              Ao entrar, você concorda com nossas políticas de privacidade e termos de uso acadêmico.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-xs font-bold text-[#7b9485]">
          Projeto Lixo Certo · TCC II
        </p>
      </div>
    </div>
  );
}
