import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cadastrarUsuario,
  confirmarEmail as confirmarEmailApi,
  entrar,
  obterIdentidadeAtual,
  redefinirSenha as redefinirSenhaApi,
  renovarToken,
  sair,
  solicitarRecuperacaoSenha as solicitarRecuperacaoSenhaApi,
  solicitarVerificacaoEmail as solicitarVerificacaoEmailApi,
} from "@/lib/api";
import {
  carregarSessao,
  limparSessao,
  obterExpiracaoToken,
  obterTokenAtualizacao,
  obterTokenAcesso,
  salvarSessao,
  tokenExpirado,
  type SessaoLocal,
} from "@/lib/sessao";

export type IdentidadeAutenticada = {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  papeisUsuario: string[];
  permissoesUsuario: string[];
  emailVerificadoUsuario: boolean;
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

function normalizarIdentidade(identidade: {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  papeisUsuario: readonly string[];
  permissoesUsuario: readonly string[];
  emailVerificadoUsuario: boolean;
}): IdentidadeAutenticada {
  return {
    idUsuario: identidade.idUsuario,
    nomeUsuario: identidade.nomeUsuario,
    emailUsuario: identidade.emailUsuario,
    papeisUsuario: [...identidade.papeisUsuario],
    permissoesUsuario: [...identidade.permissoesUsuario],
    emailVerificadoUsuario: identidade.emailVerificadoUsuario,
  };
}

function erroLegivel(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return "Não foi possível concluir a operação de autenticação.";
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const [sessao, setSessao] = useState<SessaoLocal | null>(() => carregarSessao());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const aplicarSessao = useCallback((novaSessao: SessaoLocal | null) => {
    setSessao(novaSessao);
    if (novaSessao) salvarSessao(novaSessao);
    else limparSessao();
  }, []);

  const renovar = useCallback(async (): Promise<SessaoLocal | null> => {
    const tokenAtualizacao = obterTokenAtualizacao();
    if (!tokenAtualizacao) return null;
    const resposta = await renovarToken(tokenAtualizacao);
    const novaSessao: SessaoLocal = {
      tokenAcesso: resposta.tokenAcesso,
      tokenAtualizacao: resposta.tokenAtualizacao,
      expiraEmSegundos: resposta.expiraEmSegundos,
      identidade: resposta.identidade!,
    };
    aplicarSessao(novaSessao);
    return novaSessao;
  }, [aplicarSessao]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let atual = carregarSessao();
      if (atual && tokenExpirado(atual.tokenAcesso, 15_000)) {
        atual = await renovar();
      }
      if (atual) {
        const identidade = await obterIdentidadeAtual();
        atual = { ...atual, identidade: normalizarIdentidade(identidade) };
        salvarSessao(atual);
        setSessao(atual);
      } else {
        aplicarSessao(null);
      }
    } catch (cause) {
      aplicarSessao(null);
      setError(cause);
    } finally {
      setLoading(false);
    }
  }, [aplicarSessao, renovar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || sessao) return;
    if (window.location.pathname === redirectPath) return;
    window.location.assign(redirectPath);
  }, [loading, redirectOnUnauthenticated, redirectPath, sessao]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      const token = obterTokenAcesso();
      if (token && tokenExpirado(token, 60_000)) void renovar().catch(() => aplicarSessao(null));
    }, 30_000);
    return () => window.clearInterval(intervalo);
  }, [aplicarSessao, renovar]);

  useEffect(() => {
    const sincronizar = () => setSessao(carregarSessao());
    window.addEventListener("lcr:sessao-alterada", sincronizar);
    return () => window.removeEventListener("lcr:sessao-alterada", sincronizar);
  }, []);

  const executarLogin = useCallback(async (email: string, senha: string) => {
    const resposta = await entrar(email, senha);
    aplicarSessao({
      tokenAcesso: resposta.tokenAcesso,
      tokenAtualizacao: resposta.tokenAtualizacao,
      expiraEmSegundos: resposta.expiraEmSegundos,
      identidade: resposta.identidade!,
    });
  }, [aplicarSessao]);

  const executarCadastro = useCallback(async (nome: string, email: string, senha: string) => {
    const resposta = await cadastrarUsuario(nome, email, senha);
    aplicarSessao({
      tokenAcesso: resposta.tokenAcesso,
      tokenAtualizacao: resposta.tokenAtualizacao,
      expiraEmSegundos: resposta.expiraEmSegundos,
      identidade: resposta.identidade!,
    });
  }, [aplicarSessao]);

  const logout = useCallback(async () => {
    const tokenAtualizacao = obterTokenAtualizacao();
    try {
      if (tokenAtualizacao) await sair(tokenAtualizacao);
    } finally {
      aplicarSessao(null);
      window.location.assign("/login");
    }
  }, [aplicarSessao]);

  const identidade = sessao?.identidade ?? null;
  const solicitarVerificacaoEmail = useCallback((email: string) => solicitarVerificacaoEmailApi(email), []);
  const confirmarEmail = useCallback((token: string) => confirmarEmailApi(token), []);
  const solicitarRecuperacaoSenha = useCallback((email: string) => solicitarRecuperacaoSenhaApi(email), []);
  const redefinirSenha = useCallback((token: string, novaSenha: string) => redefinirSenhaApi(token, novaSenha), []);

  const user = identidade
    ? {
        openId: identidade.idUsuario,
        name: identidade.nomeUsuario,
        email: identidade.emailUsuario,
      }
    : null;
  const expiracao = obterExpiracaoToken(sessao?.tokenAcesso ?? null);

  return useMemo(
    () => ({
      user,
      identidade,
      loading,
      error,
      isAuthenticated: Boolean(sessao?.tokenAcesso),
      login: executarLogin,
      cadastro: executarCadastro,
      logout,
      solicitarVerificacaoEmail,
      confirmarEmail,
      solicitarRecuperacaoSenha,
      redefinirSenha,
      refresh: carregar,
      renovar,
      expiraEm: expiracao,
      erroLegivel,
    }),
    [carregar, error, executarCadastro, executarLogin, identidade, loading, logout, renovar, sessao?.tokenAcesso, user, expiracao],
  );
}
