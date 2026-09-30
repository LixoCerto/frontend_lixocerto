export const CODIGOS_PERMISSAO = [
  "materiais:ler",
  "materiais:escrever",
  "materiais:aprovar",
  "pontos_coleta:ler",
  "pontos_coleta:escrever",
  "pontos_coleta:aprovar",
  "questionarios:responder",
  "questionarios:administrar",
  "gamificacao:ler",
  "gamificacao:participar",
  "gamificacao:administrar",
  "avaliacao_usabilidade:enviar",
  "avaliacao_usabilidade:consultar_agregados",
  "auditoria:consultar",
  "administracao:consultar",
  "administracao:gerenciar_acessos",
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
    descricao: "Modera conteúdos, pontos de coleta, questionários e desafios.",
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
  "gamificacao:participar",
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
    "materiais:aprovar",
    "pontos_coleta:ler",
    "pontos_coleta:escrever",
    "pontos_coleta:aprovar",
    "questionarios:responder",
    "questionarios:administrar",
    "gamificacao:ler",
    "gamificacao:administrar",
  ],
  administrador: CODIGOS_PERMISSAO,
};

export interface ItemNavegacao {
  id: string;
  rotulo: string;
  descricao: string;
  icone: string;
}

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  { id: "inicio", rotulo: "Visão geral", descricao: "Resumo do seu espaço", icone: "LayoutDashboard" },
  { id: "materiais", rotulo: "Guia de descarte", descricao: "Materiais e orientações", icone: "BookOpen" },
  { id: "pontos", rotulo: "Pontos de coleta", descricao: "Locais e verificações", icone: "MapPinned" },
  { id: "questionarios", rotulo: "Quiz e questionários", descricao: "Aprendizagem e banco de questões", icone: "CircleHelp" },
  { id: "desafios", rotulo: "Desafios", descricao: "Ações sustentáveis", icone: "Trophy" },
  { id: "pesquisa", rotulo: "Pesquisa de usabilidade", descricao: "Experiência e indicadores agregados", icone: "ChartNoAxesCombined" },
  { id: "revisao", rotulo: "Central de revisão", descricao: "Fila de moderação", icone: "ClipboardCheck" },
  { id: "administracao", rotulo: "Administração", descricao: "Governança da plataforma", icone: "ShieldCheck" },
  { id: "perfil", rotulo: "Perfil e sessões", descricao: "Conta e segurança", icone: "UserRound" },
];

interface RequisitoAcessoPagina {
  todas?: readonly CodigoPermissao[];
  alguma?: readonly CodigoPermissao[];
  grupos?: readonly (readonly CodigoPermissao[])[];
}

export const REQUISITOS_ACESSO_PAGINA: Readonly<Record<string, RequisitoAcessoPagina>> = {
  inicio: {},
  materiais: { todas: ["materiais:ler"] },
  pontos: { todas: ["pontos_coleta:ler"] },
  questionarios: { alguma: ["questionarios:responder", "questionarios:administrar"] },
  desafios: { grupos: [["gamificacao:ler", "gamificacao:participar"], ["gamificacao:administrar"]] },
  pesquisa: { alguma: ["avaliacao_usabilidade:enviar", "avaliacao_usabilidade:consultar_agregados"] },
  revisao: { todas: ["materiais:ler", "materiais:escrever"] },
  administracao: { alguma: ["administracao:consultar", "administracao:gerenciar_acessos", "auditoria:consultar"] },
  perfil: {},
};

export function obterPermissoes(papeis: readonly PapelAcesso[]): CodigoPermissao[] {
  return Array.from(new Set(papeis.flatMap(papel => PERMISSOES_POR_PAPEL[papel])));
}

export function temPermissao(papeis: readonly PapelAcesso[], permissao: CodigoPermissao): boolean {
  return obterPermissoes(papeis).includes(permissao);
}

export function podeAcessarPagina(pagina: string, permissoes: readonly string[]): boolean {
  const requisito = REQUISITOS_ACESSO_PAGINA[pagina];
  if (!requisito) return false;
  const conjunto = new Set(permissoes);
  return (requisito.todas ?? []).every(permissao => conjunto.has(permissao))
    && (!requisito.alguma?.length || requisito.alguma.some(permissao => conjunto.has(permissao)))
    && (!requisito.grupos?.length || requisito.grupos.some(grupo => grupo.every(permissao => conjunto.has(permissao))));
}

export function obterNavegacaoPermitidaPorPermissoes(permissoes: readonly string[]): ItemNavegacao[] {
  return ITENS_NAVEGACAO.filter(item => podeAcessarPagina(item.id, permissoes));
}

export function obterNavegacaoPermitida(papeis: readonly PapelAcesso[]): ItemNavegacao[] {
  return obterNavegacaoPermitidaPorPermissoes(obterPermissoes(papeis));
}
