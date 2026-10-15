import { useAuth } from "@/_core/hooks/useAuth";
import { GoogleIdentityButton } from "@/components/GoogleIdentityButton";
import LixeirasSeletivas, { LixeirasSeletivasCompacta } from "@/components/LixeirasSeletivas";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MailCheck,
  MapPinned,
  ShieldCheck,
  Trophy,
  UserRound,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { lerTransicao, limparTransicao, marcarTransicao } from "@/components/TelaCarregamento";

type Modo = "entrar" | "cadastro" | "recuperar";

/** Jornada real do usuário na plataforma: guia de descarte -> pontos de coleta -> desafios e selos. */
const PASSOS = [
  { titulo: "Aprenda", texto: "Guia de descarte", Icone: BookOpen },
  { titulo: "Descarte", texto: "Pontos de coleta", Icone: MapPinned },
  { titulo: "Conquiste", texto: "Pontos e selos", Icone: Trophy },
];

const CLASSE_CAMPO =
  "h-12 w-full rounded-xl border border-[#d6e2d9] bg-white pl-11 pr-4 text-[15px] font-medium text-[#17362a] outline-none transition placeholder:text-[#a3b5aa] hover:border-[#b9cfc0] focus:border-[#1d7953] focus:ring-4 focus:ring-[#1d7953]/10";
