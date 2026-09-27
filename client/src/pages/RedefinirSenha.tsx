import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, CheckCircle2, KeyRound, Recycle, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

function senhaValida(senha: string): boolean {
  return senha.length >= 12 && /[A-Za-z]/.test(senha) && /[0-9]/.test(senha);
}

function mensagemErro(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return "Não foi possível redefinir a senha agora. Tente novamente.";
}

export default function RedefinirSenha() {
  const { redefinirSenha } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [email, setEmail] = useState(new URLSearchParams(search).get("email")?.trim() ?? "");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [sessoesRevogadas, setSessoesRevogadas] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
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
    if (!senhaValida(novaSenha)) {
      setErro("A senha deve possuir no mínimo 12 caracteres, letras e números.");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("A confirmação de senha não confere.");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await redefinirSenha(emailNormalizado, codigoNormalizado, novaSenha);
      setSucesso(resposta.mensagemResultado || "Senha redefinida com sucesso.");
      setSessoesRevogadas(resposta.sessoesRevogadas);
      setNovaSenha("");
      setConfirmacao("");
    } catch (cause) {
      setErro(mensagemErro(cause));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f7f4] px-5 py-10 text-[#17362a]">
      <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#d6efad]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-[#77be78]/25 blur-3xl" />
      <main className="relative z-10 w-full max-w-[540px]">
        <div className="rounded-[34px] border border-[#dfe9e1] bg-white/95 p-7 shadow-[0_32px_72px_-46px_rgba(23,54,42,.3)] sm:p-9">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#17362a] text-[#d6efad]"><Recycle className="h-6 w-6" /></span><div><strong className="block text-base font-black">Lixo Certo</strong><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b9485]">Redefinição de senha</span></div></div>
          {sucesso ? (
            <div className="mt-8 text-center"><CheckCircle2 className="mx-auto h-11 w-11 text-[#2d8a5a]" /><h1 className="mt-5 text-xl font-black">Senha redefinida</h1><p className="mt-3 text-sm leading-6 text-[#6b8576]">{sucesso}</p>{sessoesRevogadas !== null ? <p className="mt-4 rounded-xl bg-[#f2faf0] px-4 py-3 text-sm font-bold text-[#356b4a]">{sessoesRevogadas > 0 ? `${sessoesRevogadas} sessão(ões) encerrada(s) por segurança.` : "Nenhuma sessão ativa precisou ser encerrada."}</p> : null}<button type="button" onClick={() => setLocation("/login")} className="mt-7 w-full rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#24533f]">Entrar com a nova senha</button></div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={(event) => void submeter(event)}>
              <div><h1 className="text-xl font-black">Crie uma nova senha</h1><p className="mt-2 text-sm leading-6 text-[#6b8576]">Digite o código de 6 caracteres recebido por e-mail. O código é de uso único.</p></div>
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">E-mail</span><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="voce@exemplo.com" /></label>
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Código de redefinição</span><input value={codigo} onChange={event => setCodigo(event.target.value.toUpperCase().slice(0, 6))} inputMode="text" autoComplete="one-time-code" maxLength={6} className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-center text-lg font-black tracking-[0.35em] outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="ABC123" /></label>
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Nova senha</span><input value={novaSenha} onChange={event => setNovaSenha(event.target.value)} type="password" autoComplete="new-password" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Mínimo de 12 caracteres, letras e números" /></label>
              <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Confirmar nova senha</span><input value={confirmacao} onChange={event => setConfirmacao(event.target.value)} type="password" autoComplete="new-password" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Repita a nova senha" /></label>
              <button type="submit" disabled={enviando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#24533f] disabled:cursor-wait disabled:opacity-60"><KeyRound className="h-4 w-4" />{enviando ? "Redefinindo..." : "Redefinir senha"}</button>
              {erro ? <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold leading-6 text-[#a8493e]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{erro}</div> : null}
            </form>
          )}
          <p className="mt-8 flex items-start gap-2 border-t border-[#edf2ed] pt-5 text-xs leading-5 text-[#7b9485]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3c8a5b]" /> A senha é convertida em hash scrypt na API e todas as sessões anteriores são revogadas.</p>
          {!sucesso ? <Link href="/login" className="mt-5 block text-center text-sm font-black text-[#1d7953]">Voltar para o acesso</Link> : null}
        </div>
      </main>
    </div>
  );
}
