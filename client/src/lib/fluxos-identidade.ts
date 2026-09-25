export type FluxoIdentidade = "cadastro" | "recuperar-senha";

const endpointAutorizacao = "/protocol/openid-connect/auth";

const endpointsPorFluxo: Record<FluxoIdentidade, string> = {
  cadastro: "/protocol/openid-connect/registrations",
  "recuperar-senha": "/login-actions/reset-credentials",
};

/**
 * Troca somente o endpoint inicial do Keycloak e preserva todos os parâmetros
 * OIDC criados pelo oidc-client-ts: state, nonce, redirect_uri e PKCE.
 */
export function criarUrlFluxoIdentidade(
  urlAutorizacao: string,
  fluxo: FluxoIdentidade,
): string {
  const url = new URL(urlAutorizacao);

  if (!url.pathname.endsWith(endpointAutorizacao)) {
    throw new Error("O endpoint de autorização OIDC não possui o formato esperado.");
  }

  url.pathname = url.pathname.slice(0, -endpointAutorizacao.length) + endpointsPorFluxo[fluxo];
  return url.toString();
}

export function googleEstaHabilitado(valor: string | boolean | undefined): boolean {
  return valor === true || valor === "true";
}
