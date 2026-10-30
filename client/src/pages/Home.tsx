import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  UserRound,
  MonitorSmartphone,
  LogOut,
  CircleCheck,
  Award,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  KeyRound,
  Leaf,
  Lightbulb,
  Lock,
  MailWarning,
  MapPinned,
  Pencil,
  Save,
  Recycle,
  Search,
  ShieldCheck,
  Target,
  Trophy,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import TelaCarregamento, { esperar, lerTransicao, limparTransicao, marcarTransicao } from "@/components/TelaCarregamento";
import AdministracaoCrud from "@/components/AdministracaoCrud";
import GuiaMaterialCard, { tomDaCategoria, type MaterialGuia } from "@/components/GuiaMaterialCard";
import { Aviso, BarraProgresso, CabecalhoPagina, Carregando, Cartao, ESTILOS, EstadoVazio, Etiqueta, TONS } from "@/components/pagina/Pagina";
import MateriaisCrud from "@/components/MateriaisCrud";
import QuestionariosCrud from "@/components/QuestionariosCrud";
import DesafiosCrud from "@/components/DesafiosCrud";
import PontosColetaCrud from "@/components/PontosColetaCrud";
import RegistrosDescarte from "@/components/RegistrosDescarte";
import PesquisaExperiencia from "@/components/PesquisaExperiencia";
import { useAuth } from "@/_core/hooks/useAuth";
import { registrarAcaoOnboarding, termosOnboardingEquivalentes } from "@/lib/onboarding";
import {
  listarMateriais,
  listarSessoes,
  obterPerfilAtual,
  atualizarPerfil,
  listarDesafios,
  obterProgressoUsuario,
  revogarSessao as revogarSessaoApi,
  revogarTodasSessoes,
} from "@/lib/api";
import {
  CODIGOS_PERMISSAO,
  PERFIS_ACESSO,
  podeAcessarPagina,
  type CodigoPermissao,
  type PapelAcesso,
} from "@shared/permissoes";

type DashboardState = {
  ecoPoints: number;
  currentStreak: number;
  badgesUnlocked: number;
  seals: Array<{ code: string; name: string; description: string; minimumPoints: number; earned: boolean }>;
  pointsBySource: Array<{ source: string; points: number; events: number }>;
  activeChallenges: Array<{ id: string; name: string; description: string; points: number; progress: number; target: number }>;
  dailyTip: string;
  quickActions: { id: string; label: string; description: string }[];
};
type DesafioDashboard = Awaited<ReturnType<typeof listarDesafios>>["desafios"][number];
type MaterialsState = MaterialGuia[];
type SessoesAtivasState = {
  id: string;
  agente: string;
  enderecoIp: string;
  criadaEm: string;
  expiraEm: string;
  atual: boolean;
}[];

