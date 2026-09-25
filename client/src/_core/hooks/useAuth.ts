import { useCallback, useEffect, useMemo, useState } from "react";
import {
  carregarUsuario,
  concluirLogin,
  encerrarLogin,
  getAccessToken,
  getCurrentUser,
  iniciarAtualizacaoSenha,
  iniciarCadastro,
  iniciarLogin,
  iniciarLoginGoogle,
  iniciarRecuperacaoSenha,
  loginGoogleDisponivel,
  oidcConfigured,
  setCurrentUser,
} from "@/lib/oidc";
import { obterIdentidade } from "@/lib/api";
import type { User } from "oidc-client-ts";

export type IdentidadeAutenticada = {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  papeisUsuario: string[];
  permissoesUsuario: string[];
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [identidade, setIdentidade] = useState<IdentidadeAutenticada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usuario = await carregarUsuario();
      setUser(usuario);
      if (usuario?.access_token) {
        setIdentidade(await obterIdentidade(usuario.access_token));
      } else {
        setIdentidade(null);
      }
    } catch (cause) {
      setUser(null);
      setIdentidade(null);
      setCurrentUser(null);
      setError(cause);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || user) return;
    if (window.location.pathname === redirectPath) return;
    window.location.assign(redirectPath);
  }, [loading, redirectOnUnauthenticated, redirectPath, user]);

  const login = useCallback(async () => {
    await iniciarLogin();
  }, []);

  const cadastro = useCallback(async () => {
    await iniciarCadastro();
  }, []);

  const recuperarSenha = useCallback(async () => {
    await iniciarRecuperacaoSenha();
  }, []);

  const alterarSenha = useCallback(async () => {
    await iniciarAtualizacaoSenha();
  }, []);

  const loginGoogle = useCallback(async () => {
    await iniciarLoginGoogle();
  }, []);

  const logout = useCallback(async () => {
    await encerrarLogin();
  }, []);

  return useMemo(
    () => ({
      user: user
        ? {
            openId: identidade?.idUsuario ?? user.profile.sub ?? "",
            name: identidade?.nomeUsuario || user.profile.name || user.profile.preferred_username || "",
            email: identidade?.emailUsuario || user.profile.email || null,
          }
        : null,
      identidade,
      loading,
      error,
      isAuthenticated: Boolean(user && getAccessToken()),
      oidcConfigured,
      loginGoogleDisponivel,
      login,
      cadastro,
      recuperarSenha,
      alterarSenha,
      loginGoogle,
      logout,
      refresh: carregar,
    }),
    [alterarSenha, cadastro, carregar, error, identidade, loading, login, loginGoogle, logout, recuperarSenha, user],
  );
}

export async function processarCallbackOidc(): Promise<void> {
  const user = await concluirLogin();
  setCurrentUser(user);
}
