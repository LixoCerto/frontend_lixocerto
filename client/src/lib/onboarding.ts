import type { ItemNavegacao } from "@shared/permissoes";

export interface PassoOnboarding {
  area: string;
  titulo: string;
  descricao: string;
}

export type AcaoOnboarding = "buscar_inicio" | "buscar_guia" | "pesquisar_pontos";

export interface TarefaOnboarding {
  acao: AcaoOnboarding;
  area: string;
  titulo: string;
  descricao: string;
  instrucao: string;
}

export interface ArmazenamentoOnboarding {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

export const EVENTO_ACAO_ONBOARDING = "lcr:onboarding-acao";

export function normalizarTermoOnboarding(valor: string): string {
  return valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function termosOnboardingEquivalentes(primeiro: string, segundo: string): boolean {
  return Boolean(primeiro.trim() && segundo.trim())
    && normalizarTermoOnboarding(primeiro) === normalizarTermoOnboarding(segundo);
}

export function obterPassosOnboarding(
  navegacao: readonly ItemNavegacao[],
  permissoes: readonly string[],
): PassoOnboarding[] {
  const tem = (permissao: string) => permissoes.includes(permissao);

  const descricoes: Record<string, string> = {
    inicio: "Este é seu ponto de partida. Pesquise um material para encontrar orientações publicadas e use os atalhos para chegar às áreas mais usadas.",
    materiais: "Busque pelo nome, sinônimo ou categoria. Confira as orientações publicadas, os cuidados e as categorias de pontos relacionadas.",
    pontos: tem("gamificacao:participar")
      ? "Consulte os pontos de coleta e suas informações. Um registro de descarte pode ser iniciado quando disponível; localização e foto são evidências enviadas, não confirmação de reciclagem."
      : "Consulte pontos de coleta e confira endereço, categorias aceitas e atualização antes de se deslocar.",
    questionarios: tem("questionarios:administrar")
      ? "Responda questionários quando disponíveis e, conforme suas permissões, consulte ou administre o banco de questões."
      : "Responda aos questionários disponíveis para testar seus conhecimentos. A pontuação depende das atividades registradas.",
    desafios: tem("gamificacao:administrar")
      ? "Consulte desafios e, conforme suas permissões, revise ou administre ações e recorrências."
      : "Veja as ações disponíveis e participe dos desafios que fizerem sentido para você.",
    pesquisa: tem("avaliacao_usabilidade:enviar")
      ? "Compartilhe voluntariamente sua experiência na pesquisa de usabilidade."
      : "Consulte somente os indicadores agregados disponíveis para seu perfil.",
    revisao: "Acesse itens pendentes de revisão e confira conteúdo, fontes e dados antes de aprovar ou solicitar ajustes.",
    administracao: "Consulte os resumos e controles administrativos liberados para seu perfil.",
    perfil: "Confira seus dados e sessões ativas. Encerre sessões que não reconhece.",
  };

  return navegacao.map(item => ({
    area: item.id,
    titulo: item.id === "inicio" ? "Visão geral" : item.rotulo,
    descricao: descricoes[item.id] ?? item.descricao,
  }));
}

export function obterTarefasObrigatoriasOnboarding(
  navegacao: readonly ItemNavegacao[],
): TarefaOnboarding[] {
  const areas = new Set(navegacao.map(item => item.id));
  const tarefas: TarefaOnboarding[] = [
    {
      acao: "buscar_inicio",
      area: "inicio",
      titulo: "Faça sua primeira busca",
      descricao: "Pesquise um material no início. A busca abre o Guia e ajuda a encontrar orientações publicadas.",
      instrucao: "Digite pelo menos dois caracteres no campo “O que você quer descartar?” e clique em “Buscar”. Mesmo que não haja orientação publicada para o termo, a busca é concluída normalmente.",
    },
    {
      acao: "buscar_guia",
      area: "materiais",
      titulo: "Pesquise novamente no Guia",
      descricao: "Altere o termo da etapa anterior e aplique uma nova busca no Guia de descarte.",
      instrucao: "Digite um termo diferente com pelo menos dois caracteres no campo de busca do Guia e clique em “Buscar”. Se esta etapa foi retomada após atualizar a página, digite qualquer termo com dois caracteres ou mais. Mesmo sem resultados publicados, a busca é concluída normalmente.",
    },
    {
      acao: "pesquisar_pontos",
      area: "pontos",
      titulo: "Pesquise pontos por cidade",
      descricao: "Consulte pontos de coleta usando uma busca simples por cidade.",
      instrucao: "Confira a cidade exibida no campo “Buscar por cidade” — altere se quiser — e clique em “Buscar”. Esta etapa não solicita nem usa sua localização exata.",
    },
  ];

  return tarefas.filter(tarefa => areas.has(tarefa.area));
}

export function obterChaveOnboarding(usuarioId: string): string {
  return `lixo-certo:onboarding:v2:${encodeURIComponent(usuarioId.trim())}`;
}

function obterChaveAcaoOnboarding(usuarioId: string, acao: AcaoOnboarding): string {
  return `${obterChaveOnboarding(usuarioId)}:acao:${acao}`;
}

export function acaoOnboardingFoiConcluida(
  armazenamento: ArmazenamentoOnboarding,
  usuarioId: string,
  acao: AcaoOnboarding,
): boolean {
  if (!usuarioId.trim()) return false;
  try {
    return armazenamento.getItem(obterChaveAcaoOnboarding(usuarioId, acao)) === "concluida";
  } catch {
    return false;
  }
}

export function marcarAcaoOnboardingConcluida(
  armazenamento: ArmazenamentoOnboarding,
  usuarioId: string,
  acao: AcaoOnboarding,
): void {
  if (!usuarioId.trim()) return;
  try {
    armazenamento.setItem(obterChaveAcaoOnboarding(usuarioId, acao), "concluida");
  } catch {
    // O progresso continua na memória durante a sessão se o navegador bloquear o armazenamento.
  }
}

export function registrarAcaoOnboarding(acao: AcaoOnboarding): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO_ACAO_ONBOARDING, { detail: { acao } }));
}

export function onboardingFoiConcluido(
  armazenamento: ArmazenamentoOnboarding,
  usuarioId: string,
): boolean {
  if (!usuarioId.trim()) return false;
  try {
    return armazenamento.getItem(obterChaveOnboarding(usuarioId)) === "concluido";
  } catch {
    return false;
  }
}

export function concluirOnboarding(
  armazenamento: ArmazenamentoOnboarding,
  usuarioId: string,
): void {
  if (!usuarioId.trim()) return;
  try {
    armazenamento.setItem(obterChaveOnboarding(usuarioId), "concluido");
  } catch {
    // O usuário pode terminar o fluxo atual mesmo se o navegador bloquear o armazenamento.
  }
}
