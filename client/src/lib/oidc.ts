import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

const authority = import.meta.env.VITE_OIDC_ISSUER as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
const apiAudience = import.meta.env.VITE_OIDC_AUDIENCE as string | undefined;

export const oidcConfigured = Boolean(authority && clientId);

export const oidcManager = new UserManager({
  authority: authority ?? "https://invalid.local",
  client_id: clientId ?? "lixo-certo-web",
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI ?? `${window.location.origin}/callback`,
  post_logout_redirect_uri:
    import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI ?? `${window.location.origin}/login`,
  response_type: "code",
  scope: import.meta.env.VITE_OIDC_SCOPE ?? "openid profile email",
  extraQueryParams: apiAudience ? { audience: apiAudience } : undefined,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: false,
  monitorSession: false,
});

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

export async function iniciarLogin(): Promise<void> {
  if (!oidcConfigured) {
    throw new Error("OIDC não configurado. Defina VITE_OIDC_ISSUER e VITE_OIDC_CLIENT_ID.");
  }
  await oidcManager.signinRedirect();
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
