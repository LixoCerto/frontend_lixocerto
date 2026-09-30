import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  KeyRound,
  Leaf,
  MailWarning,
  Pencil,
  Save,
  Recycle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AdministracaoCrud from "@/components/AdministracaoCrud";
import MateriaisCrud from "@/components/MateriaisCrud";
import QuestionariosCrud from "@/components/QuestionariosCrud";
import DesafiosCrud from "@/components/DesafiosCrud";
import PontosColetaCrud from "@/components/PontosColetaCrud";
import PesquisaExperiencia from "@/components/PesquisaExperiencia";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  listarMateriais,
  listarSessoes,
  obterPerfilAtual,
  atualizarPerfil,
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
  dailyTip: string;
  quickActions: { id: string; label: string; description: string }[];
};
type MaterialsState = {
  id: string;
  name: string;
  category: string;
  classification: string;
  disposalInstruction: string;
  impactNote: string;
  synonyms: string[];
  preparation: string;
  cautions: string;
  acceptedPointCategories: string[];
  routes: string[];
  scope: string;
  scopeNote: string;
  sources: { title: string; url: string; supports: string }[];
  verifiedAt: string;
}[];
type SessoesAtivasState = {
  id: string;
  agente: string;
  enderecoIp: string;
  criadaEm: string;
  expiraEm: string;
  atual: boolean;
}[];

interface Indicador {
  titulo: string;
  valor: string;
  detalhe: string;
  icone: LucideIcon;
  tom: "verde" | "ouro" | "azul" | "rosa";
}

