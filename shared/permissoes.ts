export const CODIGOS_PERMISSAO = [
  "materiais:ler",
  "materiais:escrever",
  "pontos_coleta:ler",
  "pontos_coleta:escrever",
  "pontos_coleta:aprovar",
  "questionarios:responder",
  "questionarios:administrar",
  "gamificacao:ler",
  "avaliacao_usabilidade:enviar",
  "avaliacao_usabilidade:consultar_agregados",
  "auditoria:consultar",
  "administracao:consultar",
] as const;

export type CodigoPermissao = (typeof CODIGOS_PERMISSAO)[number];
export type PapelAcesso = "usuario" | "pesquisador" | "revisor" | "administrador";

export interface PerfilAcesso {
  papel: PapelAcesso;
  rotulo: string;
  descricao: string;
  nomeDemonstracao: string;
  iniciais: string;
}

export const PERFIS_ACESSO: Record<PapelAcesso, PerfilAcesso> = {
  usuario: {
    papel: "usuario",
    rotulo: "Usuário",
    descricao: "Aprende, registra ações e acompanha o próprio impacto.",
    nomeDemonstracao: "Marina Alves",
    iniciais: "MA",
  },
  pesquisador: {
    papel: "pesquisador",
    rotulo: "Pesquisador",
    descricao: "Analisa indicadores agregados sem identificar participantes.",
    nomeDemonstracao: "Dr. Caio Lima",
    iniciais: "CL",
  },
  revisor: {
    papel: "revisor",
    rotulo: "Revisor",
    descricao: "Modera conteúdos, pontos de coleta e questionários.",
    nomeDemonstracao: "Rafaela Moura",
    iniciais: "RM",
  },
  administrador: {
    papel: "administrador",
    rotulo: "Administrador",
    descricao: "Acompanha operação, governança e auditoria da plataforma.",
    nomeDemonstracao: "Arthur Nóbrega",
    iniciais: "AN",
  },
};

const permissoesUsuario: CodigoPermissao[] = [
  "materiais:ler",
  "pontos_coleta:ler",
  "questionarios:responder",
  "gamificacao:ler",
  "avaliacao_usabilidade:enviar",
];

export const PERMISSOES_POR_PAPEL: Record<PapelAcesso, readonly CodigoPermissao[]> = {
  usuario: permissoesUsuario,
  pesquisador: [
    "materiais:ler",
    "pontos_coleta:ler",
    "gamificacao:ler",
    "avaliacao_usabilidade:consultar_agregados",
  ],
  revisor: [
    "materiais:ler",
    "materiais:escrever",
    "pontos_coleta:ler",
    "pontos_coleta:escrever",
    "pontos_coleta:aprovar",
    "questionarios:administrar",
  ],
  administrador: CODIGOS_PERMISSAO,
};

export interface ItemNavegacao {
  id: string;
  rotulo: string;
  descricao: string;
  icone: string;
  permissao?: CodigoPermissao;
}

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  { id: "inicio", rotulo: "Visão geral", descricao: "Resumo do seu espaço", icone: "LayoutDashboard" },
  { id: "materiais", rotulo: "Guia de descarte", descricao: "Materiais e orientações", icone: "BookOpen", permissao: "materiais:ler" },
  { id: "pontos", rotulo: "Pontos de coleta", descricao: "Locais e verificações", icone: "MapPinned", permissao: "pontos_coleta:ler" },
  { id: "questionarios", rotulo: "Quiz e questionários", descricao: "Aprendizagem e banco de questões", icone: "CircleHelp", permissao: "questionarios:responder" },
  { id: "desafios", rotulo: "Desafios", descricao: "Ações sustentáveis", icone: "Trophy", permissao: "gamificacao:ler" },
  { id: "pesquisa", rotulo: "Pesquisa e SUS", descricao: "Indicadores agregados", icone: "ChartNoAxesCombined", permissao: "avaliacao_usabilidade:consultar_agregados" },
  { id: "revisao", rotulo: "Central de revisão", descricao: "Fila de moderação", icone: "ClipboardCheck", permissao: "materiais:escrever" },
  { id: "administracao", rotulo: "Administração", descricao: "Governança da plataforma", icone: "ShieldCheck", permissao: "administracao:consultar" },
  { id: "perfil", rotulo: "Perfil e sessões", descricao: "Conta e segurança", icone: "UserRound" },
];

export function obterPermissoes(papeis: readonly PapelAcesso[]): CodigoPermissao[] {
  return Array.from(new Set(papeis.flatMap(papel => PERMISSOES_POR_PAPEL[papel])));
}

export function temPermissao(papeis: readonly PapelAcesso[], permissao: CodigoPermissao): boolean {
  return obterPermissoes(papeis).includes(permissao);
}

export function obterNavegacaoPermitida(papeis: readonly PapelAcesso[]): ItemNavegacao[] {
  return ITENS_NAVEGACAO.filter(item => !item.permissao || temPermissao(papeis, item.permissao));
}
