import { describe, expect, it } from "vitest";
import {
  obterNavegacaoPermitida,
  obterNavegacaoPermitidaPorPermissoes,
  obterPermissoes,
  podeAcessarPagina,
  temPermissao,
} from "@shared/permissoes";

describe("matriz de autorização do frontend", () => {
  it("mostra ao usuário comum somente aprendizagem, pesquisa de envio e áreas pessoais", () => {
    expect(temPermissao(["usuario"], "questionarios:responder")).toBe(true);
    expect(temPermissao(["usuario"], "gamificacao:participar")).toBe(true);
    expect(temPermissao(["usuario"], "administracao:consultar")).toBe(false);
    expect(obterNavegacaoPermitida(["usuario"]).map(item => item.id)).toEqual([
      "inicio",
      "materiais",
      "pontos",
      "questionarios",
      "desafios",
      "pesquisa",
      "perfil",
    ]);
  });

  it("mantém ao pesquisador apenas leitura agregada, sem expor quiz ou gestão", () => {
    expect(obterNavegacaoPermitida(["pesquisador"]).map(item => item.id)).toEqual([
      "inicio",
      "materiais",
      "pontos",
      "pesquisa",
      "perfil",
    ]);
    expect(temPermissao(["pesquisador"], "avaliacao_usabilidade:consultar_agregados")).toBe(true);
    expect(temPermissao(["pesquisador"], "questionarios:responder")).toBe(false);
    expect(temPermissao(["pesquisador"], "gamificacao:participar")).toBe(false);
  });

  it("mostra ao revisor as áreas que pode ler e moderar, sem pesquisa ou administração", () => {
    expect(obterNavegacaoPermitida(["revisor"]).map(item => item.id)).toEqual([
      "inicio",
      "materiais",
      "pontos",
      "questionarios",
      "desafios",
      "revisao",
      "perfil",
    ]);
    expect(temPermissao(["revisor"], "auditoria:consultar")).toBe(false);
  });

  it("preserva permissões agregadas quando o usuário possui mais de um papel", () => {
    const permissoes = obterPermissoes(["pesquisador", "revisor"]);
    expect(permissoes).toContain("avaliacao_usabilidade:consultar_agregados");
    expect(permissoes).toContain("materiais:escrever");
    expect(permissoes).not.toContain("administracao:consultar");
  });

  it("não abre telas cujo acesso exige uma capacidade ausente, mesmo com navegação direta", () => {
    expect(podeAcessarPagina("materiais", ["materiais:escrever"])).toBe(false);
    expect(podeAcessarPagina("revisao", ["materiais:escrever"])).toBe(false);
    expect(podeAcessarPagina("revisao", ["materiais:ler", "materiais:escrever"])).toBe(true);
    expect(podeAcessarPagina("desafios", ["gamificacao:ler"])).toBe(false);
    expect(podeAcessarPagina("desafios", ["gamificacao:ler", "gamificacao:participar"])).toBe(true);
    expect(podeAcessarPagina("desafios", ["gamificacao:administrar"])).toBe(true);
    expect(podeAcessarPagina("rota-inexistente", ["administracao:gerenciar_acessos"])).toBe(false);
  });

  it("exibe administração apenas para quem pode consultar resumo, gerir acessos ou consultar auditoria", () => {
    expect(obterNavegacaoPermitidaPorPermissoes(["auditoria:consultar"]).map(item => item.id)).toContain("administracao");
    expect(obterNavegacaoPermitidaPorPermissoes(["administracao:gerenciar_acessos"]).map(item => item.id)).toContain("administracao");
    expect(obterNavegacaoPermitidaPorPermissoes(["materiais:ler"]).map(item => item.id)).not.toContain("administracao");
  });
});
