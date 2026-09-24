import { describe, expect, it } from "vitest";
import { obterNavegacaoPermitida, obterPermissoes, temPermissao } from "@shared/permissoes";

describe("matriz de autorização do frontend", () => {
  it("mantém o usuário limitado às áreas públicas e de aprendizagem", () => {
    expect(temPermissao(["usuario"], "questionarios:responder")).toBe(true);
    expect(temPermissao(["usuario"], "administracao:consultar")).toBe(false);
    expect(obterNavegacaoPermitida(["usuario"]).map(item => item.id)).toEqual([
      "inicio",
      "materiais",
      "pontos",
      "questionarios",
      "desafios",
      "perfil",
    ]);
  });

  it("preserva permissões agregadas quando o usuário possui mais de um papel", () => {
    const permissoes = obterPermissoes(["pesquisador", "revisor"]);
    expect(permissoes).toContain("avaliacao_usabilidade:consultar_agregados");
    expect(permissoes).toContain("materiais:escrever");
    expect(permissoes).not.toContain("administracao:consultar");
  });
});
