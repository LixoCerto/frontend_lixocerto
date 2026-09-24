import { describe, expect, it } from "vitest";
import { obterNavegacaoPermitida, obterPermissoes, temPermissao } from "../shared/permissoes";

describe("matriz de permissões do Lixo Certo", () => {
  it("mantém o usuário em áreas de aprendizagem e impacto", () => {
    const navegacao = obterNavegacaoPermitida(["usuario"]);
    expect(navegacao.map(item => item.id)).toContain("materiais");
    expect(navegacao.map(item => item.id)).toContain("desafios");
    expect(navegacao.map(item => item.id)).not.toContain("administracao");
    expect(temPermissao(["usuario"], "auditoria:consultar")).toBe(false);
  });

  it("concede ao pesquisador apenas acesso a indicadores agregados", () => {
    const permissoes = obterPermissoes(["pesquisador"]);
    expect(permissoes).toContain("avaliacao_usabilidade:consultar_agregados");
    expect(permissoes).not.toContain("materiais:escrever");
    expect(permissoes).not.toContain("auditoria:consultar");
    expect(obterNavegacaoPermitida(["pesquisador"]).map(item => item.id)).not.toContain("questionarios");
  });

  it("expõe a central de revisão apenas para o revisor e administrador", () => {
    expect(obterNavegacaoPermitida(["revisor"]).map(item => item.id)).toContain("revisao");
    expect(obterNavegacaoPermitida(["usuario"]).map(item => item.id)).not.toContain("revisao");
  });

  it("libera todos os itens para o administrador", () => {
    expect(obterNavegacaoPermitida(["administrador"]).map(item => item.id)).toContain("administracao");
    expect(temPermissao(["administrador"], "auditoria:consultar")).toBe(true);
    expect(temPermissao(["administrador"], "questionarios:administrar")).toBe(true);
  });
});
