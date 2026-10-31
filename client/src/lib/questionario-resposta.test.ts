import { describe, expect, it } from "vitest";
import { interpretarRespostaQuestionario } from "./questionario-resposta";

const dadosResposta = {
  indicaCorreta: false,
  quantidadePontos: 0,
  explicacaoResposta: "",
};

describe("interpretarRespostaQuestionario", () => {
  it("só confirma sucesso quando a tentativa foi registrada", () => {
    expect(
      interpretarRespostaQuestionario({
        ...dadosResposta,
        tentativaRegistrada: true,
        questaoJaRespondida: false,
        indicaCorreta: true,
        quantidadePontos: 25,
        explicacaoResposta: "Correta.",
      })
    ).toEqual({
      estado: "registrada",
      feedback: { correta: true, pontos: 25, explicacao: "Correta." },
      mensagem: "Resposta correta: +25 pontos. Esta questão foi encerrada.",
    });
  });

  it("informa tentativa repetida sem apresentá-la como resposta nova", () => {
    expect(
      interpretarRespostaQuestionario({
        ...dadosResposta,
        tentativaRegistrada: false,
        questaoJaRespondida: true,
        explicacaoResposta:
          "Você já respondeu esta questão; novas tentativas não são permitidas.",
      })
    ).toEqual({
      estado: "ja-respondida",
      mensagem:
        "Você já respondeu esta questão; novas tentativas não são permitidas.",
    });
  });

  it("não confirma nem encerra questão quando o registro não foi confirmado", () => {
    expect(
      interpretarRespostaQuestionario({
        ...dadosResposta,
        tentativaRegistrada: false,
        questaoJaRespondida: false,
        explicacaoResposta: "Questão indisponível.",
      })
    ).toEqual({
      estado: "nao-registrada",
      mensagem:
        "Não foi possível confirmar o registro da resposta. A questão continua disponível; tente novamente.",
    });
  });

  it("registra também uma resposta incorreta quando a tentativa foi persistida", () => {
    expect(
      interpretarRespostaQuestionario({
        ...dadosResposta,
        tentativaRegistrada: true,
        questaoJaRespondida: false,
        indicaCorreta: false,
        explicacaoResposta: "Revise a orientação sobre pilhas.",
      })
    ).toEqual({
      estado: "registrada",
      feedback: {
        correta: false,
        pontos: 0,
        explicacao: "Revise a orientação sobre pilhas.",
      },
      mensagem:
        "Resposta registrada. Esta questão foi encerrada e não pode ser respondida novamente.",
    });
  });
});
