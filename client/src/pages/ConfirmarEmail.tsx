import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, CheckCircle2, MailCheck, Recycle, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

function mensagemErro(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return "Não foi possível confirmar o e-mail. Verifique o código e tente novamente.";
}

export default function ConfirmarEmail() {
  const { confirmarEmail, solicitarVerificacaoEmail } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const parametros = new URLSearchParams(search);
  const [email, setEmail] = useState(parametros.get("email")?.trim() ?? "");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function submeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setAviso(null);
    const emailNormalizado = email.trim().toLowerCase();
    const codigoNormalizado = codigo.trim().toUpperCase();
    if (!/^\S+@\S+\.\S+$/.test(emailNormalizado)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    if (!/^[A-Z0-9]{6}$/.test(codigoNormalizado)) {
      setErro("Informe o código de 6 caracteres recebido por e-mail.");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await confirmarEmail(emailNormalizado, codigoNormalizado);
      setConfirmado(resposta.emailConfirmado);
      setAviso(resposta.mensagemResultado || "E-mail confirmado com sucesso.");
    } catch (cause) {
      setErro(mensagemErro(cause));
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setErro(null);
    setAviso(null);
    const emailNormalizado = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(emailNormalizado)) {
      setErro("Informe um e-mail válido antes de solicitar um novo código.");
      return;
    }
    setReenviando(true);
    try {
      const resposta = await solicitarVerificacaoEmail(emailNormalizado);
      setAviso(resposta.mensagemResultado);
    } catch (cause) {
      setErro(mensagemErro(cause));
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f7f4] px-5 py-10 text-[#17362a]">
      <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#d6efad]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-[#77be78]/25 blur-3xl" />
      <main className="relative z-10 w-full max-w-[540px]">
        <div className="rounded-[34px] border border-[#dfe9e1] bg-white/95 p-7 shadow-[0_32px_72px_-46px_rgba(23,54,42,.3)] sm:p-9">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#17362a] text-[#d6efad]"><Recycle className="h-6 w-6" /></span><div><strong className="block text-base font-black">Lixo Certo</strong><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4b6657]">Confirmação de e-mail</span></div></div>
          {confirmado ? (
            <div className="mt-8 text-center"><CheckCircle2 className="mx-auto h-11 w-11 text-[#2d8a5a]" /><h1 className="mt-5 text-xl font-black">E-mail confirmado</h1><p className="mt-3 text-sm leading-6 text-[#4b6657]">{aviso}</p><button type="button" onClick={() => setLocation("/login")} className="mt-7 w-full rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#24533f]">Ir para o acesso</button></div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={(event) => void submeter(event)}>
              <div><h1 className="text-xl font-black">Confirme seu e-mail</h1><p className="mt-2 text-sm leading-6 text-[#4b6657]">Digite o código de 6 caracteres enviado para o seu e-mail. O código expira e só pode ser usado uma vez.</p></div>
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">E-mail</span><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="voce@exemplo.com" /></label>
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Código de confirmação</span><input value={codigo} onChange={event => setCodigo(event.target.value.toUpperCase().slice(0, 6))} inputMode="text" autoComplete="one-time-code" maxLength={6} className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-center text-lg font-black tracking-[0.35em] outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="ABC123" /></label>
              <button type="submit" disabled={enviando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#24533f] disabled:cursor-wait disabled:opacity-60"><MailCheck className="h-4 w-4" />{enviando ? "Confirmando..." : "Confirmar e-mail"}</button>
              <button type="button" disabled={reenviando} onClick={() => void reenviar()} className="w-full rounded-xl border border-[#cfe3d1] px-5 py-3 text-sm font-black text-[#1d7953] transition hover:bg-[#f2faf0] disabled:opacity-60">{reenviando ? "Enviando..." : "Reenviar código"}</button>
              {erro ? <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold leading-6 text-[#a8493e]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{erro}</div> : null}
              {aviso ? <div role="status" className="rounded-2xl border border-[#cfe3d1] bg-[#f2faf0] p-4 text-sm font-semibold leading-6 text-[#356b4a]">{aviso}</div> : null}
            </form>
          )}
          <p className="mt-8 flex items-start gap-2 border-t border-[#edf2ed] pt-5 text-xs leading-5 text-[#4b6657]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3c8a5b]" /> O código é validado e consumido pela API. Nunca armazenamos o código em texto claro.</p>
          {!confirmado ? <Link href="/login" className="mt-5 block text-center text-sm font-black text-[#1d7953]">Voltar para o acesso</Link> : null}
        </div>
      </main>
    </div>
  );
}