function IndicadorCard({ indicador }: { indicador: Indicador }) {
  const tons = {
    verde: "bg-[#e7f5e7] text-[#23734d]",
    ouro: "bg-[#fff3d5] text-[#a56c08]",
    azul: "bg-[#e7f1fb] text-[#2c6e9f]",
    rosa: "bg-[#fbe9ef] text-[#a34467]",
  };
  const Icone = indicador.icone;
  return (
    <article className="rounded-2xl border border-[#e2ebe3] bg-white p-4 shadow-[0_16px_32px_-28px_rgba(19,62,43,.65)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#7c9386]">{indicador.titulo}</p>
          <strong className="mt-2 block text-2xl font-black tracking-tight text-[#17362a]">{indicador.valor}</strong>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tons[indicador.tom]}`}><Icone className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#6c8879]">{indicador.detalhe}</p>
    </article>
  );
}

function CabecalhoSecao({ etiqueta, titulo, descricao, acao }: { etiqueta: string; titulo: string; descricao: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3d9664]">{etiqueta}</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#17362a] sm:text-3xl">{titulo}</h2>
        <p className="mt-2 text-sm leading-6 text-[#668073]">{descricao}</p>
      </div>
      {acao}
    </div>
  );
}

export default function Home() {
  const { user, identidade, isAuthenticated, loading: authLoading, error: authError, logout, solicitarVerificacaoEmail } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const [avisoVerificacao, setAvisoVerificacao] = useState<string | null>(null);
  const [perfilOficial, setPerfilOficial] = useState<{ nomeUsuario: string; emailUsuario: string; statusUsuario: string } | null>(null);
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState<string | null>(null);
  const [reivindicandoVerificacao, setReivindicandoVerificacao] = useState(false);
  const emailVerificado = identidade?.emailVerificadoUsuario ?? true;

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
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [materials, setMaterials] = useState<MaterialsState>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
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
  const quantidadePermissoes = permissoes.length;
  const nomeCurto = nomeAutenticado.split(/\s+/).slice(0, 2).join(" ");
  const podeLerGamificacao = pode("gamificacao:ler");
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
    if (!isAuthenticated) return;
    async function carregarDados() {
      setErroDados(false);
      try {
        const [resultadoPainel, resultadoMateriais] = await Promise.allSettled([
          podeLerGamificacao ? obterProgressoUsuario() : Promise.resolve(null),
          podeLerMateriais ? listarMateriais("", "", "publicado") : Promise.resolve(null),
        ]);
        const painel = resultadoPainel.status === "fulfilled" ? resultadoPainel.value : null;
        const materiais = resultadoMateriais.status === "fulfilled" ? resultadoMateriais.value : null;
        setDashboard(painel ? {
          ecoPoints: painel.quantidadePontos,
          currentStreak: painel.sequenciaDias,
          badgesUnlocked: painel.quantidadeConquistas,
          dailyTip: "Pequenas escolhas repetidas criam impacto ambiental mensurável.",
          quickActions: [
            { id: "guide", label: "Consultar guia", description: "Aprenda como descartar melhor." },
            { id: "quiz", label: "Responder quiz", description: "Teste seu conhecimento ambiental." },
            { id: "challenge", label: "Ver desafios", description: "Transforme intenção em hábito." },
          ],
        } : null);
        setMaterials(materiais?.materiais.map(material => ({
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
        })) ?? []);
        setErroDados(resultadoPainel.status === "rejected" || resultadoMateriais.status === "rejected");
      } catch {
        setErroDados(true);
      } finally {
        setLoading(false);
      }
    }
    void carregarDados();
  }, [isAuthenticated, podeLerGamificacao, podeLerMateriais]);

  useEffect(() => {
    if (!isAuthenticated || !podeLerMateriais) {
      setMaterials([]);
      return;
    }
    async function filtrarMateriais() {
      try {
        const resposta = await listarMateriais(query, selectedCategory === "Todos" ? "" : selectedCategory, "publicado");
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
        setErroDados(true);
      }
    }
    const temporizador = window.setTimeout(() => void filtrarMateriais(), 180);
    return () => window.clearTimeout(temporizador);
  }, [isAuthenticated, podeLerMateriais, query, selectedCategory]);

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

  const progresso = useMemo(() => Math.min(100, Math.round(((dashboard?.ecoPoints ?? 0) / 1500) * 100)), [dashboard]);
  const indicadores = useMemo<Indicador[]>(() => {
    if (!podeLerGamificacao || !dashboard) return [];
    return [
      { titulo: "Eco pontos", valor: String(dashboard?.ecoPoints ?? "—"), detalhe: "Seu impacto acumulado", icone: Award, tom: "ouro" },
      { titulo: "Dias ativos", valor: String(dashboard?.currentStreak ?? "—"), detalhe: "Sua melhor sequência", icone: Flame, tom: "rosa" },
      { titulo: "Conquistas", valor: String(dashboard?.badgesUnlocked ?? "—"), detalhe: "Selos desbloqueados", icone: Trophy, tom: "verde" },
    ];
  }, [dashboard, podeLerGamificacao]);

  function renderizarInicio() {
    return (
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[28px] bg-[#17362a] px-6 py-7 text-white shadow-[0_28px_60px_-36px_rgba(23,54,42,.8)] sm:px-8 sm:py-9">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#77be78]/25 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-[#e6c866]/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#638c74] bg-white/5 px-3 py-1.5 text-xs font-bold text-[#d4ead7]"><Sparkles className="h-3.5 w-3.5 text-[#d6efad]" /> Espaço personalizado</span>
              <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">Olá, {nomeCurto}. Seu painel acompanha o papel de <span className="text-[#d6efad]">{perfil.rotulo.toLowerCase()}.</span></h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#bfd4c4]">{perfil.descricao} A navegação é filtrada pelas permissões disponíveis; a autorização final continua sendo responsabilidade da API gRPC.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs font-bold text-[#d9e8dc]"><span>Permissões disponíveis</span><span className="text-[#d6efad]">{quantidadePermissoes} ativas</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#5eb57a] to-[#d6efad]" style={{ width: `${Math.min(100, Math.round((quantidadePermissoes / CODIGOS_PERMISSAO.length) * 100))}%` }} /></div>
              <p className="mt-3 text-xs leading-5 text-[#adc8b4]">Suas áreas de trabalho foram carregadas com base nas permissões associadas à sua sessão autenticada.</p>
            </div>
          </div>
        </section>

        {indicadores.length ? <section className="grid gap-4 md:grid-cols-3">{indicadores.map(indicador => <IndicadorCard key={indicador.titulo} indicador={indicador} />)}</section> : null}

        <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <article className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#3d9664]">Próximo movimento</p><h3 className="mt-2 text-xl font-black tracking-tight">Transforme informação em hábito.</h3></div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9f6e8] text-[#25734d]"><Target className="h-5 w-5" /></span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#698375]">{dashboard?.dailyTip ?? (podeLerGamificacao ? "Carregando recomendação personalizada..." : "Seu espaço está pronto com base nas permissões atuais da conta.")}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {(dashboard?.quickActions ?? []).filter(acao => {
                const permissao = acao.id === "quiz"
                  ? "questionarios:responder"
                  : acao.id === "guide"
                    ? "materiais:ler"
                    : "gamificacao:participar";
                return pode(permissao);
              }).map(acao => (
                <button key={acao.id} type="button" onClick={() => setPaginaAtiva(acao.id === "guide" ? "materiais" : acao.id === "quiz" ? "questionarios" : "desafios")} className="group rounded-2xl border border-[#e4ece4] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#a9d3b0] hover:bg-[#f5faf4]">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf5ea] text-[#2b7a52]">{acao.id === "quiz" ? <CircleHelp className="h-4 w-4" /> : acao.id === "guide" ? <BookOpen className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}</span>
                  <strong className="mt-3 block text-sm">{acao.label}</strong><span className="mt-1 block text-xs leading-5 text-[#718a7b]">{acao.description}</span>
                </button>
              ))}
            </div>
          </article>
          {podeLerGamificacao ? <article className="rounded-[24px] bg-[#e6f1d0] p-5 sm:p-6">
            <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#587148]">Progresso ambiental</span><Leaf className="h-5 w-5 text-[#397a4e]" /></div>
            <strong className="mt-5 block text-3xl font-black tracking-tight text-[#1d4a34]">{progresso}%</strong>
            <p className="mt-1 text-sm text-[#55715d]">Rumo ao próximo nível de impacto.</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-[#278050] transition-all duration-500" style={{ width: `${progresso}%` }} /></div>
            <div className="mt-6 flex items-center gap-3 border-t border-[#ccdfb4] pt-4 text-xs font-bold text-[#4c6652]"><Recycle className="h-4 w-4 text-[#278050]" /> Educação ambiental baseada em escolhas práticas.</div>
          </article> : null}
        </section>
      </div>
    );
  }

  function renderizarMateriais() {
    return (
      <div className="space-y-6">
        <CabecalhoSecao etiqueta="Base educativa" titulo="Guia de descarte" descricao="Pesquise materiais e encontre orientações claras para um descarte mais responsável." />
        <div className="rounded-2xl border border-[#e0eae1] bg-white p-4 sm:p-5">
          <label className="flex items-center gap-3 rounded-xl border border-[#d9e6db] bg-[#fbfdfb] px-4 py-3 focus-within:border-[#4e9b68] focus-within:ring-4 focus-within:ring-[#dcefdc]/60"><Search className="h-5 w-5 text-[#638775]" /><input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#9aae9f]" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: celular, vidro, papel..." /></label>
          <div className="mt-4 flex flex-wrap gap-2">{["Todos", ...Array.from(new Set(materials.map(material => material.category))).sort((a, b) => a.localeCompare(b, "pt-BR"))].map(categoria => <button key={categoria} type="button" onClick={() => setSelectedCategory(categoria)} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${selectedCategory === categoria ? "bg-[#1d7953] text-white" : "bg-[#edf3ed] text-[#5d796a] hover:bg-[#dff0de]"}`}>{categoria}</button>)}</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {materials.map(material => <article key={material.id} className="rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)]"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf5e8] text-[#2b7a52]"><Recycle className="h-5 w-5" /></span><span className="rounded-full bg-[#f1f5ed] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#69907a]">{material.category}</span></div><h3 className="mt-5 text-base font-black">{material.name}</h3>{material.classification ? <p className="mt-1 text-xs leading-5 text-[#71897b]">{material.classification}</p> : null}<p className="mt-2 text-sm leading-6 text-[#638071]">{material.disposalInstruction}</p>{material.preparation ? <p className="mt-3 rounded-xl bg-[#f5faf4] p-3 text-xs leading-5 text-[#55715d]"><strong>Como preparar:</strong> {material.preparation}</p> : null}{material.cautions ? <p className="mt-3 rounded-xl bg-[#fff8e7] p-3 text-xs leading-5 text-[#745f2d]"><strong>Atenção:</strong> {material.cautions}</p> : null}{material.scopeNote ? <p className="mt-3 rounded-xl bg-[#eef5ed] p-3 text-xs leading-5 text-[#55715d]"><strong>Abrangência e limites:</strong> {material.scopeNote}</p> : null}{material.acceptedPointCategories.length ? <div className="mt-3"><p className="text-[10px] font-black uppercase text-[#71897b]">Categorias de pontos relacionadas</p><div className="mt-1 flex flex-wrap gap-1.5">{material.acceptedPointCategories.map(item => <span key={item} className="rounded-full bg-[#edf3ed] px-2 py-1 text-[10px] font-bold text-[#5d796a]">{item}</span>)}</div></div> : null}{material.routes.length ? <div className="mt-3 rounded-xl bg-[#f5faf4] p-3"><p className="text-[10px] font-black uppercase text-[#55715d]">Rotas citadas nas fontes — confirmar aceitação local</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#638071]">{material.routes.map((route, index) => <li key={`${route}-${index}`}>{route}</li>)}</ul></div> : null}<p className="mt-4 border-t border-[#edf2ed] pt-3 text-xs font-semibold leading-5 text-[#7b9485]">{material.impactNote}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#668073]">{material.scope === "logistica_reversa" ? "Sistema de logística reversa" : material.scope === "orientacao_geral" ? "Orientação geral" : "Confirme a regra local e a aceitação do ponto"}{material.verifiedAt ? ` · Fonte verificada em ${new Date(`${material.verifiedAt}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</p>{material.sources.length ? <div className="mt-3 flex flex-wrap gap-2">{material.sources.map((fonte, indice) => <a key={`${fonte.url}-${indice}`} href={fonte.url} target="_blank" rel="noreferrer" title={fonte.supports} className="rounded-lg bg-[#eef5ed] px-2.5 py-1.5 text-xs font-black text-[#337a51] underline">Fonte: {fonte.title}</a>)}</div> : null}</article>)}
          {!loading && materials.length === 0 ? <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#708a7b]">{query.trim() || selectedCategory !== "Todos" ? "Nenhum material corresponde à busca ou categoria selecionada." : "O Guia ainda não tem materiais publicados. O catálogo está em revisão; confirme também as orientações do município antes do descarte."}</p> : null}
        </div>
      </div>
    );
  }

  function renderizarPontos() {
    return <PontosColetaCrud podeEscrever={pode("pontos_coleta:escrever")} podeAprovar={pode("pontos_coleta:aprovar")} />;
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
      await logout();
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
      if (atual) await logout();
      else setSessoesAtivas(sessoes => sessoes.filter(sessao => sessao.id !== idSessao));
    } catch {
      setErroSessoes("Não foi possível revogar esta sessão agora. Tente novamente.");
    }
  }

  function renderizarPerfil() {
    return (
      <div className="space-y-6">
        <CabecalhoSecao
          etiqueta="Conta e segurança"
          titulo="Perfil e sessões"
          descricao="Consulte e encerre sessões sem expor tokens ou credenciais. A alteração de senha exige um RPC próprio que ainda não faz parte do contrato."
        />
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <article className="rounded-[24px] bg-[#17362a] p-6 text-white">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#d6efad] text-lg font-black text-[#17362a]">{perfil.iniciais}</span>
            {editandoNome ? (
              <div className="mt-5 flex gap-2">
                <input value={novoNome} onChange={evento => setNovoNome(evento.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50" aria-label="Nome do perfil" />
                <button type="button" onClick={() => void salvarNomePerfil()} disabled={salvandoNome} className="rounded-xl bg-[#d6efad] px-3 py-2 text-[#17362a] disabled:opacity-60" aria-label="Salvar nome"><Save className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-2"><h3 className="text-xl font-black">{perfil.nomeDemonstracao}</h3><button type="button" onClick={() => { setNovoNome(nomeAutenticado); setEditandoNome(true); setAvisoPerfil(null); }} className="rounded-lg p-1 text-[#d6efad]" aria-label="Editar nome"><Pencil className="h-4 w-4" /></button></div>
            )}
            <p className="mt-1 text-sm text-[#bcd2c3]">{perfil.rotulo} · {perfilOficial?.statusUsuario || "status não informado"}</p>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-[#d2e5d7]">
              A API própria protege identidade e sessões. O frontend não persiste a senha nem expõe tokens na interface.
            </div>
            <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#d6efad] px-4 py-2.5 text-sm font-black text-[#17362a]"><KeyRound className="h-4 w-4" /> Sessão JWT própria ativa</p>
            {avisoPerfil ? <p role="status" className="mt-3 text-xs font-bold text-[#d6efad]">{avisoPerfil}</p> : null}
          </article>
          <article className="rounded-2xl border border-[#e1ebe2] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black">Sessões ativas</h3>
                <p className="mt-1 text-sm text-[#728a7c]">Dispositivos conectados à sua conta.</p>
              </div>
              <button type="button" onClick={() => void encerrarTodasSessoes()} disabled={revogandoSessoes} className="rounded-lg border border-[#ecc6c6] px-3 py-2 text-xs font-black text-[#ae4545] disabled:cursor-wait disabled:opacity-60">{revogandoSessoes ? "Encerrando..." : "Revogar todas"}</button>
            </div>
            {carregandoSessoes ? <p className="mt-5 text-sm font-semibold text-[#728a7c]">Consultando sessões ativas...</p> : null}
            {erroSessoes ? <p role="alert" className="mt-5 rounded-xl bg-[#fff4f0] p-3 text-sm font-semibold text-[#a85040]">{erroSessoes}</p> : null}
            {!carregandoSessoes && !erroSessoes && sessoesAtivas.length === 0 ? <p className="mt-5 rounded-xl bg-[#f5f8f5] p-4 text-sm font-semibold text-[#728a7c]">Nenhuma sessão ativa foi encontrada.</p> : null}
            {sessoesAtivas.map(sessao => (
              <div key={sessao.id} className="mt-5 flex items-center gap-3 rounded-xl bg-[#f5f8f5] p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#497b60]"><Clock3 className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{sessao.agente}</strong>
                  <span className="mt-1 block text-xs text-[#7f9688]">{sessao.enderecoIp} · iniciada em {formatarDataSessao(sessao.criadaEm)}</span>
                </span>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${sessao.atual ? "bg-[#dff0cb] text-[#2d754d]" : "bg-[#e2f3e2] text-[#2d754d]"}`}>{sessao.atual ? "Sessão atual" : `Expira ${formatarDataSessao(sessao.expiraEm)}`}</span>
                  <button type="button" onClick={() => void encerrarSessao(sessao.id, sessao.atual)} className="text-[10px] font-black text-[#ae4545]">Revogar sessão</button>
                </div>
              </div>
            ))}
          </article>
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

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f4]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#d6efad] border-t-[#1d7953]" />
          <p className="mt-4 text-sm font-bold text-[#6c8879]">Carregando seu espaço seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell papel={papel} permissoes={permissoes} nome={perfil.nomeDemonstracao} email={user.email} iniciais={perfil.iniciais} paginaAtiva={paginaEfetiva} onMudarPagina={mudarPaginaAutorizada} onLogout={logout}>
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
      {erroDados ? <div className="mb-5 rounded-2xl border border-[#f2d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">Não foi possível carregar todos os dados da API agora. O layout continua disponível, mas alguns indicadores podem estar incompletos.</div> : null}
      {renderizarArea()}
    </AppShell>
  );
}
