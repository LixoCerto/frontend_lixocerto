import { describe, expect, it } from "vitest";
import { criarUrlFluxoIdentidade, googleEstaHabilitado } from "./fluxos-identidade";

const urlAutorizacao =
  "http://localhost:8081/realms/lixo-certo/protocol/openid-connect/auth?client_id=lixo-certo-frontend&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&state=seguro&code_challenge=pkce";

describe("fluxos de identidade OIDC", () => {
  it("preserva state, PKCE e redirect URI ao iniciar o cadastro", () => {
    const url = new URL(criarUrlFluxoIdentidade(urlAutorizacao, "cadastro"));

    expect(url.pathname).toBe("/realms/lixo-certo/protocol/openid-connect/registrations");
    expect(url.searchParams.get("state")).toBe("seguro");
    expect(url.searchParams.get("code_challenge")).toBe("pkce");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/callback");
  });

  it("preserva os parâmetros OIDC ao iniciar a recuperação de senha", () => {
    const url = new URL(criarUrlFluxoIdentidade(urlAutorizacao, "recuperar-senha"));

    expect(url.pathname).toBe("/realms/lixo-certo/login-actions/reset-credentials");
    expect(url.searchParams.get("client_id")).toBe("lixo-certo-frontend");
    expect(url.searchParams.get("state")).toBe("seguro");
  });

  it("habilita Google apenas com sinalização explícita", () => {
    expect(googleEstaHabilitado("true")).toBe(true);
    expect(googleEstaHabilitado(true)).toBe(true);
    expect(googleEstaHabilitado("false")).toBe(false);
    expect(googleEstaHabilitado(undefined)).toBe(false);
  });
});
