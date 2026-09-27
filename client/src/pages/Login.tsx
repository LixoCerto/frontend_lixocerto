import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowRight, CheckCircle2, Info, LockKeyhole, Recycle, ShieldCheck, UserPlus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";

type Modo = "entrar" | "cadastro" | "recuperar";

function mensagemErro(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return "Não foi possível concluir a operação. Verifique os dados e tente novamente.";
}

export default function Login() {
  const { isAuthenticated, loading, login, cadastro } = useAuth();
  const [, setLocation] = useLocation();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  function trocarModo(novoModo: Modo) {
    setModo(novoModo);
    setErro(null);
    setAviso(null);
  }

  async function submeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setAviso(null);
    if (modo === "recuperar") {
      setAviso("A API gRPC própria ainda não possui RPC de recuperação de senha. O fluxo será incluído quando houver envio de e-mail e token de redefinição no backend.");
      return;
    }
    if (modo === "cadastro" && nome.trim().length < 2) {
      setErro("Informe seu nome completo.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErro("Informe um e-mail válido.");
      return;
    }
    if (senha.length < 12 || !/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) {
      setErro("A senha deve possuir no mínimo 12 caracteres, letras e números.");
      return;
    }
    if (modo === "cadastro" && senha !== confirmacao) {
      setErro("A confirmação de senha não confere.");
      return;
    }
    setEnviando(true);
    try {
      if (modo === "cadastro") await cadastro(nome.trim(), email.trim(), senha);
      else await login(email.trim(), senha);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f7f4] text-[#17362a]">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#d6efad]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -left-36 h-[24rem] w-[24rem] rounded-full bg-[#77be78]/25 blur-3xl" />
      <main className="relative z-10 grid min-h-screen gap-8 px-5 py-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10 xl:px-16">
        <section className="flex flex-col justify-between rounded-[36px] bg-[#17362a] p-7 text-white shadow-[0_40px_90px_-55px_rgba(23,54,42,.9)] sm:p-10 lg:min-h-[calc(100vh-4rem)]">
          <div>
            <div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-[22px] bg-[#d6efad] text-[#17362a]"><Recycle className="h-7 w-7" /></span><div><strong className="block text-lg font-black">Lixo Certo</strong><span className="text-xs font-bold uppercase tracking-[0.18em] text-[#b9d0c0]">Acesso local seguro</span></div></div>
            <div className="mt-16 max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-[#638c74] bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.11em] text-[#d4ead7]"><ShieldCheck className="h-3.5 w-3.5 text-[#d6efad]" /> JWT próprio + gRPC</span><h1 className="mt-6 text-4xl font-black tracking-[-0.055em] sm:text-5xl xl:text-6xl">Educação ambiental com acesso simples, seguro e rastreável.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-[#c5d9cb] sm:text-base">A API Lixo Certo controla cadastro, sessão, papéis e permissões. O frontend envia credenciais somente ao RPC de autenticação e usa o token de acesso nas demais chamadas.</p></div>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-3">{[["Sessão renovável", "Access token curto e refresh token revogável"], ["Permissões reais", "O menu acompanha o papel retornado pela API"], ["Sem provedor externo", "JWT assinado pela própria API do projeto"]].map(([titulo, texto]) => <div key={titulo} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><CheckCircle2 className="h-5 w-5 text-[#d6efad]" /><strong className="mt-3 block text-sm">{titulo}</strong><p className="mt-1 text-xs leading-5 text-[#b8d0bf]">{texto}</p></div>)}</div>
        </section>

        <section className="flex items-center justify-center py-4"><div className="w-full max-w-[520px]"><div className="rounded-[34px] border border-[#dfe9e1] bg-white/90 p-5 shadow-[0_32px_72px_-46px_rgba(23,54,42,.28)] backdrop-blur-xl sm:p-7">
          <div className="mb-6"><p className="text-[11px] font-black uppercase tracking-[0.17em] text-[#3e8257]">Portal de acesso</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">{cadastroAtivo ? "Crie sua conta" : recuperacaoAtiva ? "Recuperação de senha" : "Entre na plataforma"}</h2><p className="mt-2 text-sm leading-6 text-[#6b8576]">{cadastroAtivo ? "Comece a acompanhar seu impacto ambiental." : recuperacaoAtiva ? "Consulte a situação deste fluxo no contrato atual." : "Use o e-mail e a senha da sua conta local."}</p></div>
          <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-[#f1f6ef] p-1"><button type="button" onClick={() => trocarModo("entrar")} className={`rounded-xl px-2 py-2.5 text-xs font-black ${modo === "entrar" ? "bg-white text-[#1d7953] shadow-sm" : "text-[#789083]"}`}>Entrar</button><button type="button" onClick={() => trocarModo("cadastro")} className={`rounded-xl px-2 py-2.5 text-xs font-black ${cadastroAtivo ? "bg-white text-[#1d7953] shadow-sm" : "text-[#789083]"}`}><span className="inline-flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> Cadastro</span></button><button type="button" onClick={() => trocarModo("recuperar")} className={`rounded-xl px-2 py-2.5 text-xs font-black ${recuperacaoAtiva ? "bg-white text-[#1d7953] shadow-sm" : "text-[#789083]"}`}>Esqueci</button></div>
          {recuperacaoAtiva ? <div className="rounded-2xl border border-[#f2d0a8] bg-[#fff8e8] p-5 text-sm leading-6 text-[#805a16]"><Info className="h-5 w-5" /><strong className="mt-3 block">Fluxo ainda não exposto pela API</strong><p className="mt-2">A API própria já possui cadastro, login, renovação e logout. Recuperação por e-mail exige um novo contrato gRPC, envio de mensagem e token de uso único; por segurança, esta tela não simula essa operação.</p></div> : <form className="space-y-4" onSubmit={(event) => void submeter(event)}>{cadastroAtivo ? <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Nome completo</span><input value={nome} onChange={event => setNome(event.target.value)} autoComplete="name" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Seu nome" /></label> : null}<label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">E-mail</span><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="voce@exemplo.com" /></label><label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Senha</span><input value={senha} onChange={event => setSenha(event.target.value)} type="password" autoComplete={cadastroAtivo ? "new-password" : "current-password"} className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Mínimo de 12 caracteres" /></label>{cadastroAtivo ? <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Confirmar senha</span><input value={confirmacao} onChange={event => setConfirmacao(event.target.value)} type="password" autoComplete="new-password" className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60" placeholder="Repita sua senha" /></label> : null}<button type="submit" disabled={enviando} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(23,54,42,.9)] transition hover:bg-[#24533f] disabled:cursor-wait disabled:opacity-60">{enviando ? "Aguarde..." : cadastroAtivo ? "Criar conta e entrar" : "Entrar com segurança"}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button></form>}
          {erro ? <div role="alert" className="mt-5 rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold leading-6 text-[#a8493e]">{erro}</div> : null}{aviso ? <div role="status" className="mt-5 rounded-2xl border border-[#cfe3d1] bg-[#f2faf0] p-4 text-sm font-semibold leading-6 text-[#356b4a]">{aviso}</div> : null}
          <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#7b9485]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#3c8a5b]" /> A sessão fica no armazenamento temporário do navegador e é revogada pelo logout.</p>
        </div><p className="mt-7 text-center text-xs font-bold text-[#7b9485]">Projeto Lixo Certo · TCC II</p></div></section>
      </main>
    </div>
  );
}
