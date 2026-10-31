export type ResultadoMutacao = {
  tipo: "sucesso" | "erro";
  mensagem: string;
};

type RespostaMutacao = {
  operacaoAceita: boolean;
  mensagemResultado: string;
};

export function interpretarResultadoMutacao(
  resposta: RespostaMutacao,
  listaAtualizada: boolean
): ResultadoMutacao {
  const mensagemServidor = resposta.mensagemResultado.trim();

  if (!resposta.operacaoAceita) {
    return {
      tipo: "erro",
      mensagem: mensagemServidor || "A alteração não foi aceita pelo servidor.",
    };
  }

  if (!listaAtualizada) {
    const confirmacao = mensagemServidor
      ? `${mensagemServidor} `
      : "A alteração foi registrada. ";
    return {
      tipo: "erro",
      mensagem: `${confirmacao}O servidor aceitou a alteração, mas a lista não pôde ser atualizada. Atualize a consulta para conferir o estado atual.`,
    };
  }

  return {
    tipo: "sucesso",
    mensagem: mensagemServidor || "Alteração concluída.",
  };
}
