import { describe, expect, it } from "vitest";
import { interpretarResultadoMutacao } from "./resultado-mutacao";

describe("interpretarResultadoMutacao", () => {
  it("comunica sucesso quando a operação foi aceita e a lista atualizada", () => {
    expect(
      interpretarResultadoMutacao(
        { operacaoAceita: true, mensagemResultado: "Status atualizado." },
        true
      )
    ).toEqual({ tipo: "sucesso", mensagem: "Status atualizado." });
  });

  it("deixa claro que a operação foi aceita quando somente a atualização da lista falha", () => {
    expect(
      interpretarResultadoMutacao(
        { operacaoAceita: true, mensagemResultado: "Status atualizado." },
        false
      )
    ).toEqual({
      tipo: "erro",
      mensagem:
        "Status atualizado. O servidor aceitou a alteração, mas a lista não pôde ser atualizada. Atualize a consulta para conferir o estado atual.",
    });
  });

  it("não apresenta como aceita uma operação recusada pelo servidor", () => {
    expect(
      interpretarResultadoMutacao(
        { operacaoAceita: false, mensagemResultado: "Ponto não encontrado." },
        false
      )
    ).toEqual({ tipo: "erro", mensagem: "Ponto não encontrado." });
  });
});
