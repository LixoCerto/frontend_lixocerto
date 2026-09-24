import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type PapelPersistido = "user" | "pesquisador" | "revisor" | "admin";

function criarContextoAutenticado(role: PapelPersistido): TrpcContext {
  return {
    user: {
      id: 1,
      openId: `usuario-${role}`,
      email: `${role}@exemplo.test`,
      name: "Usuário de teste",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.access", () => {
  it.each([
    ["user", "usuario", "materiais:ler"],
    ["pesquisador", "pesquisador", "avaliacao_usabilidade:consultar_agregados"],
    ["revisor", "revisor", "pontos_coleta:aprovar"],
    ["admin", "administrador", "auditoria:consultar"],
  ] as const)("traduz o nível persistido %s para %s e suas permissões", async (role, papelEsperado, permissaoEsperada) => {
    const caller = appRouter.createCaller(criarContextoAutenticado(role));
    const acesso = await caller.auth.access();

    expect(acesso.papel).toBe(papelEsperado);
    expect(acesso.permissoes).toContain(permissaoEsperada);
    expect(acesso.origem).toBe("sessao_autenticada");
  });
});
