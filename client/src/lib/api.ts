import { create } from "@bufbuild/protobuf";
import type { Interceptor } from "@connectrpc/connect";
import { createClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import {
  CadastrarUsuarioRequisicaoSchema,
  ConfirmarEmailRequisicaoSchema,
  EntrarRequisicaoSchema,
  ObterIdentidadeAtualRequisicaoSchema,
  RedefinirSenhaRequisicaoSchema,
  RenovarTokenRequisicaoSchema,
  SairRequisicaoSchema,
  ServicoAutenticacao,
  SolicitarRecuperacaoSenhaRequisicaoSchema,
  SolicitarVerificacaoEmailRequisicaoSchema,
} from "@shared/gen/lixo_certo/v1/servico_autenticacao_pb";
import {
  ListarSessoesRequisicaoSchema,
  RevogarSessaoRequisicaoSchema,
  RevogarTodasSessoesRequisicaoSchema,
  ServicoSessoes,
} from "@shared/gen/lixo_certo/v1/servico_sessoes_pb";
import { obterTokenAcesso } from "./sessao";
import {
  ListarMateriaisRequisicaoSchema,
  ServicoMateriais,
} from "@shared/gen/lixo_certo/v1/servico_materiais_pb";
import {
  ListarPontosColetaRequisicaoSchema,
  ServicoPontosColeta,
} from "@shared/gen/lixo_certo/v1/servico_pontos_coleta_pb";
import {
  EnviarRespostaQuestionarioRequisicaoSchema,
  ListarQuestoesRequisicaoSchema,
  ServicoQuestionarios,
} from "@shared/gen/lixo_certo/v1/servico_questionarios_pb";
import {
  ObterProgressoUsuarioRequisicaoSchema,
  ObterRankingRequisicaoSchema,
  ServicoGamificacao,
} from "@shared/gen/lixo_certo/v1/servico_gamificacao_pb";
import {
  EnviarAvaliacaoSusRequisicaoSchema,
  ObterResultadosAgregadosRequisicaoSchema,
  ServicoAvaliacaoUsabilidade,
} from "@shared/gen/lixo_certo/v1/servico_avaliacao_usabilidade_pb";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/rpc";

const bearerInterceptor: Interceptor = (next) => async (request) => {
  const token = obterTokenAcesso();
  if (token) request.header.set("Authorization", `Bearer ${token}`);
  return next(request);
};

const transport = createGrpcWebTransport({ baseUrl: apiBaseUrl, interceptors: [bearerInterceptor] });

export const autenticacaoClient = createClient(ServicoAutenticacao, transport);
export const sessoesClient = createClient(ServicoSessoes, transport);
export const materiaisClient = createClient(ServicoMateriais, transport);
export const pontosColetaClient = createClient(ServicoPontosColeta, transport);
export const questionariosClient = createClient(ServicoQuestionarios, transport);
export const gamificacaoClient = createClient(ServicoGamificacao, transport);
export const avaliacaoClient = createClient(ServicoAvaliacaoUsabilidade, transport);

export function cadastrarUsuario(nomeUsuario: string, emailUsuario: string, senhaUsuario: string) {
  return autenticacaoClient.cadastrarUsuario(create(CadastrarUsuarioRequisicaoSchema, { nomeUsuario, emailUsuario, senhaUsuario }));
}

export function entrar(emailUsuario: string, senhaUsuario: string) {
  return autenticacaoClient.entrar(create(EntrarRequisicaoSchema, { emailUsuario, senhaUsuario }));
}

export function renovarToken(tokenAtualizacao: string) {
  return autenticacaoClient.renovarToken(create(RenovarTokenRequisicaoSchema, { tokenAtualizacao }));
}

export function sair(tokenAtualizacao: string) {
  return autenticacaoClient.sair(create(SairRequisicaoSchema, { tokenAtualizacao }));
}

export function obterIdentidadeAtual() {
  return autenticacaoClient.obterIdentidadeAtual(create(ObterIdentidadeAtualRequisicaoSchema, {}));
}

export function solicitarVerificacaoEmail(emailUsuario: string) {
  return autenticacaoClient.solicitarVerificacaoEmail(create(SolicitarVerificacaoEmailRequisicaoSchema, { emailUsuario }));
}

export function confirmarEmail(tokenVerificacao: string) {
  return autenticacaoClient.confirmarEmail(create(ConfirmarEmailRequisicaoSchema, { tokenVerificacao }));
}

export function solicitarRecuperacaoSenha(emailUsuario: string) {
  return autenticacaoClient.solicitarRecuperacaoSenha(create(SolicitarRecuperacaoSenhaRequisicaoSchema, { emailUsuario }));
}

export function redefinirSenha(tokenRedefinicao: string, novaSenhaUsuario: string) {
  return autenticacaoClient.redefinirSenha(create(RedefinirSenhaRequisicaoSchema, { tokenRedefinicao, novaSenhaUsuario }));
}

export function listarSessoes() {
  return sessoesClient.listarSessoes(create(ListarSessoesRequisicaoSchema, {}));
}

export function revogarSessao(idSessao: string) {
  return sessoesClient.revogarSessao(create(RevogarSessaoRequisicaoSchema, { idSessao }));
}

export function revogarTodasSessoes() {
  return sessoesClient.revogarTodasSessoes(create(RevogarTodasSessoesRequisicaoSchema, {}));
}

export function listarMateriais(textoPesquisa = "", categoriaMaterial = "") {
  return materiaisClient.listarMateriais(create(ListarMateriaisRequisicaoSchema, { textoPesquisa, categoriaMaterial, numeroPagina: 1, tamanhoPagina: 30 }));
}

export function listarPontosColeta(cidade = "João Pessoa", categoriaMaterial = "") {
  return pontosColetaClient.listarPontosColeta(create(ListarPontosColetaRequisicaoSchema, { cidadePontoColeta: cidade, categoriaMaterial }));
}

export function listarQuestoes() {
  return questionariosClient.listarQuestoes(create(ListarQuestoesRequisicaoSchema, { numeroPagina: 1, tamanhoPagina: 10 }));
}

export function enviarRespostaQuestionario(idQuestao: string, idAlternativa: string) {
  return questionariosClient.enviarRespostaQuestionario(create(EnviarRespostaQuestionarioRequisicaoSchema, { idQuestao, idAlternativa }));
}

export function obterProgressoUsuario() {
  return gamificacaoClient.obterProgressoUsuario(create(ObterProgressoUsuarioRequisicaoSchema, {}));
}

export function obterRanking(limiteResultado = 10) {
  return gamificacaoClient.obterRanking(create(ObterRankingRequisicaoSchema, { limiteResultado }));
}

export function enviarAvaliacaoSus(codigoParticipante: string, notasItens: number[]) {
  return avaliacaoClient.enviarAvaliacaoSus(create(EnviarAvaliacaoSusRequisicaoSchema, { codigoParticipante, indicaConsentimento: true, notasItens }));
}

export function obterResultadosAgregados() {
  return avaliacaoClient.obterResultadosAgregados(create(ObterResultadosAgregadosRequisicaoSchema, {}));
}