const CLASSE_ROTULO = "mb-1.5 block text-sm font-bold text-[#2c4a3c]";
const CLASSE_ICONE_CAMPO = "pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#86a092]";

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
  const [aviso, setAviso] = useState<string | null>(() => lerTransicao() === "saida" ? "Você saiu da sua conta com segurança. Até a próxima!" : null);
  const [enviando, setEnviando] = useState(false);
  const [googleEnviando, setGoogleEnviando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  const [nonceGoogle] = useState(() => googleClientId ? criarNonceGoogle() : "");

  useEffect(() => {
    if (lerTransicao() === "saida") limparTransicao();
  }, []);

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
      marcarTransicao("entrada");
      await loginGoogle(credential, nonceGoogle);
      setLocation("/");
    } catch (cause) {
      limparTransicao();
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
      marcarTransicao("entrada");
      if (modo === "cadastro") {
        const resposta = await cadastro(nome.trim(), emailNormalizado, senha);
        if (resposta.requerVerificacaoEmail) {
          await solicitarVerificacaoEmail(emailNormalizado);
          limparTransicao();
          setLocation(`/confirmar-email?email=${encodeURIComponent(emailNormalizado)}`);
          return;
        }
      } else {
        const resposta = await login(emailNormalizado, senha);
        if (resposta.requerVerificacaoEmail) {
          limparTransicao();
          setLocation(`/confirmar-email?email=${encodeURIComponent(emailNormalizado)}`);
          return;
        }
      }
      setLocation("/");
    } catch (cause) {
      limparTransicao();
      setErro(mensagemErro(cause));
    } finally {
      setEnviando(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f9f6]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[#d6efad] border-t-[#1d7953]" /></div>;
  }

  const cadastroAtivo = modo === "cadastro";
  const recuperacaoAtiva = modo === "recuperar";
  const ocupado = enviando || googleEnviando;
  const regraTamanho = senha.length >= 12;
  const regraLetrasNumeros = /[A-Za-z]/.test(senha) && /[0-9]/.test(senha);
  const rotuloBotao = recuperacaoAtiva ? "Enviar código de recuperação" : cadastroAtivo ? "Criar minha conta" : "Entrar";
  const titulo = recuperacaoAtiva ? "Recuperar sua senha" : cadastroAtivo ? "Crie sua conta" : "Que bom ver você!";
  const subtitulo = recuperacaoAtiva
    ? "Informe o e-mail da sua conta. Enviaremos um código para você criar uma nova senha."
    : cadastroAtivo
      ? "É rápido e gratuito. Depois, é só confirmar seu e-mail."
      : "Entre para continuar aprendendo e somando pontos.";

  return (
    <div className="min-h-screen bg-[#f7f9f6] text-[#17362a] lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="login-painel relative hidden overflow-hidden text-white lg:flex lg:min-h-screen lg:flex-col lg:px-12 lg:py-10 xl:px-16 xl:py-12">
        <div className="login-painel__textura pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <img src="/logo-lixo-certo.png" alt="Logo do Lixo Certo" className="h-12 w-12 rounded-xl bg-white p-0.5 object-contain shadow-sm" />
          <div className="leading-tight">
            <p className="text-lg font-black tracking-[-0.02em]">Lixo Certo</p>
            <p className="text-xs font-semibold text-[#a9c7b3]">Educação ambiental</p>
          </div>
        </div>

        <div className="relative my-auto w-full py-6">
          <h1 className="text-[2.4rem] font-black leading-[1.05] tracking-[-0.035em] xl:text-[3rem]">
            Cada resíduo no lugar certo <span className="text-[#b8e07a]">vale pontos.</span>
          </h1>
          <p className="mt-4 max-w-[600px] text-base leading-7 text-[#bcd3c3]">
            Descubra como separar seu lixo, encontre pontos de coleta e transforme bons hábitos em conquistas.
          </p>
          <div className="mt-7">
            <LixeirasSeletivas />
          </div>
        </div>

        <ol className="relative grid w-full grid-cols-3 gap-3">
          {PASSOS.map(({ titulo: tituloPasso, texto, Icone }, indice) => (
            <li key={tituloPasso} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 transition hover:bg-white/[0.1]">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#d6efad] ring-1 ring-white/10">
                <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#b8e07a] text-[9px] font-black text-[#17362a]">{indice + 1}</span>
              </span>
              <span className="leading-tight">
                <strong className="block text-sm">{tituloPasso}</strong>
                <span className="text-xs text-[#a9c7b3]">{texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
          <div className="mb-8 flex flex-col items-center gap-4 lg:hidden">
            <img src="/logo-lixo-certo.png" alt="Logo do Lixo Certo" className="h-20 w-20 object-contain" />
            <LixeirasSeletivasCompacta />
          </div>

          {recuperacaoAtiva ? (
            <button type="button" onClick={() => trocarModo("entrar")} className="mb-5 inline-flex w-fit items-center gap-1.5 text-sm font-bold text-[#1d7953] hover:text-[#17362a]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para o login
            </button>
          ) : null}

          <h2 className="text-[1.75rem] font-black leading-tight tracking-[-0.03em]">{titulo}</h2>
          <p className="mt-2 text-[15px] leading-6 text-[#5f7a6b]">{subtitulo}</p>

          {!recuperacaoAtiva ? (
            <div className="mt-6 grid grid-cols-2 rounded-xl bg-[#e9f0eb] p-1" role="tablist" aria-label="Escolha como acessar">
              {(["entrar", "cadastro"] as const).map(opcao => {
                const selecionada = modo === opcao;
                return (
                  <button
                    key={opcao}
                    type="button"
                    role="tab"
                    aria-selected={selecionada}
                    onClick={() => trocarModo(opcao)}
                    className={`h-10 rounded-lg text-sm font-bold transition ${selecionada ? "bg-white text-[#17362a] shadow-[0_1px_3px_rgba(23,54,42,.15)]" : "text-[#5f7a6b] hover:text-[#17362a]"}`}
                  >
                    {opcao === "entrar" ? "Entrar" : "Criar conta"}
                  </button>
                );
              })}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={event => void submeter(event)} noValidate>
            {cadastroAtivo ? (
              <div>
                <label htmlFor="login-nome" className={CLASSE_ROTULO}>Nome completo</label>
                <div className="relative">
                  <UserRound className={CLASSE_ICONE_CAMPO} aria-hidden="true" />
                  <input id="login-nome" value={nome} onChange={event => setNome(event.target.value)} autoComplete="name" className={CLASSE_CAMPO} placeholder="Como devemos te chamar?" />
                </div>
              </div>
            ) : null}

            <div>
              <label htmlFor="login-email" className={CLASSE_ROTULO}>E-mail</label>
              <div className="relative">
                <Mail className={CLASSE_ICONE_CAMPO} aria-hidden="true" />
                <input id="login-email" value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" inputMode="email" className={CLASSE_CAMPO} placeholder="voce@exemplo.com" />
              </div>
            </div>

            {!recuperacaoAtiva ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="login-senha" className="text-sm font-bold text-[#2c4a3c]">Senha</label>
                  {!cadastroAtivo ? (
                    <button type="button" onClick={() => trocarModo("recuperar")} className="text-sm font-bold text-[#1d7953] hover:text-[#17362a] hover:underline">
                      Esqueci minha senha
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <LockKeyhole className={CLASSE_ICONE_CAMPO} aria-hidden="true" />
                  <input
                    id="login-senha"
                    value={senha}
                    onChange={event => setSenha(event.target.value)}
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete={cadastroAtivo ? "new-password" : "current-password"}
                    className={`${CLASSE_CAMPO} pr-12`}
                    placeholder={cadastroAtivo ? "Crie uma senha forte" : "Digite sua senha"}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(atual => !atual)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#6f8a7b] transition hover:bg-[#eef4ef] hover:text-[#17362a]"
                  >
                    {mostrarSenha ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
                {cadastroAtivo ? (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold" aria-label="Requisitos da senha">
                    {[
                      { ok: regraTamanho, texto: "12 caracteres ou mais" },
                      { ok: regraLetrasNumeros, texto: "Letras e números" },
                    ].map(regra => (
                      <li key={regra.texto} className={`inline-flex items-center gap-1.5 transition-colors ${regra.ok ? "text-[#1d7953]" : "text-[#8aa094]"}`}>
                        <span className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${regra.ok ? "bg-[#1d7953] text-white" : "bg-[#e3ebe5] text-transparent"}`}>
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                        {regra.texto}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {cadastroAtivo ? (
              <div>
                <label htmlFor="login-confirmacao" className={CLASSE_ROTULO}>Confirmar senha</label>
                <div className="relative">
                  <LockKeyhole className={CLASSE_ICONE_CAMPO} aria-hidden="true" />
                  <input id="login-confirmacao" value={confirmacao} onChange={event => setConfirmacao(event.target.value)} type={mostrarSenha ? "text" : "password"} autoComplete="new-password" className={CLASSE_CAMPO} placeholder="Repita a senha" />
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={ocupado}
              className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1d7953] text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_rgba(29,121,83,.8)] transition hover:bg-[#17362a] disabled:cursor-wait disabled:opacity-70"
            >
              {ocupado ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
              {ocupado ? "Aguarde..." : rotuloBotao}
              {ocupado ? null : <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />}
            </button>
          </form>

          {!recuperacaoAtiva && googleClientId ? (
            <div className="mt-6">
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute inset-x-0 top-1/2 border-t border-[#dfe8e1]" />
                <span className="relative bg-[#f7f9f6] px-3 text-xs font-semibold text-[#7b9485]">ou</span>
              </div>
              <GoogleIdentityButton clientId={googleClientId} nonce={nonceGoogle} disabled={ocupado} onCredential={credential => void entrarComGoogle(credential)} />
            </div>
          ) : null}

          {erro ? (
            <div role="alert" className="mt-5 rounded-xl border border-[#f0c6c1] bg-[#fff5f3] px-4 py-3 text-sm font-semibold leading-6 text-[#a8493e]">{erro}</div>
          ) : null}
          {aviso ? (
            <div role="status" className="mt-5 flex gap-3 rounded-xl border border-[#cfe3d1] bg-[#f1f9ef] px-4 py-3 text-sm font-semibold leading-6 text-[#356b4a]">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#3c8a5b]" aria-hidden="true" />
              <div>
                {aviso}
                {recuperacaoAtiva ? (
                  <button type="button" onClick={() => setLocation(`/redefinir-senha?email=${encodeURIComponent(email.trim().toLowerCase())}`)} className="mt-1 block font-bold text-[#1d7953] underline">
                    Já recebi o código
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="mx-auto mt-8 flex w-full max-w-[420px] items-center justify-between gap-3 text-xs font-semibold text-[#8aa094]">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#3c8a5b]" aria-hidden="true" /> Conexão segura</span>
          <span>Projeto Lixo Certo · TCC II</span>
        </footer>
      </main>
    </div>
  );
}
