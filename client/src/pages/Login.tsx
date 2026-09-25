import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  MailCheck,
  Recycle,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { type ElementType, type ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";

interface AcaoAcessoProps {
  titulo: string;
  descricao: string;
  icone: ElementType;
  onClick: () => void;
  destaque?: boolean;
  disabled?: boolean;
}

function AcaoAcesso({ titulo, descricao, icone: Icone, onClick, destaque, disabled }: AcaoAcessoProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
        destaque
          ? "border-[#17362a] bg-[#17362a] text-white shadow-[0_20px_40px_-22px_rgba(23,54,42,.75)]"
          : "border-[#dfe9e1] bg-white/80 text-[#17362a] hover:border-[#b8dcc0] hover:bg-[#f8fcf6]"
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${destaque ? "bg-[#d6efad] text-[#17362a]" : "bg-[#edf5e9] text-[#287a50]"}`}>
        <Icone className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-black">{titulo}</strong>
        <span className={`mt-1 block text-xs leading-5 ${destaque ? "text-[#c4d7ca]" : "text-[#6b8576]"}`}>{descricao}</span>
      </span>
      <ArrowRight className={`h-4 w-4 shrink-0 transition group-hover:translate-x-1 ${destaque ? "text-[#d6efad]" : "text-[#58956e]"}`} />
    </button>
  );
}

function Selo({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe8df] bg-white/70 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.11em] text-[#47765c]">
      {children}
    </span>
  );
}

export default function Login() {
  const {
    isAuthenticated,
    loading,
    oidcConfigured,
    loginGoogleDisponivel,
    login,
    cadastro,
    recuperarSenha,
    loginGoogle,
  } = useAuth();
  const [, setLocation] = useLocation();
  const [erro, setErro] = useState<string | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);
  const caixaLocalUrl = import.meta.env.VITE_MAILPIT_URL ?? "http://localhost:8025";

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  async function executar(rotulo: string, acao: () => Promise<void>) {
    setErro(null);
    setAcaoEmAndamento(rotulo);
    try {
      await acao();
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : `Não foi possível iniciar ${rotulo}.`);
      setAcaoEmAndamento(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1d7953] border-t-transparent" />
      </div>
    );
  }

  const desabilitado = !oidcConfigured || Boolean(acaoEmAndamento);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f7f4] text-[#17362a]">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#d6efad]/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -left-36 h-[24rem] w-[24rem] rounded-full bg-[#77be78]/25 blur-3xl" />
      <div className="pointer-events-none absolute left-[45%] top-[18%] h-40 w-40 rounded-full bg-[#e6c866]/15 blur-3xl" />

      <main className="relative z-10 grid min-h-screen gap-8 px-5 py-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10 xl:px-16">
        <section className="flex flex-col justify-between rounded-[36px] bg-[#17362a] p-7 text-white shadow-[0_40px_90px_-55px_rgba(23,54,42,.9)] sm:p-10 lg:min-h-[calc(100vh-4rem)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-[22px] bg-[#d6efad] text-[#17362a] shadow-[0_18px_38px_-24px_rgba(214,239,173,.95)]">
                <Recycle className="h-7 w-7" />
              </span>
              <div>
                <strong className="block text-lg font-black tracking-tight">Lixo Certo</strong>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#b9d0c0]">Identidade segura</span>
              </div>
            </div>

            <div className="mt-16 max-w-2xl">
              <Selo><ShieldCheck className="h-3.5 w-3.5" /> OIDC + PKCE</Selo>
              <h1 className="mt-6 text-4xl font-black tracking-[-0.055em] sm:text-5xl xl:text-6xl">
                Acesso profissional para educação ambiental, pesquisa e operação.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#c5d9cb] sm:text-base">
                Cadastro, login, confirmação de e-mail, recuperação de senha e provedores sociais são executados pelo Keycloak. O frontend nunca recebe senha nem segredo de cliente.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {[
              ["Senha protegida", "Credenciais ficam no provedor OIDC"],
              ["E-mail validado", "Links chegam na caixa local de testes"],
              ["Google pronto", "Ativação depende do OAuth Client real"],
            ].map(([titulo, texto]) => (
              <div key={titulo} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <CheckCircle2 className="h-5 w-5 text-[#d6efad]" />
                <strong className="mt-3 block text-sm">{titulo}</strong>
                <p className="mt-1 text-xs leading-5 text-[#b8d0bf]">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center py-4">
          <div className="w-full max-w-[520px]">
            <div className="rounded-[34px] border border-[#dfe9e1] bg-white/82 p-5 shadow-[0_32px_72px_-46px_rgba(23,54,42,.28)] backdrop-blur-xl sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.17em] text-[#3e8257]">Portal de acesso</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Entre ou crie sua conta</h2>
                </div>
                <span className="rounded-full bg-[#edf5e9] px-3 py-1.5 text-[11px] font-black text-[#2d754d]">Ambiente seguro</span>
              </div>

              <div className="space-y-3">
                <AcaoAcesso
                  titulo="Entrar com e-mail e senha"
                  descricao="Acesse pelo Keycloak local com Authorization Code + PKCE."
                  icone={LockKeyhole}
                  destaque
                  disabled={desabilitado}
                  onClick={() => void executar("o login", login)}
                />
                <AcaoAcesso
                  titulo="Criar conta"
                  descricao="Abre o cadastro oficial do provedor; e-mail e senha são tratados fora do React."
                  icone={UserPlus}
                  disabled={desabilitado}
                  onClick={() => void executar("o cadastro", cadastro)}
                />
                <AcaoAcesso
                  titulo="Esqueci minha senha"
                  descricao="Envia o link de redefinição pelo fluxo seguro de recuperação do Keycloak."
                  icone={KeyRound}
                  disabled={desabilitado}
                  onClick={() => void executar("a recuperação de senha", recuperarSenha)}
                />
                <AcaoAcesso
                  titulo="Entrar com Google"
                  descricao={loginGoogleDisponivel ? "Usa o provedor social Google configurado no Keycloak." : "Disponível após informar Client ID e Client Secret do Google no .env local."}
                  icone={AtSign}
                  disabled={desabilitado || !loginGoogleDisponivel}
                  onClick={() => void executar("o login com Google", loginGoogle)}
                />
              </div>

              {!oidcConfigured ? (
                <div className="mt-5 rounded-2xl border border-[#f2d0a8] bg-[#fff8e8] p-4 text-sm font-bold leading-6 text-[#9b6813]">
                  Configure VITE_OIDC_ISSUER e VITE_OIDC_CLIENT_ID para habilitar os fluxos de identidade.
                </div>
              ) : null}

              {erro ? (
                <div role="alert" className="mt-5 rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold leading-6 text-[#a8493e]">
                  {erro}
                </div>
              ) : null}

              {acaoEmAndamento ? (
                <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.12em] text-[#47765c]">Redirecionando para {acaoEmAndamento}...</p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a href={caixaLocalUrl} target="_blank" rel="noreferrer" className="group rounded-2xl border border-[#dfe9e1] bg-white/70 p-4 text-sm font-bold text-[#315c47] transition hover:-translate-y-0.5 hover:border-[#b8dcc0]">
                <MailCheck className="mb-3 h-5 w-5 text-[#287a50]" />
                Caixa de e-mail local
                <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#6b8576]">Abrir Mailpit <ExternalLink className="h-3.5 w-3.5" /></span>
              </a>
              <div className="rounded-2xl border border-[#dfe9e1] bg-white/70 p-4 text-sm font-bold text-[#315c47]">
                <Sparkles className="mb-3 h-5 w-5 text-[#a66a09]" />
                Padrão profissional
                <p className="mt-1 text-xs font-semibold leading-5 text-[#6b8576]">Use a tela do provedor para senha, registro e validação. O app só recebe tokens OIDC.</p>
              </div>
            </div>

            <p className="mt-7 text-center text-xs font-bold text-[#7b9485]">Projeto Lixo Certo · TCC II</p>
          </div>
        </section>
      </main>
    </div>
  );
}
