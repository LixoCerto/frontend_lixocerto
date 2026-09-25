import {
  OidcClient,
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from "oidc-client-ts";
import {
  criarUrlFluxoIdentidade,
  googleEstaHabilitado,
  type FluxoIdentidade,
} from "./fluxos-identidade";

const authority = import.meta.env.VITE_OIDC_ISSUER as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
const apiAudience = import.meta.env.VITE_OIDC_AUDIENCE as string | undefined;
const stateStore = new WebStorageStateStore({ store: window.sessionStorage });

export const oidcConfigured = Boolean(authority && clientId);
export const loginGoogleDisponivel = googleEstaHabilitado(import.meta.env.VITE_OIDC_GOOGLE_ENABLED);

const oidcSettings: UserManagerSettings = {
  authority: authority ?? "https://invalid.local",
  client_id: clientId ?? "lixo-certo-web",
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI ?? `${window.location.origin}/callback`,
  post_logout_redirect_uri:
    import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI ?? `${window.location.origin}/login`,
  response_type: "code",
  scope: import.meta.env.VITE_OIDC_SCOPE ?? "openid profile email",
  extraQueryParams: apiAudience ? { audience: apiAudience } : undefined,
  stateStore,
  userStore: stateStore,
  automaticSilentRenew: false,
  monitorSession: false,
};

export const oidcManager = new UserManager(oidcSettings);
const oidcClient = new OidcClient(oidcSettings);

let currentUser: User | null = null;

export function setCurrentUser(user: User | null): void {
  currentUser = user;
}

export function getAccessToken(): string | null {
  return currentUser?.access_token ?? null;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

function assegurarConfiguracao(): void {
  if (!oidcConfigured) {
    throw new Error("OIDC não configurado. Defina VITE_OIDC_ISSUER e VITE_OIDC_CLIENT_ID.");
  }
}

async function iniciarFluxoNativo(fluxo: FluxoIdentidade): Promise<void> {
  assegurarConfiguracao();

  // OidcClient grava state, nonce e PKCE no mesmo sessionStorage usado pelo UserManager.
  const requisicao = await oidcClient.createSigninRequest({});
  window.location.assign(criarUrlFluxoIdentidade(requisicao.url, fluxo));
}

export async function iniciarLogin(): Promise<void> {
  assegurarConfiguracao();
  await oidcManager.signinRedirect();
}

export async function iniciarCadastro(): Promise<void> {
  await iniciarFluxoNativo("cadastro");
}

export async function iniciarRecuperacaoSenha(): Promise<void> {
  await iniciarFluxoNativo("recuperar-senha");
}

export async function iniciarAtualizacaoSenha(): Promise<void> {
  assegurarConfiguracao();
  await oidcManager.signinRedirect({
    prompt: "login",
    extraQueryParams: { kc_action: "UPDATE_PASSWORD" },
  });
}

export async function iniciarLoginGoogle(): Promise<void> {
  assegurarConfiguracao();
  if (!loginGoogleDisponivel) {
    throw new Error("O login com Google ainda não foi configurado para este ambiente.");
  }
  await oidcManager.signinRedirect({
    extraQueryParams: { kc_idp_hint: "google" },
  });
}

export async function concluirLogin(): Promise<User> {
  const user = await oidcManager.signinRedirectCallback();
  setCurrentUser(user);
  return user;
}

export async function carregarUsuario(): Promise<User | null> {
  const user = await oidcManager.getUser();
  setCurrentUser(user && !user.expired ? user : null);
  return user && !user.expired ? user : null;
}

export async function encerrarLogin(): Promise<void> {
  setCurrentUser(null);
  await oidcManager.removeUser();
  window.location.assign("/login");
}
