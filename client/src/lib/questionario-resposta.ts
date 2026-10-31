import type { EnviarRespostaQuestionarioResposta } from "@shared/gen/lixo_certo/v1/servico_questionarios_pb";

type RespostaRecebida = Pick<
  EnviarRespostaQuestionarioResposta,
  | "tentativaRegistrada"
  | "questaoJaRespondida"
  | "indicaCorreta"
  | "quantidadePontos"
  | "explicacaoResposta"
>;

type FeedbackResposta = {
  correta: boolean;
  pontos: number;
  explicacao: string;
};

export type ResultadoRespostaQuestionario =
  | {
      estado: "registrada";
      feedback: FeedbackResposta;
      mensagem: string;
    }
  | {
      estado: "ja-respondida";
      mensagem: string;
    }
  | {
      estado: "nao-registrada";
      mensagem: string;
    };

export function interpretarRespostaQuestionario(
  resposta: RespostaRecebida
): ResultadoRespostaQuestionario {
  if (resposta.questaoJaRespondida) {
    return {
      estado: "ja-respondida",
      mensagem:
        resposta.explicacaoResposta ||
        "Você já respondeu esta questão; novas tentativas não são permitidas.",
    };
  }

  if (!resposta.tentativaRegistrada) {
    return {
      estado: "nao-registrada",
      mensagem:
        "Não foi possível confirmar o registro da resposta. A questão continua disponível; tente novamente.",
    };
  }

  const feedback = {
    correta: resposta.indicaCorreta,
    pontos: resposta.quantidadePontos,
    explicacao: resposta.explicacaoResposta,
  };

  return {
    estado: "registrada",
    feedback,
    mensagem: resposta.indicaCorreta
      ? `Resposta correta: +${resposta.quantidadePontos} pontos. Esta questão foi encerrada.`
      : "Resposta registrada. Esta questão foi encerrada e não pode ser respondida novamente.",
  };
}
