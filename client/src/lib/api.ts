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
  ListarMeusDescartesRequisicaoSchema,
  ListarDescartesGestaoRequisicaoSchema,
  IniciarCheckinDescarteRequisicaoSchema,
  ConcluirDescarteRequisicaoSchema,
  ObterEvidenciaDescarteRequisicaoSchema,
  RevisarDescarteRequisicaoSchema,
  ObterPontoColetaRequisicaoSchema,
  ServicoPontosColeta,
} from "@shared/gen/lixo_certo/v1/servico_pontos_coleta_pb";
import {
  EnviarRespostaQuestionarioRequisicaoSchema,
  AlterarStatusQuestaoRequisicaoSchema,
  AtualizarQuestaoRequisicaoSchema,
  CriarQuestaoRequisicaoSchema,
  ListarQuestoesGestaoRequisicaoSchema,
  ListarQuestoesRequisicaoSchema,
  ServicoQuestionarios,
} from "@shared/gen/lixo_certo/v1/servico_questionarios_pb";
import {
  AlterarStatusDesafioRequisicaoSchema,
  AtualizarDesafioRequisicaoSchema,
  CriarDesafioRequisicaoSchema,
  ListarDesafiosGestaoRequisicaoSchema,
  ListarDesafiosRequisicaoSchema,
  ParticiparDesafioRequisicaoSchema,
  RegistrarAcaoSustentavelRequisicaoSchema,
  ServicoDesafios,
} from "@shared/gen/lixo_certo/v1/servico_desafios_pb";
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
import {
  AlterarStatusUsuarioAdministrativoRequisicaoSchema,
  ArquivarPapelAdministrativoRequisicaoSchema,
  AtualizarPapelAdministrativoRequisicaoSchema,
  CriarPapelAdministrativoRequisicaoSchema,
  DefinirPapeisUsuarioAdministrativoRequisicaoSchema,
  DefinirPermissoesPapelAdministrativoRequisicaoSchema,
  ListarPermissoesAdministrativasRequisicaoSchema,
  ListarPapeisAdministrativosRequisicaoSchema,
  ListarUsuariosAdministrativosRequisicaoSchema,
  ObterResumoAdministrativoRequisicaoSchema,
  RestaurarPapelAdministrativoRequisicaoSchema,
  RevogarSessoesUsuarioAdministrativoRequisicaoSchema,
  ServicoAdministracao,
} from "@shared/gen/lixo_certo/v1/servico_administracao_pb";
import { ListarAuditoriaRequisicaoSchema, ServicoAuditoria } from "@shared/gen/lixo_certo/v1/servico_auditoria_pb";

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
export const desafiosClient = createClient(ServicoDesafios, transport);
export const gamificacaoClient = createClient(ServicoGamificacao, transport);
export const avaliacaoClient = createClient(ServicoAvaliacaoUsabilidade, transport);
export const administracaoClient = createClient(ServicoAdministracao, transport);
export const auditoriaClient = createClient(ServicoAuditoria, transport);

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
export function criarPontoColeta(dados: { nomePontoColeta: string; enderecoPontoColeta: string; cepPontoColeta?: string; cidadePontoColeta: string; estadoPontoColeta: string; latitudePontoColeta: number; longitudePontoColeta: number; categoriasAceitas: string[]; origemInformacao?: string; horarioFuncionamento?: string; telefoneContato?: string; urlInformacoes?: string }) {
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
export function iniciarCheckinDescarte(dados: { idPontoColeta: string; latitude: number; longitude: number; precisaoMetros: number }) {
  return pontosColetaClient.iniciarCheckinDescarte(create(IniciarCheckinDescarteRequisicaoSchema, dados));
}
export function concluirDescarte(idCheckin: string, itens: Array<{ categoriaMaterial: string; foto: Uint8Array; relato: string }>) {
  return pontosColetaClient.concluirDescarte(create(ConcluirDescarteRequisicaoSchema, { idCheckin, itens }));
}
export function obterEvidenciaDescarte(idRegistro: string) {
  return pontosColetaClient.obterEvidenciaDescarte(create(ObterEvidenciaDescarteRequisicaoSchema, { idRegistro }));
}
export function listarMeusDescartes() {
  return pontosColetaClient.listarMeusDescartes(create(ListarMeusDescartesRequisicaoSchema, {}));
}
export function listarDescartesGestao(status = "pendente") {
  return pontosColetaClient.listarDescartesGestao(create(ListarDescartesGestaoRequisicaoSchema, { status }));
}
export function revisarDescarte(idRegistro: string, status: "aprovado" | "rejeitado") {
  return pontosColetaClient.revisarDescarte(create(RevisarDescarteRequisicaoSchema, { idRegistro, status }));
}

export function obterResumoAdministrativo() {
  return administracaoClient.obterResumoAdministrativo(create(ObterResumoAdministrativoRequisicaoSchema, {}));
}
export function listarUsuariosAdministrativos(busca = "", status = "", deslocamento = 0, limite = 25) {
  return administracaoClient.listarUsuariosAdministrativos(create(ListarUsuariosAdministrativosRequisicaoSchema, { busca, status, deslocamento, limite }));
}
export function alterarStatusUsuarioAdministrativo(idUsuario: string, status: string, motivo: string) {
  return administracaoClient.alterarStatusUsuarioAdministrativo(create(AlterarStatusUsuarioAdministrativoRequisicaoSchema, { idUsuario, status, motivo }));
}
export function definirPapeisUsuarioAdministrativo(idUsuario: string, idsPapeis: string[], motivo: string) {
  return administracaoClient.definirPapeisUsuarioAdministrativo(create(DefinirPapeisUsuarioAdministrativoRequisicaoSchema, { idUsuario, idsPapeis, motivo }));
}
export function revogarSessoesUsuarioAdministrativo(idUsuario: string, motivo: string) {
  return administracaoClient.revogarSessoesUsuarioAdministrativo(create(RevogarSessoesUsuarioAdministrativoRequisicaoSchema, { idUsuario, motivo }));
}
export function listarPapeisAdministrativos(incluirInativos = true) {
  return administracaoClient.listarPapeisAdministrativos(create(ListarPapeisAdministrativosRequisicaoSchema, { incluirInativos }));
}
export function listarPermissoesAdministrativas() {
  return administracaoClient.listarPermissoesAdministrativas(create(ListarPermissoesAdministrativasRequisicaoSchema, {}));
}
export function criarPapelAdministrativo(nomePapel: string, descricaoPapel: string, idsPermissoes: string[], motivo: string) {
  return administracaoClient.criarPapelAdministrativo(create(CriarPapelAdministrativoRequisicaoSchema, { nomePapel, descricaoPapel, idsPermissoes, motivo }));
}
export function atualizarPapelAdministrativo(idPapel: string, nomePapel: string, descricaoPapel: string, idsPermissoes: string[], motivo: string) {
  return administracaoClient.atualizarPapelAdministrativo(create(AtualizarPapelAdministrativoRequisicaoSchema, { idPapel, nomePapel, descricaoPapel, idsPermissoes, motivo }));
}
export function arquivarPapelAdministrativo(idPapel: string, motivo: string) {
  return administracaoClient.arquivarPapelAdministrativo(create(ArquivarPapelAdministrativoRequisicaoSchema, { idPapel, motivo }));
}
export function restaurarPapelAdministrativo(idPapel: string, motivo: string) {
  return administracaoClient.restaurarPapelAdministrativo(create(RestaurarPapelAdministrativoRequisicaoSchema, { idPapel, motivo }));
}
export function definirPermissoesPapelAdministrativo(idPapel: string, idsPermissoes: string[], motivo: string) {
  return administracaoClient.definirPermissoesPapelAdministrativo(create(DefinirPermissoesPapelAdministrativoRequisicaoSchema, { idPapel, idsPermissoes, motivo }));
}
export function listarAuditoria(tipoEvento = "", limiteResultado = 25, deslocamento = 0) {
  return auditoriaClient.listarAuditoria(create(ListarAuditoriaRequisicaoSchema, { tipoEvento, limiteResultado, deslocamento }));
}

export function listarQuestoes(numeroPagina = 1, tamanhoPagina = 100) {
  return questionariosClient.listarQuestoes(create(ListarQuestoesRequisicaoSchema, { numeroPagina, tamanhoPagina }));
}

export function enviarRespostaQuestionario(idQuestao: string, idAlternativa: string) {
  return questionariosClient.enviarRespostaQuestionario(create(EnviarRespostaQuestionarioRequisicaoSchema, { idQuestao, idAlternativa }));
}

export type DadosQuestaoApi = {
  enunciadoQuestao: string;
  explicacaoQuestao: string;
  quantidadePontos: number;
  temaQuestao: string;
  alternativas: Array<{ idAlternativa?: string; textoAlternativa: string; indicaCorreta: boolean; ordemExibicao: number }>;
};

export function listarQuestoesGestao(textoPesquisa = "", statusQuestao = "todos") {
  return questionariosClient.listarQuestoesGestao(create(ListarQuestoesGestaoRequisicaoSchema, { textoPesquisa, statusQuestao, numeroPagina: 1, tamanhoPagina: 100 }));
}
export function criarQuestao(dados: DadosQuestaoApi) {
  return questionariosClient.criarQuestao(create(CriarQuestaoRequisicaoSchema, { dados: { ...dados, alternativas: dados.alternativas.map((alternativa, indice) => ({ ...alternativa, idAlternativa: alternativa.idAlternativa ?? "", ordemExibicao: indice + 1 })) } }));
}
export function atualizarQuestao(idQuestao: string, dados: DadosQuestaoApi) {
  return questionariosClient.atualizarQuestao(create(AtualizarQuestaoRequisicaoSchema, { idQuestao, dados: { ...dados, alternativas: dados.alternativas.map((alternativa, indice) => ({ ...alternativa, idAlternativa: alternativa.idAlternativa ?? "", ordemExibicao: indice + 1 })) } }));
}
export function alterarStatusQuestao(idQuestao: string, statusQuestao: string) {
  return questionariosClient.alterarStatusQuestao(create(AlterarStatusQuestaoRequisicaoSchema, { idQuestao, statusQuestao }));
}

export type DadosDesafioApi = {
  nomeDesafio: string;
  descricaoDesafio: string;
  tipoAcao: string;
  metaQuantidade: number;
  quantidadePontos: number;
  dataInicio: string;
  dataFim: string;
  periodicidade: "unica" | "diaria" | "semanal" | "mensal";
  criterios: Array<{ tipo: "descarte" | "quiz" | "categorias_distintas"; meta: number; categoria: string; tema: string; categorias: string[] }>;
};
export function listarDesafios() {
  return desafiosClient.listarDesafios(create(ListarDesafiosRequisicaoSchema, { numeroPagina: 1, tamanhoPagina: 100 }));
}
export function listarDesafiosGestao(textoPesquisa = "", statusDesafio = "todos") {
  return desafiosClient.listarDesafiosGestao(create(ListarDesafiosGestaoRequisicaoSchema, { textoPesquisa, statusDesafio, numeroPagina: 1, tamanhoPagina: 100 }));
}
export function criarDesafio(dados: DadosDesafioApi) {
  return desafiosClient.criarDesafio(create(CriarDesafioRequisicaoSchema, { dados }));
}
export function atualizarDesafio(idDesafio: string, dados: DadosDesafioApi) {
  return desafiosClient.atualizarDesafio(create(AtualizarDesafioRequisicaoSchema, { idDesafio, dados }));
}
export function alterarStatusDesafio(idDesafio: string, statusDesafio: string) {
  return desafiosClient.alterarStatusDesafio(create(AlterarStatusDesafioRequisicaoSchema, { idDesafio, statusDesafio }));
}
export function participarDesafio(idDesafio: string) {
  return desafiosClient.participarDesafio(create(ParticiparDesafioRequisicaoSchema, { idDesafio }));
}
export function registrarAcaoSustentavel(idDesafio: string, tipoAcao: string, descricaoAcao: string) {
  return desafiosClient.registrarAcaoSustentavel(create(RegistrarAcaoSustentavelRequisicaoSchema, { idDesafio, tipoAcao, descricaoAcao }));
}

export function obterProgressoUsuario() {
  return gamificacaoClient.obterProgressoUsuario(create(ObterProgressoUsuarioRequisicaoSchema, {}));
}

export function obterRanking(limiteResultado = 10) {
  return gamificacaoClient.obterRanking(create(ObterRankingRequisicaoSchema, { limiteResultado }));
}

export function enviarAvaliacaoSus(notasItens: number[]) {
  return avaliacaoClient.enviarAvaliacaoSus(create(EnviarAvaliacaoSusRequisicaoSchema, { codigoParticipante: "", indicaConsentimento: true, notasItens }));
}

export function obterResultadosAgregados() {
  return avaliacaoClient.obterResultadosAgregados(create(ObterResultadosAgregadosRequisicaoSchema, {}));
}
