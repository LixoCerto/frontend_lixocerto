import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { processarCallbackOidc } from "@/_core/hooks/useAuth";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void processarCallbackOidc()
      .then(() => {
        if (ativo) setLocation("/");
      })
      .catch((cause: unknown) => {
        if (ativo) setErro(cause instanceof Error ? cause.message : "Não foi possível concluir o login.");
      });
    return () => {
      ativo = false;
    };
  }, [setLocation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-5 text-center text-[#17362a]">
      <div className="max-w-md rounded-[28px] border border-[#dfe9e1] bg-white p-8 shadow-[0_24px_50px_-28px_rgba(23,54,42,.25)]">
        {erro ? (
          <>
            <h1 className="text-xl font-black">Não foi possível concluir o login</h1>
            <p className="mt-3 text-sm leading-6 text-[#7c706c]">{erro}</p>
            <button type="button" onClick={() => setLocation("/login")} className="mt-6 rounded-xl bg-[#17362a] px-5 py-3 text-sm font-black text-white">Voltar ao login</button>
          </>
        ) : (
          <>
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d6efad] border-t-[#1d7953]" />
            <h1 className="mt-5 text-xl font-black">Validando sua sessão segura</h1>
            <p className="mt-3 text-sm text-[#6c8879]">Aguarde enquanto confirmamos sua identidade.</p>
          </>
        )}
      </div>
    </div>
  );
}
