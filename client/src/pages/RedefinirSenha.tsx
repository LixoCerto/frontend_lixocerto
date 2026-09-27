import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, Recycle, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

type Estado = "formulario" | "sucesso";

function senhaValida(senha: string): boolean {
  return senha.length >= 12 && /[A-Za-z]/.test(senha) && /[0-9]/.test(senha);
}

function mensagemErro(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return "Não foi possível redefinir a senha agora. Tente novamente.";
}

/**
 * Redefine a senha a partir do link recebido por e-mail.
 * Ao concluir, todas as sessões abertas do usuário são revogadas pela API.
 */
export default function RedefinirSenha() {
  const { redefinirSenha } = useAuth();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [estado, setEstado] = useState<Estado>("formulario");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [sessoesRevogadas, setSessoesRevogadas] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [validandoToken, setValidandoToken] = useState(true);

  const token = useMemo(() => new URLSearchParams(search).get("token")?.trim() ?? "", [search]);

  useEffect(() => {
    setValidandoToken(false);
    if (!token) setErro("O link está incompleto: o token de redefinição não foi encontrado na URL.");
  }, [token]);

  const forcaSenha = useMemo(() => {
    if (novaSenha.length === 0) return { nivel: 0, rotulo: "Aguardando" };
    if (!senhaValida(novaSenha)) return { nivel: 1, rotulo: "Abaixo do mínimo exigido" };
    if (novaSenha.length >= 16 && /[^A-Za-z0-9]/.test(novaSenha)) return { nivel: 3, rotulo: "Forte" };
    return { nivel: 2, rotulo: "Aceitável" };
  }, [novaSenha]);

  async function submeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    if (!token) {
      setErro("O link está incompleto: o token de redefinição não foi encontrado na URL.");
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
      const resposta = await redefinirSenha(token, novaSenha);
      setMensagemSucesso(resposta.mensagemResultado || "Senha redefinida com sucesso.");
      setSessoesRevogadas(resposta.sessoesRevogadas);
      setEstado("sucesso");
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
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#17362a] text-[#d6efad]"><Recycle className="h-6 w-6" /></span>
            <div>
              <strong className="block text-base font-black">Lixo Certo</strong>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b9485]">Redefinição de senha</span>
            </div>
          </div>

          {validandoToken ? (
            <div role="status" className="mt-8 text-center">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#1d7953]" />
              <p className="mt-4 text-sm font-semibold text-[#6b8576]">Validando o link recebido...</p>
            </div>
          ) : null}

          {!validandoToken && estado === "formulario" ? (
            <form className="mt-8" onSubmit={(event) => void submeter(event)}>
              <h1 className="text-xl font-black">Crie uma nova senha</h1>
              <p className="mt-2 text-sm leading-6 text-[#6b8576]">
                O link é de uso único. Ao concluir, todas as sessões abertas da sua conta serão encerradas por segurança.
              </p>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Nova senha</span>
                  <input
                    value={novaSenha}
                    onChange={event => setNovaSenha(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60"
                    placeholder="Mínimo de 12 caracteres, letras e números"
                  />
                </label>

                {novaSenha.length > 0 ? (
                  <div>
                    <div className="flex h-1.5 gap-1.5">
                      {[1, 2, 3].map(nivel => (
                        <span
                          key={nivel}
                          className={`h-full flex-1 rounded-full ${forcaSenha.nivel >= nivel ? (forcaSenha.nivel === 3 ? "bg-[#2d8a5a]" : forcaSenha.nivel === 2 ? "bg-[#c9a227]" : "bg-[#c9756a]") : "bg-[#e4ece4]"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-bold text-[#7b9485]">Força da senha: {forcaSenha.rotulo}</p>
                  </div>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-[#5f7b6c]">Confirmar nova senha</span>
                  <input
                    value={confirmacao}
                    onChange={event => setConfirmacao(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4e9b68] focus:ring-4 focus:ring-[#dcefdc]/60"
                    placeholder="Repita a nova senha"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={enviando || !token}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#24533f] disabled:cursor-wait disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {enviando ? "Redefinindo..." : "Redefinir senha"}
              </button>

              {erro ? (
                <div role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold leading-6 text-[#a8493e]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {erro}
                </div>
              ) : null}
            </form>
          ) : null}

          {!validandoToken && estado === "sucesso" ? (
            <div role="status" className="mt-8 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[#2d8a5a]" />
              <h1 className="mt-5 text-xl font-black">Senha redefinida</h1>
              <p className="mt-3 text-sm leading-6 text-[#6b8576]">{mensagemSucesso}</p>
              {sessoesRevogadas !== null ? (
                <p className="mt-4 rounded-xl bg-[#f2faf0] px-4 py-3 text-sm font-bold text-[#356b4a]">
                  {sessoesRevogadas > 0
                    ? `${sessoesRevogadas} sessão(ões) encerrada(s) por segurança.`
                    : "Nenhuma sessão ativa precisou ser encerrada."}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className="mt-7 w-full rounded-xl bg-[#17362a] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#24533f]"
              >
                Entrar com a nova senha
              </button>
            </div>
          ) : null}

          {!validandoToken && estado === "formulario" && !token ? (
            <Link href="/login" className="mt-5 block text-center text-sm font-black text-[#1d7953]">Solicitar um novo link</Link>
          ) : null}

          <p className="mt-8 flex items-start gap-2 border-t border-[#edf2ed] pt-5 text-xs leading-5 text-[#7b9485]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3c8a5b]" />
            A senha é convertida em hash scrypt na API e nunca é armazenada em texto claro.
          </p>
        </div>
      </main>
    </div>
  );
}