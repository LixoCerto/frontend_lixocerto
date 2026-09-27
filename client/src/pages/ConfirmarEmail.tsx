import { useAuth } from "@/_core/hooks/useAuth";
import { CheckCircle2, Loader2, MailWarning, Recycle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

type Estado = "validando" | "confirmado" | "falha";

const MENSAGEM_TOKEN_AUSENTE = "O link está incompleto: o token de confirmação não foi encontrado na URL.";

/**
 * Confirma o e-mail a partir do link recebido.
 * O token é lido da query string e consumido uma única vez pela API.
 */
export default function ConfirmarEmail() {
  const { confirmarEmail } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [estado, setEstado] = useState<Estado>("validando");
  const [mensagem, setMensagem] = useState("Validando seu link de confirmação...");
  const [emailConfirmado, setEmailConfirmado] = useState<string | null>(null);
  const jaExecutou = useRef(false);

  const executar = useCallback(async (token: string) => {
    setEstado("validando");
    setMensagem("Validando seu link de confirmação...");
    try {
      const resposta = await confirmarEmail(token);
      setEmailConfirmado(resposta.emailUsuario);
      setMensagem(resposta.mensagemResultado || "E-mail confirmado com sucesso.");
      setEstado("confirmado");
    } catch (cause) {
      setMensagem(cause instanceof Error && cause.message.trim()
        ? cause.message
        : "Não foi possível confirmar este e-mail. O link pode ter expirado ou já ter sido utilizado.");
      setEstado("falha");
    }
  }, [confirmarEmail]);

  useEffect(() => {
    if (jaExecutou.current) return;
    jaExecutou.current = true;
    const token = new URLSearchParams(search).get("token")?.trim();
    if (!token) {
      setMensagem(MENSAGEM_TOKEN_AUSENTE);
      setEstado("falha");
      return;
    }
    void executar(token);
  }, [executar, search]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f7f4] px-5 py-10 text-[#17362a]">
      <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#d6efad]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-[#77be78]/25 blur-3xl" />
      <main className="relative z-10 w-full max-w-[540px]">
        <div className="rounded-[34px] border border-[#dfe9e1] bg-white/95 p-7 shadow-[0_32px_72px_-46px_rgba(23,54,42,.3)] sm:p-9">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#17362a] text-[#d6efad]"><Recycle className="h-6 w-6" /></span>
            <div>
              <strong className="block text-base font-black">Lixo Certo</strong>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b9485]">Confirmação de e-mail</span>
            </div>
          </div>

          <div className="mt-8">
            {estado === "validando" ? (
              <div role="status" className="text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#1d7953]" />
                <h1 className="mt-5 text-xl font-black">Confirmando seu e-mail</h1>
                <p className="mt-3 text-sm leading-6 text-[#6b8576]">{mensagem}</p>
              </div>
            ) : null}

            {estado === "confirmado" ? (
              <div role="status" className="text-center">
                <CheckCircle2 className="mx-auto h-11 w-11 text-[#2d8a5a]" />
                <h1 className="mt-5 text-xl font-black">E-mail confirmado</h1>
                <p className="mt-3 text-sm leading-6 text-[#6b8576]">{mensagem}</p>
                {emailConfirmado ? (
                  <p className="mt-4 rounded-xl bg-[#f2faf0] px-4 py-3 text-sm font-bold text-[#356b4a]">{emailConfirmado}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="mt-7 w-full rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#24533f]"
                >
                  Ir para o acesso
                </button>
              </div>
            ) : null}

            {estado === "falha" ? (
              <div role="alert" className="text-center">
                <MailWarning className="mx-auto h-11 w-11 text-[#b6603f]" />
                <h1 className="mt-5 text-xl font-black">Não foi possível confirmar</h1>
                <p className="mt-3 text-sm leading-6 text-[#6b8576]">{mensagem}</p>
                <p className="mt-4 rounded-xl bg-[#fff8e8] px-4 py-3 text-xs leading-5 font-semibold text-[#805a16]">
                  Cada link é de uso único e expira em 24 horas. Se necessário, entre na sua conta e solicite um novo envio.
                </p>
                <Link
                  href="/login"
                  className="mt-7 block w-full rounded-xl bg-[#17362a] px-5 py-3.5 text-center text-sm font-black text-white transition hover:bg-[#24533f]"
                >
                  Voltar para o acesso
                </Link>
              </div>
            ) : null}
          </div>

          <p className="mt-8 flex items-start gap-2 border-t border-[#edf2ed] pt-5 text-xs leading-5 text-[#7b9485]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3c8a5b]" />
            A confirmação é registrada na API com data e auditoria. Nenhum token é exibido ou armazenado no navegador.
          </p>
        </div>
      </main>
    </div>
  );
}