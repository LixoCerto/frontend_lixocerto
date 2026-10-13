import { useAuth } from "@/_core/hooks/useAuth";
import { GoogleIdentityButton } from "@/components/GoogleIdentityButton";
import { ArrowRight, CheckCircle2, LockKeyhole, MailCheck, ShieldCheck, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";

type Modo = "entrar" | "cadastro" | "recuperar";

function mensagemErro(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return "Não foi possível concluir a operação. Verifique os dados e tente novamente.";
}

function senhaValida(senha: string): boolean {
  return senha.length >= 12 && /[A-Za-z]/.test(senha) && /[0-9]/.test(senha);
}

function criarNonceGoogle(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export default function Login() {
  const { isAuthenticated, loading, login, loginGoogle, cadastro, solicitarVerificacaoEmail, solicitarRecuperacaoSenha } = useAuth();
  const [, setLocation] = useLocation();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [googleEnviando, setGoogleEnviando] = useState(false);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  const [nonceGoogle] = useState(() => googleClientId ? criarNonceGoogle() : "");

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  function trocarModo(novoModo: Modo) {
    setModo(novoModo);
    setErro(null);
    setAviso(null);
  }

  async function entrarComGoogle(credential: string) {
    setErro(null);
    setAviso(null);
    setGoogleEnviando(true);
    try {
      await loginGoogle(credential, nonceGoogle);
      setLocation("/");
    } catch (cause) {
      setErro(mensagemErro(cause));
    } finally {
      setGoogleEnviando(false);
    }
  }

  async function submeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setAviso(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErro("Informe um e-mail válido.");
      return;
    }

    if (modo === "recuperar") {
      setEnviando(true);
      try {
        const emailNormalizado = email.trim().toLowerCase();
        const resposta = await solicitarRecuperacaoSenha(emailNormalizado);
        setAviso(resposta.mensagemResultado);
        setEmail(emailNormalizado);
      } catch (cause) {
        setErro(mensagemErro(cause));
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (modo === "cadastro" && nome.trim().length < 2) {
      setErro("Informe seu nome completo.");
      return;
    }
    if (!senhaValida(senha)) {
      setErro("A senha deve possuir no mínimo 12 caracteres, letras e números.");
      return;
    }
    if (modo === "cadastro" && senha !== confirmacao) {
      setErro("A confirmação de senha não confere.");
      return;
    }

    setEnviando(true);
    try {
      const emailNormalizado = email.trim().toLowerCase();
      if (modo === "cadastro") {
        const resposta = await cadastro(nome.trim(), emailNormalizado, senha);
        if (resposta.requerVerificacaoEmail) {
          await solicitarVerificacaoEmail(emailNormalizado);
          setLocation(`/confirmar-email?email=${encodeURIComponent(emailNormalizado)}`);
          return;
        }
      } else {
        const resposta = await login(emailNormalizado, senha);
        if (resposta.requerVerificacaoEmail) {
          setLocation(`/confirmar-email?email=${encodeURIComponent(emailNormalizado)}`);
          return;
        }
      }
      setLocation("/");
    } catch (cause) {
      setErro(mensagemErro(cause));
    } finally {
      setEnviando(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d6efad] border-t-[#1d7953]" /></div>;
  }

  const cadastroAtivo = modo === "cadastro";
  const recuperacaoAtiva = modo === "recuperar";
  const rotuloBotao = enviando || googleEnviando
    ? "Aguarde..."
    : recuperacaoAtiva
      ? "Enviar código de recuperação"
      : cadastroAtivo
        ? "Criar conta e entrar"
        : "Entrar com segurança";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f6f7f4] text-[#17362a]">
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#d6efad]/45 blur-3xl" />
        <div className="absolute -bottom-36 -left-36 h-[24rem] w-[24rem] rounded-full bg-[#77be78]/25 blur-3xl" />
      </div>
      <main className="login-main relative z-10 grid min-h-screen grid-cols-1 gap-0 px-4 py-4 sm:gap-8 sm:px-5 sm:py-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:px-10 xl:px-16">
        <section className="hidden flex-col justify-between rounded-[36px] bg-[#17362a] p-7 text-white shadow-[0_40px_90px_-55px_rgba(23,54,42,.9)] sm:p-10 lg:flex lg:min-h-[calc(100dvh-9rem)]">
          <div>
            <div className="flex items-center gap-4">
              <img
                src="/logo-lixo-certo.png"
                alt="Logo do Lixo Certo"
                className="h-24 w-24 shrink-0 rounded-[24px] bg-white p-1 object-contain shadow-sm sm:h-28 sm:w-28"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6efad]">Portal oficial</p>
                <p className="mt-1 text-sm font-semibold text-[#b9d0c0]">Acesso seguro à plataforma</p>
              </div>
            </div>
            <div className="mt-16 max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-[#638c74] bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.11em] text-[#d4ead7]"><ShieldCheck className="h-3.5 w-3.5 text-[#d6efad]" /> JWT próprio + gRPC</span><h1 className="mt-6 text-4xl font-black tracking-[-0.055em] sm:text-5xl xl:text-6xl">Educação ambiental com acesso simples, seguro e rastreável.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-[#c5d9cb] sm:text-base">A API Lixo Certo controla cadastro, sessão, papéis e permissões. O frontend envia credenciais somente ao RPC de autenticação e usa o token de acesso nas demais chamadas.</p></div>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-3">{[["Sessão renovável", "Access token curto e refresh token revogável"], ["Permissões reais", "O menu acompanha o papel retornado pela API"], ["E-mail transacional", "Confirmação de conta e recuperação por link de uso único"]].map(([titulo, texto]) => <div key={titulo} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><CheckCircle2 className="h-5 w-5 text-[#d6efad]" /><strong className="mt-3 block text-sm">{titulo}</strong><p className="mt-1 text-xs leading-5 text-[#b8d0bf]">{texto}</p></div>)}</div>
        </section>

        <section className="flex w-full flex-col items-center justify-start py-0 lg:justify-center lg:py-4"><div className="w-full max-w-[520px]"><div className="mb-4 flex justify-center lg:hidden"><img src="/logo-lixo-certo.png" alt="Logo do Lixo Certo" className="h-24 w-24 object-contain sm:h-28 sm:w-28" /></div><div className="rounded-[28px] border border-[#dfe9e1] bg-white/90 p-4 shadow-[0_32px_72px_-46px_rgba(23,54,42,.28)] backdrop-blur-xl sm:rounded-[34px] sm:p-7">
          <div className="mb-6"><p className="hidden text-[11px] font-black uppercase tracking-[0.17em] text-[#3e8257] sm:block">Portal de acesso</p><h2 className="mt-0 text-2xl font-black tracking-[-0.035em] sm:mt-2">{cadastroAtivo ? "Crie sua conta" : recuperacaoAtiva ? "Recuperar senha" : "Entre na plataforma"}</h2><p className="mt-2 hidden text-sm leading-6 text-[#6b8576] sm:block">{cadastroAtivo ? "Comece a acompanhar seu impacto ambiental. Enviaremos um código para confirmar seu e-mail." : recuperacaoAtiva ? "Informe seu e-mail e enviaremos um código de uso único para criar uma nova senha." : "Use o e-mail e a senha da sua conta local."}</p></div>
          <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-[#f1f6ef] p-1"><button type="button" onClick={() => trocarModo("entrar")} className={`rounded-xl px-2 py-2.5 text-xs font-black ${modo === "entrar" ? "bg-white text-[#1d7953] shadow-sm" : "text-[#789083]"}`}>Entrar</button><button type="button" onClick={() => trocarModo("cadastro")} className={`rounded-xl px-2 py-2.5 text-xs font-black ${cadastroAtivo ? "bg-white text-[#1d7953] shadow-sm" : "text-[#789083]"}`}><span className="inline-flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> Cadastro</span></button><button type="button" onClick={() => trocarModo("recuperar")} className={`rounded-xl px-2 py-2.5 text-xs font-black ${recuperacaoAtiva ? "bg-white text-[#1d7953] shadow-sm" : "text-[#789083]"}`}>Esqueci</button></div>
          {!recuperacaoAtiva && googleClientId ? <div className="mb-6"><div className="relative mb-4 flex items-center justify-center"><div className="absolute inset-x-0 top-1/2 border-t border-[#dfe9e1]" /><span className="relative bg-white px-3 text-xs font-semibold text-[#7b9485]">ou continue com</span></div><GoogleIdentityButton clientId={googleClientId} nonce={nonceGoogle} disabled={enviando || googleEnviando} onCredential={(credential) => void entrarComGoogle(credential)} /></div> : null}<form className="space-y-4" onSubmit={(event) => void submeter(event)}>{cadastroAtivo ? <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Nome completo</span><input value={nome} onChange={event => setNome(event.target.value)} autoComplete="name" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Seu nome" /></label> : null}<label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">E-mail</span><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="voce@exemplo.com" /></label>{recuperacaoAtiva ? null : <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Senha</span><input value={senha} onChange={event => setSenha(event.target.value)} type="password" autoComplete={cadastroAtivo ? "new-password" : "current-password"} className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Mínimo de 12 caracteres" /></label>}{cadastroAtivo ? <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Confirmar senha</span><input value={confirmacao} onChange={event => setConfirmacao(event.target.value)} type="password" autoComplete="new-password" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Repita sua senha" /></label> : null}<button type="submit" disabled={enviando || googleEnviando} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(23,54,42,.9)] transition hover:bg-[#24533f] disabled:cursor-wait disabled:opacity-60">{rotuloBotao}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button></form>
          {erro ? <div role="alert" className="mt-5 rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold leading-6 text-[#a8493e]">{erro}</div> : null}{aviso ? <div role="status" className="mt-5 rounded-2xl border border-[#cfe3d1] bg-[#f2faf0] p-4 text-sm font-semibold leading-6 text-[#356b4a]"><MailCheck className="mb-2 h-5 w-5 text-[#3c8a5b]" />{aviso}{recuperacaoAtiva ? <button type="button" onClick={() => setLocation(`/redefinir-senha?email=${encodeURIComponent(email.trim().toLowerCase())}`)} className="mt-3 block font-black text-[#1d7953] underline">Já recebi o código</button> : null}</div> : null}
          <p className="mt-6 hidden items-start gap-2 text-xs leading-5 text-[#7b9485] sm:flex"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#3c8a5b]" /> A sessão fica no armazenamento temporário do navegador e é revogada pelo logout. Links de e-mail expiram e só podem ser usados uma vez.</p>
        </div><p className="mt-7 hidden text-center text-xs font-bold text-[#7b9485] sm:block">Projeto Lixo Certo · TCC II</p></div></section>
      </main>
    </div>
  );
}