function normalizarBusca(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

const SUGESTOES_BUSCA = ["Pilha", "Garrafa PET", "Óleo de cozinha", "Celular"];

/** Orientações gerais de descarte, alinhadas às cores da coleta seletiva (CONAMA 275/2001). */
const DICAS_DESCARTE = [
  "Pilhas e baterias não vão no lixo comum. Leve a pontos de coleta específicos, como lojas e supermercados.",
  "Óleo de cozinha usado não deve ir para a pia. Guarde em uma garrafa PET fechada e leve a um ponto de coleta.",
  "Lave rapidamente potes e embalagens antes de separar. Restos de comida atrapalham a reciclagem.",
  "Papel engordurado, como guardanapo e caixa de pizza suja, não é reciclável. Descarte no lixo comum.",
  "Embrulhe vidros quebrados em jornal ou papelão para proteger quem faz a coleta.",
  "Amasse latas e garrafas plásticas: elas ocupam menos espaço e facilitam o transporte.",
  "Celulares e outros eletrônicos têm peças tóxicas. Procure pontos de coleta de eletroeletrônicos.",
  "Cascas de frutas e restos de verduras podem virar adubo com a compostagem.",
];

const ORIGENS_PONTOS: Array<{ origem: string; rotulo: string; Icone: LucideIcon; cor: string }> = [
  { origem: "descarte_validado", rotulo: "Descartes aprovados", Icone: Recycle, cor: "#2f9a5f" },
  { origem: "quiz_correto", rotulo: "Respostas certas no quiz", Icone: CircleHelp, cor: "#c98a12" },
  { origem: "desafio_concluido", rotulo: "Desafios concluídos", Icone: Target, cor: "#d0493e" },
];

function saudacaoDoMomento(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function calcularProgressoNivel(pontos: number): { percentual: number; mensagem: string; nivelAtual: string } {
  const faixas = [
    { inicio: 0, fim: 500, nome: "Explorador" },
    { inicio: 500, fim: 1000, nome: "Reciclador" },
    { inicio: 1000, fim: 2000, nome: "Agente ambiental" },
    { inicio: 2000, fim: 4000, nome: "Guerreiro ecológico" },
  ];
  if (pontos >= 4000) return { percentual: 100, mensagem: "Você alcançou o nível máximo. Parabéns!", nivelAtual: "Guerreiro ecológico" };

  const indiceFaixa = Math.max(0, faixas.findIndex(item => pontos >= item.inicio && pontos < item.fim));
  const faixa = faixas[indiceFaixa];
  const percentual = Math.max(0, Math.min(100, Math.round(((pontos - faixa.inicio) / (faixa.fim - faixa.inicio)) * 100)));
  const faltam = Math.max(0, faixa.fim - pontos);
  return {
    percentual,
    mensagem: `Faltam ${faltam.toLocaleString("pt-BR")} pontos para o nível ${faixa.nome}.`,
    nivelAtual: indiceFaixa === 0 ? "Iniciante" : faixas[indiceFaixa - 1].nome,
  };
}

function resumirDesafioDashboard(desafio: DesafioDashboard) {
  const totalMeta = desafio.criterios.length
    ? desafio.criterios.reduce((total, criterio) => total + criterio.meta, 0)
    : desafio.metaQuantidade;
  const progresso = desafio.criterios.length
    ? desafio.progressoCriterios.reduce((total, item) => total + Math.min(item.progresso, item.criterio?.meta ?? 0), 0)
    : desafio.quantidadeProgresso;
  return {
    id: desafio.idDesafio,
    name: desafio.nomeDesafio,
    description: desafio.descricaoDesafio,
    points: desafio.quantidadePontos,
    progress: Math.min(progresso, totalMeta),
    target: Math.max(1, totalMeta),
  };
}

export default function Home() {
  const { user, identidade, isAuthenticated, loading: authLoading, error: authError, logout, solicitarVerificacaoEmail } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const [transicaoEntrada] = useState(() => lerTransicao() === "entrada");
  const [entradaConcluida, setEntradaConcluida] = useState(() => !transicaoEntrada);
  const [saindo, setSaindo] = useState(false);
  const [avisoVerificacao, setAvisoVerificacao] = useState<string | null>(null);
  const [perfilOficial, setPerfilOficial] = useState<{ nomeUsuario: string; emailUsuario: string; statusUsuario: string } | null>(null);
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState<string | null>(null);
  const [reivindicandoVerificacao, setReivindicandoVerificacao] = useState(false);
  const emailVerificado = identidade?.emailVerificadoUsuario ?? true;

  useEffect(() => {
    if (entradaConcluida) return;
    limparTransicao();
    const temporizador = window.setTimeout(() => setEntradaConcluida(true), 2400);
    return () => window.clearTimeout(temporizador);
  }, [entradaConcluida]);

  async function sairComTransicao() {
    if (saindo) return;
    setSaindo(true);
    marcarTransicao("saida");
    await esperar(1900);
    await logout();
  }

  async function reenviarVerificacao() {
    if (!identidade?.emailUsuario) return;
    setReivindicandoVerificacao(true);
    setAvisoVerificacao(null);
    try {
      const resposta = await solicitarVerificacaoEmail(identidade.emailUsuario);
      setAvisoVerificacao(resposta.mensagemResultado);
    } catch {
      setAvisoVerificacao("Não foi possível solicitar o envio agora. Tente novamente em instantes.");
    } finally {
      setReivindicandoVerificacao(false);
    }
  }
  const papeis = identidade?.papeisUsuario ?? [];
  const papel = (papeis.includes("administrador")
    ? "administrador"
    : papeis.find(item => ["usuario", "pesquisador", "revisor"].includes(item)) ?? "usuario") as PapelAcesso;
  const permissoesBanco = (identidade?.permissoesUsuario ?? []) as CodigoPermissao[];
  const permissoes = papel === "administrador"
    ? Array.from(new Set([...permissoesBanco, ...CODIGOS_PERMISSAO]))
    : permissoesBanco;
  const [paginaAtiva, setPaginaAtiva] = useState("inicio");
  const [areaObrigatoria, setAreaObrigatoria] = useState<string | null>(null);
  const termoBuscaInicialRef = useRef<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [carregandoDashboard, setCarregandoDashboard] = useState(true);
  const [materials, setMaterials] = useState<MaterialsState>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [buscaGuia, setBuscaGuia] = useState("");
  const [erroBuscaGuia, setErroBuscaGuia] = useState("");
  const [buscaInicio, setBuscaInicio] = useState("");
  const [carregandoMateriais, setCarregandoMateriais] = useState(true);
  const [erroMateriais, setErroMateriais] = useState(false);
  const [versaoRecarregaGuia, setVersaoRecarregaGuia] = useState(0);
  const [categoriaPontosInicial, setCategoriaPontosInicial] = useState("");
  const [pontoDescarteInicial, setPontoDescarteInicial] = useState<{ idPontoColeta: string; nomePontoColeta: string; cidadePontoColeta: string } | null>(null);
  const [erroDados, setErroDados] = useState(false);
  const [sessoesAtivas, setSessoesAtivas] = useState<SessoesAtivasState>([]);
  const [carregandoSessoes, setCarregandoSessoes] = useState(false);
  const [erroSessoes, setErroSessoes] = useState<string | null>(null);
  const [revogandoSessoes, setRevogandoSessoes] = useState(false);

  const perfilBase = PERFIS_ACESSO[papel];
  const nomeAutenticado = perfilOficial?.nomeUsuario?.trim() || user?.name?.trim() || perfilBase.nomeDemonstracao;
  const iniciais = nomeAutenticado.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]?.toUpperCase()).join("") || perfilBase.iniciais;
  const perfil = { ...perfilBase, nomeDemonstracao: nomeAutenticado, iniciais };
  const pode = (permissao: CodigoPermissao) => permissoes.includes(permissao);
  const nomeCurto = nomeAutenticado.split(/\s+/).slice(0, 2).join(" ");
  const podeLerGamificacao = pode("gamificacao:ler");
  const podeParticiparDesafios = pode("gamificacao:participar");
  const podeLerMateriais = pode("materiais:ler");
  const podeConsultarSus = pode("avaliacao_usabilidade:consultar_agregados");
  const podeEnviarSus = pode("avaliacao_usabilidade:enviar");
  const paginaEfetiva = podeAcessarPagina(paginaAtiva, permissoes) ? paginaAtiva : "inicio";

  useEffect(() => {
    if (!isAuthenticated) return;
    void obterPerfilAtual().then(perfilAtual => {
      setPerfilOficial({ nomeUsuario: perfilAtual.nomeUsuario, emailUsuario: perfilAtual.emailUsuario, statusUsuario: perfilAtual.statusUsuario });
      setNovoNome(perfilAtual.nomeUsuario);
    }).catch(() => setAvisoPerfil("Não foi possível carregar o perfil oficial agora."));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !podeLerGamificacao || paginaEfetiva !== "inicio") return;
    async function carregarDados() {
      setCarregandoDashboard(true);
      setErroDados(false);
      try {
        const [resultadoPainel, resultadoDesafios] = await Promise.allSettled([
          obterProgressoUsuario(),
          podeParticiparDesafios ? listarDesafios() : Promise.resolve({ desafios: [] }),
        ]);
        const painel = resultadoPainel.status === "fulfilled" ? resultadoPainel.value : null;
        const desafios = resultadoDesafios.status === "fulfilled" ? resultadoDesafios.value.desafios : [];
        setDashboard(painel ? {
          ecoPoints: painel.quantidadePontos,
          currentStreak: painel.sequenciaDias,
          badgesUnlocked: painel.quantidadeConquistas,
          seals: painel.selos.map(selo => ({ code: selo.codigo, name: selo.nome, description: selo.descricao, minimumPoints: selo.pontosMinimos, earned: selo.conquistado })),
          pointsBySource: painel.resumoPorOrigem.map(item => ({ source: item.origem, points: item.quantidadePontos, events: item.quantidadeEventos })),
          activeChallenges: desafios.filter(desafio => desafio.statusParticipacao === "participando").map(resumirDesafioDashboard),
          dailyTip: "Sua pontuação reflete as atividades registradas e as recompensas concedidas na plataforma.",
          quickActions: [
            { id: "guide", label: "Consultar guia", description: "Aprenda como descartar melhor." },
            { id: "quiz", label: "Responder quiz", description: "Teste seu conhecimento ambiental." },
            { id: "challenge", label: "Ver desafios", description: "Transforme intenção em hábito." },
          ],
        } : null);
        setErroDados(resultadoPainel.status === "rejected");
      } catch {
        setDashboard(null);
        setErroDados(true);
      } finally {
        setCarregandoDashboard(false);
      }
    }
    void carregarDados();
  }, [isAuthenticated, podeLerGamificacao, podeParticiparDesafios, paginaEfetiva]);

  useEffect(() => {
    if (!isAuthenticated || !podeLerMateriais) {
      setMaterials([]);
      setCarregandoMateriais(false);
      setErroMateriais(false);
      return;
    }
    let ativo = true;
    setCarregandoMateriais(true);
    setErroMateriais(false);
    async function filtrarMateriais() {
      try {
        const resposta = await listarMateriais("", "", "publicado");
        if (!ativo) return;
        setMaterials(resposta.materiais.map(material => ({
          id: material.idMaterial,
          name: material.nomeMaterial,
          category: material.categoriaMaterial,
          classification: material.classificacao,
          disposalInstruction: material.instrucaoDescarte,
          impactNote: material.observacaoImpacto,
          synonyms: material.sinonimos,
          preparation: material.preparacao,
          cautions: material.cuidados,
          acceptedPointCategories: material.categoriasPontos,
          routes: material.rotasReferencia,
          scope: material.abrangencia,
          scopeNote: material.notaAbrangencia,
          sources: material.fontesReferencia.map(fonte => ({ title: fonte.titulo, url: fonte.url, supports: fonte.comprova })),
          verifiedAt: material.dataVerificacao,
        })));
      } catch {
        if (ativo) setErroMateriais(true);
      } finally {
        if (ativo) setCarregandoMateriais(false);
      }
    }
    void filtrarMateriais();
    return () => {
      ativo = false;
    };
  }, [isAuthenticated, podeLerMateriais, versaoRecarregaGuia]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let ativo = true;
    async function carregarSessoes() {
      setCarregandoSessoes(true);
      setErroSessoes(null);
      try {
        const resposta = await listarSessoes();
        if (!ativo) return;
        setSessoesAtivas(resposta.sessoes.map(sessao => ({
          id: sessao.idSessao,
          agente: sessao.agenteUsuario || "Dispositivo não identificado",
          enderecoIp: sessao.enderecoIp || "IP não informado",
          criadaEm: sessao.dataCriacao,
          expiraEm: sessao.dataExpiracao,
          atual: sessao.atual,
        })));
      } catch {
        if (ativo) setErroSessoes("Não foi possível consultar as sessões ativas agora.");
      } finally {
        if (ativo) setCarregandoSessoes(false);
      }
    }
    void carregarSessoes();
    return () => { ativo = false; };
  }, [isAuthenticated]);

  const progresso = useMemo(() => dashboard ? calcularProgressoNivel(dashboard.ecoPoints) : null, [dashboard]);

  const materiaisFiltrados = useMemo(() => {
    const termo = normalizarBusca(query.trim());
    const categoriaSelecionada = normalizarBusca(selectedCategory);
    return materials.filter(material => {
      const correspondeCategoria = selectedCategory === "Todos" || normalizarBusca(material.category) === categoriaSelecionada;
      const texto = normalizarBusca([
        material.name,
        material.category,
        material.classification,
        material.disposalInstruction,
        ...material.synonyms,
      ].join(" "));
      return correspondeCategoria && (!termo || texto.includes(termo));
    });
  }, [materials, query, selectedCategory]);

  function abrirPontosParaMaterial(categorias: string[]) {
    setCategoriaPontosInicial(categorias[0] ?? "");
    mudarPaginaAutorizada("pontos");
  }

  function renderizarInicio() {
    const atalhos = [
      { id: "materiais", titulo: "Guia de descarte", texto: "Descubra onde jogar cada material.", Icone: BookOpen, cor: "#2f6fb0", corTexto: "#2f6fb0", fundo: "#e8f0fa", liberado: pode("materiais:ler") },
      { id: "pontos", titulo: "Pontos de coleta", texto: "Encontre locais que recebem seu resíduo.", Icone: MapPinned, cor: "#2f9a5f", corTexto: "#1d7048", fundo: "#e6f5ec", liberado: podeAcessarPagina("pontos", permissoes) },
      { id: "questionarios", titulo: "Quiz e questionários", texto: "Teste o que você sabe e aprenda brincando.", Icone: CircleHelp, cor: "#c98a12", corTexto: "#805800", fundo: "#fdf3dc", liberado: pode("questionarios:responder") },
      { id: "desafios", titulo: "Desafios", texto: "Complete ações e ganhe pontos.", Icone: Trophy, cor: "#d0493e", corTexto: "#a33c32", fundo: "#fbe9e7", liberado: pode("gamificacao:participar") },
    ].filter(atalho => atalho.liberado);
    const dicaDoDia = DICAS_DESCARTE[Math.floor(Date.now() / 86_400_000) % DICAS_DESCARTE.length];
    const totalSelos = dashboard?.seals.length ?? 0;
    const maiorOrigem = Math.max(1, ...(dashboard?.pointsBySource.map(item => item.points) ?? [0]));

    return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_12%_0%,rgba(119,190,120,.3),transparent_45%),linear-gradient(150deg,#1b4332,#12291f)] px-5 py-6 text-white shadow-[0_28px_60px_-36px_rgba(23,54,42,.8)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(90deg,#000,transparent_70%)]" aria-hidden="true" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_minmax(0,25rem)] lg:items-center">
            <div>
              <p className="text-sm font-bold text-[#b8e07a]">{saudacaoDoMomento()}, {nomeCurto}!</p>
              <h2 className="mt-2 max-w-xl text-[1.75rem] font-black leading-[1.1] tracking-[-0.035em] sm:text-[2.1rem]">O que você vai descartar hoje?</h2>
              <p className="mt-3 max-w-lg text-[15px] leading-6 text-[#bfd4c4]">Pesquise um material e veja como separar e onde entregar.</p>
            </div>
            <form
              onSubmit={event => {
                event.preventDefault();
                const termo = buscaInicio.trim();
                const campoBusca = document.getElementById("busca-material-inicio");
                if (termo.length < 2) {
                  if (campoBusca instanceof HTMLInputElement) {
                    campoBusca.setCustomValidity("Digite pelo menos dois caracteres para pesquisar.");
                    campoBusca.reportValidity();
                  }
                  return;
                }
                if (campoBusca instanceof HTMLInputElement) campoBusca.setCustomValidity("");
                if (areaObrigatoria === "inicio") termoBuscaInicialRef.current = termo;
                registrarAcaoOnboarding("buscar_inicio");
                setQuery(termo);
                setBuscaGuia(termo);
                setErroBuscaGuia("");
                setSelectedCategory("Todos");
                setPaginaAtiva("materiais");
              }}
              data-onboarding-action="buscar_inicio"
              className="rounded-2xl bg-white p-4 text-[#17362a] shadow-[0_20px_40px_-20px_rgba(0,0,0,.45)] sm:p-5"
            >
              <label htmlFor="busca-material-inicio" className="block text-sm font-black">Buscar material</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#86a092]" aria-hidden="true" />
                  <input
                    id="busca-material-inicio"
                    required
                    minLength={2}
                    value={buscaInicio}
                    onChange={event => { event.currentTarget.setCustomValidity(""); setBuscaInicio(event.target.value); }}
                    placeholder="Ex.: pilha, vidro, papel"
                    autoComplete="off"
                    className="h-12 w-full rounded-xl border border-[#d6e2d9] bg-white pl-10 pr-3 text-[15px] outline-none transition hover:border-[#b9cfc0] focus:border-[#1d7953] focus:ring-4 focus:ring-[#1d7953]/10"
                  />
                </div>
                <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-5 text-[15px] font-black text-white transition hover:bg-[#17362a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">
                  Buscar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-[#4b6657]">Sugestões:</span>
                {SUGESTOES_BUSCA.map(sugestao => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => { setBuscaInicio(sugestao); document.getElementById("busca-material-inicio")?.focus(); }}
                    className="rounded-full bg-[#eef5ec] px-2.5 py-1 text-xs font-bold text-[#2c6b4a] transition hover:bg-[#dcefd6]"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </section>

        {podeLerGamificacao ? (
          dashboard && progresso ? (
            <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]" aria-label="Seu progresso">
              <article className="relative overflow-hidden rounded-[24px] bg-[#e6f1d0] p-5 sm:p-6">
                <Leaf className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 rotate-12 text-[#d3e6b4]" aria-hidden="true" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#4f6b44]">Seu nível</p>
                    <h3 className="mt-0.5 text-2xl font-black tracking-tight text-[#1d4a34]">{progresso.nivelAtual}</h3>
                  </div>
                  <div className="text-right">
                    <strong className="block text-3xl font-black leading-none tracking-tight text-[#1d4a34] tabular-nums">{dashboard.ecoPoints.toLocaleString("pt-BR")}</strong>
                    <span className="text-xs font-bold text-[#4f6b44]">pontos</span>
                  </div>
                </div>
                <div className="relative mt-5 h-3.5 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-label="Progresso até o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso.percentual}>
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#3c9a5f,#1d7953)] transition-all duration-700" style={{ width: `${Math.max(progresso.percentual, 3)}%` }} />
                </div>
                <p className="relative mt-2 text-sm font-semibold text-[#4f6b44]">{progresso.mensagem}</p>
              </article>
              <div className="grid grid-cols-2 gap-4">
                <article className="flex flex-col justify-between rounded-[24px] border border-[#f3dfe4] bg-white p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fde8e4] text-[#d0493e]"><Flame className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="mt-4">
                    <strong className="block text-3xl font-black leading-none tracking-tight tabular-nums">{dashboard.currentStreak}</strong>
                    <p className="mt-1 text-sm font-semibold text-[#4b6657]">{dashboard.currentStreak === 1 ? "dia seguido" : "dias seguidos"}</p>
                  </div>
                </article>
                <article className="flex flex-col justify-between rounded-[24px] border border-[#f1e6c9] bg-white p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fdf3dc] text-[#c98a12]"><Award className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="mt-4">
                    <strong className="block text-3xl font-black leading-none tracking-tight tabular-nums">{dashboard.badgesUnlocked}{totalSelos ? <span className="text-lg text-[#4b6657]">/{totalSelos}</span> : null}</strong>
                    <p className="mt-1 text-sm font-semibold text-[#4b6657]">selos conquistados</p>
                  </div>
                </article>
              </div>
            </section>
          ) : (
            <section className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 text-sm font-semibold text-[#4b6657]" aria-live="polite">
              {carregandoDashboard ? (
                <div className="flex items-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d6efad] border-t-[#1d7953]" aria-hidden="true" /> Carregando seu progresso...</div>
              ) : erroDados ? "Não foi possível carregar seu progresso agora. Tente novamente em instantes." : "Seu progresso ainda não está disponível."}
            </section>
          )
        ) : null}

        {podeParticiparDesafios ? (
          <section aria-label="Desafios ativos" className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black tracking-tight">Desafios em andamento</h3>
                <p className="mt-1 text-sm text-[#4b6657]">Acompanhe suas metas e o progresso atual.</p>
              </div>
              <button type="button" onClick={() => mudarPaginaAutorizada("desafios")} className={ESTILOS.botaoSecundario}>Explorar desafios</button>
            </div>
            {dashboard?.activeChallenges.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {dashboard.activeChallenges.slice(0, 2).map(desafio => (
                  <article key={desafio.id} className="rounded-2xl border border-[#e1ebe2] bg-[#fafcf9] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-black leading-5 text-[#17362a]">{desafio.name}</h4>
                      <span className="shrink-0 rounded-full bg-[#fff4dc] px-2.5 py-1 text-xs font-black text-[#805800]">{desafio.points} pontos</span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-[#4b6657]">{desafio.description}</p>
                    <div className="mt-3 flex items-center justify-between text-sm font-bold text-[#3f5c4c]">
                      <span>Seu progresso</span><span>{desafio.progress}/{desafio.target}</span>
                    </div>
                    <BarraProgresso percentual={Math.min(100, Math.round((desafio.progress / Math.max(1, desafio.target)) * 100))} tom="verde" rotulo={`Progresso no desafio ${desafio.name}`} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-[#f7faf7] p-4 text-sm leading-6 text-[#4b6657]">
                {carregandoDashboard ? "Carregando seus desafios…" : "Você ainda não participa de um desafio ativo. Explore os desafios disponíveis para começar."}
              </p>
            )}
          </section>
        ) : null}

        {atalhos.length ? (
          <section aria-labelledby="titulo-atalhos">
            <h3 id="titulo-atalhos" className="text-lg font-black tracking-tight">O que você quer fazer hoje?</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {atalhos.map(({ id, titulo, texto, Icone, cor, corTexto, fundo }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => mudarPaginaAutorizada(id)}
                  className="group relative flex flex-col rounded-[22px] border border-[#e4ece4] bg-white p-4 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_36px_-24px_rgba(23,54,42,.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] sm:p-5"
                  style={{ ["--cor-atalho" as string]: cor }}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-110" style={{ backgroundColor: fundo, color: cor }}><Icone className="h-6 w-6" aria-hidden="true" /></span>
                  <strong className="mt-4 block text-[15px] font-black">{titulo}</strong>
                  <span className="mt-1 block text-[13px] leading-5 text-[#4b6657]">{texto}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-black" style={{ color: corTexto }}>Abrir <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                  <span className="absolute inset-x-5 top-0 h-1 rounded-b-full opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: cor }} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className={`grid gap-4 ${podeLerGamificacao && dashboard ? "xl:grid-cols-[1.45fr_1fr]" : ""}`}>
          {podeLerGamificacao && dashboard && dashboard.seals.length ? (
            <article className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight">Sua coleção de selos</h3>
                  <p className="mt-0.5 text-sm text-[#4b6657]">Junte pontos para desbloquear cada selo.</p>
                </div>
                <Trophy className="h-6 w-6 shrink-0 text-[#c98a12]" aria-hidden="true" />
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.seals.map(selo => {
                  const avanco = selo.minimumPoints > 0 ? Math.min(100, Math.round((dashboard.ecoPoints / selo.minimumPoints) * 100)) : 100;
                  const faltam = Math.max(0, selo.minimumPoints - dashboard.ecoPoints);
                  return (
                    <li key={selo.code} className={`rounded-2xl border p-4 transition ${selo.earned ? "border-[#f0dca6] bg-[linear-gradient(160deg,#fff9e8,#fdf1cf)]" : "border-[#e8ede7] bg-[#f8faf7]"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${selo.earned ? "bg-[#e9b949] text-white shadow-[0_6px_16px_-6px_rgba(201,138,18,.8)]" : "bg-[#e7ebe6] text-[#9aa79e]"}`}>
                          {selo.earned ? <Award className="h-5 w-5" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                        </span>
                        <div className="min-w-0">
                          <strong className={`block truncate text-sm font-black ${selo.earned ? "text-[#7a5408]" : "text-[#4a6455]"}`}>{selo.name}</strong>
                          <span className="text-xs font-semibold text-[#4b6657]">{selo.earned ? "Conquistado!" : `Faltam ${faltam.toLocaleString("pt-BR")} pontos`}</span>
                        </div>
                      </div>
                      {!selo.earned ? (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e3e9e2]" aria-hidden="true"><div className="h-full rounded-full bg-[#9fc98a]" style={{ width: `${avanco}%` }} /></div>
                      ) : null}
                      <p className="mt-2 text-xs leading-5 text-[#4b6657]">{selo.description}</p>
                    </li>
                  );
                })}
              </ul>
            </article>
          ) : null}

          <div className="grid content-start gap-4">
            <article className="relative overflow-hidden rounded-[24px] bg-[#fff8e6] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black text-[#70500b]"><Lightbulb className="h-5 w-5" aria-hidden="true" /> Dica do dia</div>
              <p className="mt-2 text-[15px] font-semibold leading-6 text-[#5c4710]">{dicaDoDia}</p>
            </article>

            {podeLerGamificacao && dashboard ? (
              <article className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 sm:p-6">
                <h3 className="text-lg font-black tracking-tight">De onde vêm seus pontos</h3>
                <ul className="mt-4 space-y-3">
                  {ORIGENS_PONTOS.map(({ origem, rotulo, Icone, cor }) => {
                    const item = dashboard.pointsBySource.find(resumo => resumo.source === origem);
                    const pontos = item?.points ?? 0;
                    return (
                      <li key={origem}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="inline-flex items-center gap-2 font-bold text-[#3f5c4c]"><Icone className="h-4 w-4" style={{ color: cor }} aria-hidden="true" />{rotulo}</span>
                          <strong className="font-black tabular-nums text-[#17362a]">{pontos.toLocaleString("pt-BR")} pts</strong>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf2ec]" aria-hidden="true"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(pontos / maiorOrigem) * 100}%`, backgroundColor: cor }} /></div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-xs leading-5 text-[#4b6657]">Pontos mais antigos podem não aparecer nesta divisão.</p>
              </article>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  function renderizarMateriais() {
    const possuiFiltro = Boolean(query.trim()) || selectedCategory !== "Todos";
    const categorias = ["Todos", ...Array.from(new Set(materials.map(material => material.category))).sort((a, b) => a.localeCompare(b, "pt-BR"))];

    return (
      <div className="space-y-5">
        <CabecalhoPagina icone={BookOpen} tom="azul" titulo="Guia de descarte" descricao="Pesquise um material e veja como separar, preparar e onde entregar.">
          <form
            data-onboarding-action="buscar_guia"
            onSubmit={event => {
              event.preventDefault();
              const termo = buscaGuia.trim();
              const campoBusca = document.getElementById("busca-guia-material");
              if (termo.length < 2) {
                setErroBuscaGuia("Digite pelo menos dois caracteres para pesquisar.");
                if (campoBusca instanceof HTMLInputElement) {
                  campoBusca.setCustomValidity("Digite pelo menos dois caracteres para pesquisar.");
                  campoBusca.reportValidity();
                }
                return;
              }
              const termoInicial = termoBuscaInicialRef.current;
              if (areaObrigatoria === "materiais" && termoInicial && termosOnboardingEquivalentes(termo, termoInicial)) {
                setErroBuscaGuia("Altere o termo da busca anterior para concluir esta etapa.");
                if (campoBusca instanceof HTMLInputElement) {
                  campoBusca.setCustomValidity("Altere o termo da busca anterior para concluir esta etapa.");
                  campoBusca.reportValidity();
                }
                return;
              }
              if (campoBusca instanceof HTMLInputElement) campoBusca.setCustomValidity("");
              setErroBuscaGuia("");
              setQuery(termo);
              setSelectedCategory("Todos");
              if (areaObrigatoria === "materiais") registrarAcaoOnboarding("buscar_guia");
            }}
          >
            <label htmlFor="busca-guia-material" className="sr-only">Buscar material pelo nome ou categoria</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#86a092]" aria-hidden="true" />
                <input id="busca-guia-material" type="search" required minLength={2} enterKeyHint="search" autoComplete="off" aria-controls="resultado-materiais" className={`${ESTILOS.campo} pl-11 pr-11`} value={buscaGuia} onChange={event => { event.currentTarget.setCustomValidity(""); setBuscaGuia(event.currentTarget.value); setErroBuscaGuia(""); }} placeholder="Ex.: pilha, garrafa PET, papelão" />
                {buscaGuia || query ? <button type="button" onClick={() => { setBuscaGuia(""); setQuery(""); setErroBuscaGuia(""); }} aria-label="Limpar busca do Guia" title="Limpar busca" className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[#638775] hover:bg-[#eaf3e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]"><X className="h-4 w-4" aria-hidden="true" /></button> : null}
              </div>
              <button type="submit" className={`${ESTILOS.botaoPrincipal} h-12`}><Search className="h-4 w-4" aria-hidden="true" />Buscar</button>
            </div>
            {erroBuscaGuia ? <p className="mt-2 text-sm font-semibold text-[#a8493e]" role="alert">{erroBuscaGuia}</p> : null}
          </form>
          {categorias.length > 1 ? (
            <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por categoria">
              {categorias.map(categoria => {
                const ativa = selectedCategory === categoria;
                const tom = TONS[categoria === "Todos" ? "verde" : tomDaCategoria(categoria)];
                return (
                  <button
                    key={categoria}
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => setSelectedCategory(categoria)}
                    className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]"
                    style={ativa ? { backgroundColor: tom.fundo, borderColor: tom.cor, color: tom.texto } : { backgroundColor: "#fff", borderColor: tom.borda, color: tom.texto }}
                  >
                    {categoria !== "Todos" ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tom.cor }} aria-hidden="true" /> : null}
                    {categoria}
                  </button>
                );
              })}
            </div>
          ) : null}
        </CabecalhoPagina>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-[#4a6455]" role="status" aria-live="polite" aria-atomic="true">
            {carregandoMateriais ? "Buscando orientações…" : erroMateriais ? "Não foi possível consultar os resultados." : `${materiaisFiltrados.length} ${materiaisFiltrados.length === 1 ? "material encontrado" : "materiais encontrados"}${query.trim() ? ` para “${query.trim()}”` : ""}`}
          </p>
          {possuiFiltro && !carregandoMateriais ? <button type="button" onClick={() => { setQuery(""); setBuscaGuia(""); setErroBuscaGuia(""); setSelectedCategory("Todos"); }} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-[#1d7953] hover:bg-[#eef6ea]"><X className="h-4 w-4" aria-hidden="true" />Limpar filtros</button> : null}
        </div>

        <div id="resultado-materiais" aria-busy={carregandoMateriais}>
          {carregandoMateriais ? <Carregando texto="Buscando orientações…" /> : null}
          {erroMateriais ? <Aviso tipo="erro" acao={<button type="button" onClick={() => setVersaoRecarregaGuia(versao => versao + 1)} className={ESTILOS.botaoSecundario}>Tentar novamente</button>}>Não foi possível carregar as orientações agora.</Aviso> : null}
          {!carregandoMateriais && !erroMateriais && materiaisFiltrados.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {materiaisFiltrados.map(material => <GuiaMaterialCard key={material.id} material={material} onEncontrarPonto={abrirPontosParaMaterial} />)}
            </div>
          ) : null}
          {!carregandoMateriais && !erroMateriais && materials.length > 0 && materiaisFiltrados.length === 0 && possuiFiltro ? (
            <EstadoVazio icone={Search} tom="azul" titulo="Nenhum material encontrado" descricao="Tente outra palavra, como o nome do objeto ou do que ele é feito." acao={<button type="button" onClick={() => { setQuery(""); setBuscaGuia(""); setErroBuscaGuia(""); setSelectedCategory("Todos"); }} className={ESTILOS.botaoSecundario}>Limpar busca e filtros</button>} />
          ) : null}
          {!carregandoMateriais && !erroMateriais && materials.length === 0 ? (
            <EstadoVazio icone={BookOpen} tom="azul" titulo="O Guia ainda está sendo preparado" descricao="Enquanto isso, você pode procurar um ponto de coleta na sua cidade." acao={<button type="button" onClick={() => mudarPaginaAutorizada("pontos")} className={ESTILOS.botaoPrincipal}><MapPinned className="h-4 w-4" aria-hidden="true" />Encontrar ponto de coleta</button>} />
          ) : null}
        </div>
      </div>
    );
  }
  function renderizarPontos() {
    const permiteAlteracoes = !areaObrigatoria;
    return <div className="space-y-8">
      {areaObrigatoria === "pontos" ? <Aviso tipo="info">Durante o passo a passo, cadastro, descarte e busca por proximidade ficam pausados. Eles serão liberados quando você concluir as três ações iniciais.</Aviso> : null}
      <PontosColetaCrud podeEscrever={pode("pontos_coleta:escrever") && permiteAlteracoes} podeAprovar={pode("pontos_coleta:aprovar") && permiteAlteracoes} podeRegistrar={pode("gamificacao:participar") && permiteAlteracoes} permiteLocalizacaoBusca={permiteAlteracoes} categoriaInicial={categoriaPontosInicial} onIniciarDescarte={setPontoDescarteInicial} />
      <RegistrosDescarte podeRegistrar={pode("gamificacao:participar") && permiteAlteracoes} podeLer={podeLerGamificacao} podeRevisar={pode("pontos_coleta:aprovar") && permiteAlteracoes} pontoInicial={pontoDescarteInicial} onPontoInicialAplicado={() => setPontoDescarteInicial(null)} />
    </div>;
  }

  function renderizarQuestionarios() {
    return <QuestionariosCrud podeAdministrar={pode("questionarios:administrar")} podeResponder={pode("questionarios:responder")} />;
  }

  function renderizarDesafios() {
    return <DesafiosCrud podeAdministrar={pode("gamificacao:administrar")} podeLer={podeLerGamificacao} podeParticipar={pode("gamificacao:participar")} />;
  }

  function renderizarPesquisa() {
    return <PesquisaExperiencia podeEnviar={podeEnviarSus} podeConsultar={podeConsultarSus} />;
  }

  function renderizarRevisao() {
    return <MateriaisCrud podeEscrever={pode("materiais:escrever")} podeAprovar={pode("materiais:aprovar")} />;
  }

  function renderizarAdministracao() {
    return <AdministracaoCrud podeConsultarResumo={pode("administracao:consultar")} podeGerenciarAcessos={pode("administracao:gerenciar_acessos")} podeConsultarAuditoria={pode("auditoria:consultar")} />;
  }

  function formatarDataSessao(valor: string): string {
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
      ? "Data não informada"
      : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  async function encerrarTodasSessoes() {
    if (!window.confirm("Encerrar todas as sessões ativas? Será necessário entrar novamente.")) return;
    setRevogandoSessoes(true);
    setErroSessoes(null);
    try {
      await revogarTodasSessoes();
      await sairComTransicao();
    } catch {
      setErroSessoes("Não foi possível encerrar as sessões agora. Tente novamente.");
      setRevogandoSessoes(false);
    }
  }

  async function salvarNomePerfil() {
    const nome = novoNome.trim().replace(/\s+/g, " ");
    if (nome.length < 2) {
      setAvisoPerfil("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    setSalvandoNome(true);
    setAvisoPerfil(null);
    try {
      const resposta = await atualizarPerfil(nome);
      if (resposta.perfil) {
        setPerfilOficial({ nomeUsuario: resposta.perfil.nomeUsuario, emailUsuario: resposta.perfil.emailUsuario, statusUsuario: resposta.perfil.statusUsuario });
        setNovoNome(resposta.perfil.nomeUsuario);
      }
      setEditandoNome(false);
      setAvisoPerfil("Perfil atualizado com sucesso.");
    } catch {
      setAvisoPerfil("Não foi possível atualizar o perfil agora.");
    } finally {
      setSalvandoNome(false);
    }
  }

  async function encerrarSessao(idSessao: string, atual: boolean) {
    if (!window.confirm(atual ? "Encerrar sua sessão atual? Será necessário entrar novamente." : "Revogar esta sessão?")) return;
    try {
      await revogarSessaoApi(idSessao);
      if (atual) await sairComTransicao();
      else setSessoesAtivas(sessoes => sessoes.filter(sessao => sessao.id !== idSessao));
    } catch {
      setErroSessoes("Não foi possível revogar esta sessão agora. Tente novamente.");
    }
  }

  function renderizarPerfil() {
    const outrasSessoes = sessoesAtivas.filter(sessao => !sessao.atual).length;
    return (
      <div className="space-y-5">
        <CabecalhoPagina icone={UserRound} tom="verde" titulo="Perfil e sessões" descricao="Veja seus dados e os aparelhos conectados à sua conta." />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
          <section className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_12%_0%,rgba(119,190,120,.3),transparent_45%),linear-gradient(150deg,#1b4332,#12291f)] p-5 text-white sm:p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#b8e07a] text-xl font-black text-[#17362a] shadow-[0_10px_24px_-10px_rgba(184,224,122,.7)]">{perfil.iniciais}</span>
              <div className="min-w-0 flex-1">
                {editandoNome ? (
                  <form className="flex gap-2" onSubmit={evento => { evento.preventDefault(); void salvarNomePerfil(); }}>
                    <input value={novoNome} onChange={evento => setNovoNome(evento.target.value)} autoFocus className="h-11 min-w-0 flex-1 rounded-xl border border-white/25 bg-white/10 px-3 text-[15px] text-white outline-none placeholder:text-white/50 focus:border-[#b8e07a]" aria-label="Nome do perfil" />
                    <button type="submit" disabled={salvandoNome} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#b8e07a] text-[#17362a] disabled:opacity-60" aria-label="Salvar nome"><Save className="h-4 w-4" /></button>
                    <button type="button" onClick={() => { setEditandoNome(false); setAvisoPerfil(null); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white" aria-label="Cancelar edição"><X className="h-4 w-4" /></button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-xl font-black">{perfil.nomeDemonstracao}</h3>
                    <button type="button" onClick={() => { setNovoNome(nomeAutenticado); setEditandoNome(true); setAvisoPerfil(null); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#d6efad] hover:bg-white/10" aria-label="Editar nome"><Pencil className="h-4 w-4" /></button>
                  </div>
                )}
                <p className="mt-0.5 truncate text-sm text-[#bcd2c3]">{perfilOficial?.emailUsuario || user?.email}</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                <dt className="text-xs font-semibold text-[#a9c7b3]">Tipo de conta</dt>
                <dd className="mt-0.5 font-black">{perfil.rotulo}</dd>
              </div>
              <div className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                <dt className="text-xs font-semibold text-[#a9c7b3]">Situação</dt>
                <dd className="mt-0.5 font-black capitalize">{perfilOficial?.statusUsuario || "—"}</dd>
              </div>
              <div className="col-span-2 rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                <dt className="text-xs font-semibold text-[#a9c7b3]">E-mail</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1.5 font-black">{emailVerificado ? <><CircleCheck className="h-4 w-4 text-[#b8e07a]" aria-hidden="true" />Confirmado</> : <><MailWarning className="h-4 w-4 text-[#f3c969]" aria-hidden="true" />Aguardando confirmação</>}</dd>
              </div>
            </dl>
            {avisoPerfil ? <p role="status" className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-[#d6efad]">{avisoPerfil}</p> : null}
            <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#a9c7b3]"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Sua senha nunca fica salva no navegador.</p>
          </section>

          <Cartao
            icone={MonitorSmartphone}
            titulo="Aparelhos conectados"
            descricao={sessoesAtivas.length ? `${sessoesAtivas.length} ${sessoesAtivas.length === 1 ? "sessão ativa" : "sessões ativas"}${outrasSessoes ? `, ${outrasSessoes} em outros aparelhos` : ""}.` : "Onde sua conta está aberta agora."}
            acoes={sessoesAtivas.length ? <button type="button" onClick={() => void encerrarTodasSessoes()} disabled={revogandoSessoes} className={`${ESTILOS.botaoPerigo} w-full sm:w-auto`}><LogOut className="h-4 w-4" aria-hidden="true" />{revogandoSessoes ? "Encerrando..." : "Sair de todos"}</button> : null}
          >
            {carregandoSessoes ? <Carregando texto="Consultando aparelhos conectados..." /> : null}
            {erroSessoes ? <Aviso tipo="erro">{erroSessoes}</Aviso> : null}
            {!carregandoSessoes && !erroSessoes && sessoesAtivas.length === 0 ? <EstadoVazio icone={MonitorSmartphone} titulo="Nenhuma sessão encontrada" /> : null}
            <ul className="space-y-3">
              {sessoesAtivas.map(sessao => (
                <li key={sessao.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${sessao.atual ? "border-[#cfe8d8] bg-[#f3faf5]" : "border-[#e8eee9] bg-[#fafcf9]"}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${sessao.atual ? "bg-[#1d7953] text-white" : "bg-white text-[#497b60] ring-1 ring-[#e1ebe2]"}`}><MonitorSmartphone className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm text-[#17362a]">{sessao.agente}</strong>
                        {sessao.atual ? <Etiqueta tom="verde">Este aparelho</Etiqueta> : null}
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[#4b6657]"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Entrou em {formatarDataSessao(sessao.criadaEm)}<span aria-hidden="true">·</span>{sessao.enderecoIp}</p>
                      {!sessao.atual ? <p className="mt-0.5 text-xs text-[#8aa094]">Expira em {formatarDataSessao(sessao.expiraEm)}</p> : null}
                    </div>
                  </div>
                  <button type="button" onClick={() => void encerrarSessao(sessao.id, sessao.atual)} className={`${ESTILOS.botaoPerigo} min-h-10 w-full sm:w-auto`}>{sessao.atual ? "Sair" : "Desconectar"}</button>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#4b6657]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2f9a5f]" aria-hidden="true" />Não reconhece algum aparelho? Desconecte-o e troque sua senha.</p>
          </Cartao>
        </div>
      </div>
    );
  }
  function renderizarArea() {
    if (!podeAcessarPagina(paginaEfetiva, permissoes)) return renderizarInicio();
    if (paginaEfetiva === "materiais") return renderizarMateriais();
    if (paginaEfetiva === "pontos") return renderizarPontos();
    if (paginaEfetiva === "questionarios") return renderizarQuestionarios();
    if (paginaEfetiva === "desafios") return renderizarDesafios();
    if (paginaEfetiva === "pesquisa") return renderizarPesquisa();
    if (paginaEfetiva === "revisao") return renderizarRevisao();
    if (paginaEfetiva === "administracao") return renderizarAdministracao();
    if (paginaEfetiva === "perfil") return renderizarPerfil();
    return renderizarInicio();
  }

  function mudarPaginaAutorizada(pagina: string) {
    if (areaObrigatoria && pagina !== areaObrigatoria) return;
    if (podeAcessarPagina(pagina, permissoes)) setPaginaAtiva(pagina);
  }

  function abrirAreaOnboarding(pagina: string) {
    if (podeAcessarPagina(pagina, permissoes)) setPaginaAtiva(pagina);
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-5 text-center text-[#17362a]">
        <div className="max-w-md rounded-[28px] border border-[#f2d0c8] bg-white p-8 shadow-[0_24px_50px_-28px_rgba(23,54,42,.25)]">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#b65b4c]" />
          <h1 className="mt-5 text-xl font-black">Não foi possível carregar seu acesso</h1>
          <p className="mt-3 text-sm leading-6 text-[#7c706c]">Sua sessão pode ter expirado ou o serviço de permissões está indisponível. Entre novamente para tentar.</p>
          <button type="button" onClick={() => void logout()} className="mt-6 rounded-xl bg-[#17362a] px-5 py-3 text-sm font-black text-white">Voltar para o login</button>
        </div>
      </div>
    );
  }

  if (saindo) return <TelaCarregamento modo="saida" nome={perfil.nomeDemonstracao} />;

  if (authLoading || !isAuthenticated || !user || !entradaConcluida) {
    return <TelaCarregamento modo="entrada" nome={transicaoEntrada ? nomeAutenticado : null} />;
  }

  return (
    <AppShell papel={papel} permissoes={permissoes} usuarioId={user.openId} areaObrigatoria={areaObrigatoria} onAreaObrigatoriaChange={setAreaObrigatoria} nome={perfil.nomeDemonstracao} email={user.email} iniciais={perfil.iniciais} paginaAtiva={paginaEfetiva} onMudarPagina={mudarPaginaAutorizada} onAbrirAreaOnboarding={abrirAreaOnboarding} onLogout={sairComTransicao}>
      {!emailVerificado ? (
        <div className="mb-5 rounded-2xl border border-[#f0dcb4] bg-[#fff8e8] px-4 py-3 text-sm font-semibold text-[#805a16]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-start gap-2">
              <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
              Seu e-mail ainda não foi confirmado. A confirmação protege a recuperação de senha e a continuidade do acesso.
            </span>
            <button
              type="button"
              onClick={() => void reenviarVerificacao()}
              disabled={reivindicandoVerificacao}
              className="shrink-0 rounded-xl bg-[#805a16] px-4 py-2 text-xs font-black text-white disabled:cursor-wait disabled:opacity-60"
            >
              {reivindicandoVerificacao ? "Solicitando..." : "Reenviar confirmação"}
            </button>
          </div>
          {avisoVerificacao ? <p className="mt-3 text-xs font-bold text-[#6b4a12]">{avisoVerificacao}</p> : null}
        </div>
      ) : null}
      {erroDados ? <div role="alert" className="mb-5 rounded-2xl border border-[#f2d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">Não foi possível atualizar seu progresso agora. As demais áreas continuam disponíveis; tente novamente mais tarde.</div> : null}
      {renderizarArea()}
    </AppShell>
  );
}
