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
import {
  AtualizarPerfilRequisicaoSchema,
  ObterPerfilAtualRequisicaoSchema,
  ServicoPerfil,
} from "@shared/gen/lixo_certo/v1/servico_perfil_pb";
import { obterTokenAcesso, carregarSessao } from "./sessao";
import {
  AlterarStatusMaterialRequisicaoSchema,
  AtualizarMaterialRequisicaoSchema,
  CriarMaterialRequisicaoSchema,
  ListarMateriaisRequisicaoSchema,
  ObterMaterialRequisicaoSchema,
  ServicoMateriais,
} from "@shared/gen/lixo_certo/v1/servico_materiais_pb";
import {
  AlterarStatusPontoColetaRequisicaoSchema,
  AtualizarPontoColetaRequisicaoSchema,
  BuscarEnderecoPorCoordenadasRequisicaoSchema,
  CriarPontoColetaRequisicaoSchema,
  ExcluirPontoColetaRequisicaoSchema,
  ListarPontosColetaRequisicaoSchema,
  ObterPontoColetaRequisicaoSchema,
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
  const idSessao = carregarSessao()?.idSessao;
  if (idSessao) request.header.set("x-id-sessao", idSessao);
  return next(request);
};

const transport = createGrpcWebTransport({ baseUrl: apiBaseUrl, interceptors: [bearerInterceptor] });

export const autenticacaoClient = createClient(ServicoAutenticacao, transport);
export const sessoesClient = createClient(ServicoSessoes, transport);
export const perfilClient = createClient(ServicoPerfil, transport);
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

export function confirmarEmail(emailUsuario: string, codigoVerificacao: string) {
  return autenticacaoClient.confirmarEmail(create(ConfirmarEmailRequisicaoSchema, { emailUsuario, codigoVerificacao }));
}

export function solicitarRecuperacaoSenha(emailUsuario: string) {
  return autenticacaoClient.solicitarRecuperacaoSenha(create(SolicitarRecuperacaoSenhaRequisicaoSchema, { emailUsuario }));
}

export function redefinirSenha(emailUsuario: string, codigoRedefinicao: string, novaSenhaUsuario: string) {
  return autenticacaoClient.redefinirSenha(create(RedefinirSenhaRequisicaoSchema, { emailUsuario, codigoRedefinicao, novaSenhaUsuario }));
}

export function obterPerfilAtual() {
  return perfilClient.obterPerfilAtual(create(ObterPerfilAtualRequisicaoSchema, {}));
}

export function atualizarPerfil(nomeUsuario: string) {
  return perfilClient.atualizarPerfil(create(AtualizarPerfilRequisicaoSchema, { nomeUsuario }));
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

export function listarMateriais(textoPesquisa = "", categoriaMaterial = "", statusMaterial = "") {
  return materiaisClient.listarMateriais(create(ListarMateriaisRequisicaoSchema, { textoPesquisa, categoriaMaterial, statusMaterial, numeroPagina: 1, tamanhoPagina: 100 }));
}

export type FonteReferenciaMaterialApi = { titulo: string; url: string; comprova: string };
export type DadosMaterialApi = {
  codigoCatalogo: string;
  classificacao: string;
  nomeMaterial: string;
  categoriaMaterial: string;
  instrucaoDescarte: string;
  observacaoImpacto: string;
  sinonimos: string[];
  preparacao: string;
  cuidados: string;
  categoriasPontos: string[];
  rotasReferencia: string[];
  abrangencia: string;
  notaAbrangencia: string;
  fontesReferencia: FonteReferenciaMaterialApi[];
  dataVerificacao: string;
};

export function obterMaterial(idMaterial: string) {
  return materiaisClient.obterMaterial(create(ObterMaterialRequisicaoSchema, { idMaterial }));
}
export function criarMaterial(dados: DadosMaterialApi) {
  return materiaisClient.criarMaterial(create(CriarMaterialRequisicaoSchema, { dados }));
}
export function atualizarMaterial(idMaterial: string, dados: DadosMaterialApi) {
  return materiaisClient.atualizarMaterial(create(AtualizarMaterialRequisicaoSchema, { idMaterial, dados }));
}
export function alterarStatusMaterial(idMaterial: string, statusMaterial: string, observacaoRevisao = "") {
  return materiaisClient.alterarStatusMaterial(create(AlterarStatusMaterialRequisicaoSchema, { idMaterial, statusMaterial, observacaoRevisao }));
}

export function listarPontosColeta(cidade = "João Pessoa", categoriaMaterial = "", local?: { latitude: number; longitude: number; raioMetros?: number }) {
  return pontosColetaClient.listarPontosColeta(create(ListarPontosColetaRequisicaoSchema, { cidadePontoColeta: cidade, categoriaMaterial, latitude: local?.latitude ?? 0, longitude: local?.longitude ?? 0, raioMetros: local?.raioMetros ?? 10000 }));
}
export function obterPontoColeta(idPontoColeta: string) {
  return pontosColetaClient.obterPontoColeta(create(ObterPontoColetaRequisicaoSchema, { idPontoColeta }));
}
export function criarPontoColeta(dados: { nomePontoColeta: string; enderecoPontoColeta: string; cepPontoColeta?: string; cidadePontoColeta: string; estadoPontoColeta: string; latitudePontoColeta: number; longitudePontoColeta: number; categoriasAceitas: string[]; origemInformacao?: string }) {
  return pontosColetaClient.criarPontoColeta(create(CriarPontoColetaRequisicaoSchema, { dados }));
}
export function atualizarPontoColeta(idPontoColeta: string, dados: Parameters<typeof criarPontoColeta>[0]) {
  return pontosColetaClient.atualizarPontoColeta(create(AtualizarPontoColetaRequisicaoSchema, { idPontoColeta, dados }));
}
export function excluirPontoColeta(idPontoColeta: string) {
  return pontosColetaClient.excluirPontoColeta(create(ExcluirPontoColetaRequisicaoSchema, { idPontoColeta }));
}
export function alterarStatusPontoColeta(idPontoColeta: string, statusVerificacao: string) {
  return pontosColetaClient.alterarStatusPontoColeta(create(AlterarStatusPontoColetaRequisicaoSchema, { idPontoColeta, statusVerificacao }));
}
export function buscarEnderecoPorCoordenadas(latitude: number, longitude: number) {
  return pontosColetaClient.buscarEnderecoPorCoordenadas(create(BuscarEnderecoPorCoordenadasRequisicaoSchema, { latitude, longitude }));
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
