import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Flame,
  Leaf,
  MapPinned,
  Recycle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { lixoCertoClient } from "@/lib/connect";
import {
  obterPermissoes,
  PERFIS_ACESSO,
  temPermissao,
  type PapelAcesso,
} from "@shared/permissoes";

const categoryFilters = ["Todos", "Eletroeletrônicos", "Recicláveis", "Orgânicos"];

type DashboardState = Awaited<ReturnType<typeof lixoCertoClient.getDashboard>>;
type MaterialsState = Awaited<ReturnType<typeof lixoCertoClient.listMaterials>>["materials"];
type CollectionPointsState = Awaited<ReturnType<typeof lixoCertoClient.listCollectionPoints>>["collectionPoints"];

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
  const [papel, setPapel] = useState<PapelAcesso>("usuario");
  const [paginaAtiva, setPaginaAtiva] = useState("inicio");
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [materials, setMaterials] = useState<MaterialsState>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointsState>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [erroDados, setErroDados] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const perfil = PERFIS_ACESSO[papel];
  const pode = (permissao: Parameters<typeof temPermissao>[1]) => temPermissao([papel], permissao);
  const quantidadePermissoes = obterPermissoes([papel]).length;
  const nomeCurto = perfil.nomeDemonstracao.startsWith("Dr.")
    ? perfil.nomeDemonstracao.split(" ").slice(0, 2).join(" ")
    : perfil.nomeDemonstracao.split(" ")[0];

  useEffect(() => {
    async function carregarDados() {
      try {
        const [painel, materiais, pontos] = await Promise.all([
          lixoCertoClient.getDashboard({ userId: "demonstracao" }),
          lixoCertoClient.listMaterials({ category: "", query: "" }),
          lixoCertoClient.listCollectionPoints({ city: "João Pessoa", materialCategory: "" }),
        ]);
        setDashboard(painel);
        setMaterials(materiais.materials);
        setCollectionPoints(pontos.collectionPoints);
      } catch {
        setErroDados(true);
      } finally {
        setLoading(false);
      }
    }
    void carregarDados();
  }, []);

  useEffect(() => {
    async function filtrarMateriais() {
      try {
        const resposta = await lixoCertoClient.listMaterials({
          category: selectedCategory === "Todos" ? "" : selectedCategory,
          query,
        });
        setMaterials(resposta.materials);
      } catch {
        setErroDados(true);
      }
    }
    const temporizador = window.setTimeout(() => void filtrarMateriais(), 180);
    return () => window.clearTimeout(temporizador);
  }, [query, selectedCategory]);

  const progresso = useMemo(() => Math.min(100, Math.round(((dashboard?.ecoPoints ?? 0) / 1500) * 100)), [dashboard]);
  const indicadores = useMemo<Indicador[]>(() => {
    if (papel === "pesquisador") {
      return [
        { titulo: "Escore SUS médio", valor: "82,5", detalhe: "+4,2 pontos no período", icone: BarChart3, tom: "azul" },
        { titulo: "Respostas válidas", valor: "48", detalhe: "100% com consentimento", icone: FileCheck2, tom: "verde" },
        { titulo: "Desafios concluídos", valor: "126", detalhe: "Base agregada da plataforma", icone: Trophy, tom: "ouro" },
      ];
    }
    if (papel === "revisor") {
      return [
        { titulo: "Fila de revisão", valor: "12", detalhe: "Itens aguardando análise", icone: ClipboardCheck, tom: "ouro" },
        { titulo: "Pontos verificados", valor: "34", detalhe: "8 aprovados nesta semana", icone: MapPinned, tom: "verde" },
        { titulo: "Questões ativas", valor: "26", detalhe: "Banco de aprendizagem", icone: CircleHelp, tom: "azul" },
      ];
    }
    if (papel === "administrador") {
      return [
        { titulo: "Usuários ativos", valor: "1.248", detalhe: "+8,4% no mês", icone: Users, tom: "verde" },
        { titulo: "Eventos auditados", valor: "2.846", detalhe: "Sem alerta crítico aberto", icone: ShieldCheck, tom: "azul" },
        { titulo: "Pontos pendentes", valor: "12", detalhe: "Aguardando revisão", icone: MapPinned, tom: "ouro" },
      ];
    }
    return [
      { titulo: "Eco pontos", valor: String(dashboard?.ecoPoints ?? "—"), detalhe: "Seu impacto acumulado", icone: Award, tom: "ouro" },
      { titulo: "Dias ativos", valor: String(dashboard?.currentStreak ?? "—"), detalhe: "Sua melhor sequência", icone: Flame, tom: "rosa" },
      { titulo: "Conquistas", valor: String(dashboard?.badgesUnlocked ?? "—"), detalhe: "Selos desbloqueados", icone: Trophy, tom: "verde" },
    ];
  }, [dashboard, papel]);

  async function responderQuiz(answerId: string) {
    setQuizAnswer(answerId);
    try {
      const resposta = await lixoCertoClient.submitQuiz({
        userId: "demonstracao",
        questionId: "destino-eletronicos",
        answerId,
      });
      setQuizFeedback(resposta.explanation);
      setQuizScore(resposta.pointsAwarded);
      if (resposta.correct && dashboard) setDashboard({ ...dashboard, ecoPoints: resposta.totalPoints });
    } catch {
      setQuizFeedback("Não foi possível registrar a resposta agora. Tente novamente em instantes.");
      setQuizScore(null);
    }
  }

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
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#5eb57a] to-[#d6efad]" style={{ width: `${papel === "administrador" ? 100 : papel === "revisor" ? 64 : papel === "pesquisador" ? 52 : 45}%` }} /></div>
              <p className="mt-3 text-xs leading-5 text-[#adc8b4]">Layout demonstrativo: escolha outro perfil no menu para visualizar as áreas acessíveis a cada nível.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">{indicadores.map(indicador => <IndicadorCard key={indicador.titulo} indicador={indicador} />)}</section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <article className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#3d9664]">Próximo movimento</p><h3 className="mt-2 text-xl font-black tracking-tight">Transforme informação em hábito.</h3></div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9f6e8] text-[#25734d]"><Target className="h-5 w-5" /></span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#698375]">{dashboard?.dailyTip ?? "Carregando recomendação personalizada..."}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {(dashboard?.quickActions ?? []).filter(acao => {
                const permissao = acao.id === "quiz"
                  ? "questionarios:responder"
                  : acao.id === "guide"
                    ? "materiais:ler"
                    : "gamificacao:ler";
                return pode(permissao);
              }).map(acao => (
                <button key={acao.id} type="button" onClick={() => setPaginaAtiva(acao.id === "guide" ? "materiais" : acao.id === "quiz" ? "questionarios" : "desafios")} className="group rounded-2xl border border-[#e4ece4] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#a9d3b0] hover:bg-[#f5faf4]">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf5ea] text-[#2b7a52]">{acao.id === "quiz" ? <CircleHelp className="h-4 w-4" /> : acao.id === "guide" ? <BookOpen className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}</span>
                  <strong className="mt-3 block text-sm">{acao.label}</strong><span className="mt-1 block text-xs leading-5 text-[#718a7b]">{acao.description}</span>
                </button>
              ))}
            </div>
          </article>
          <article className="rounded-[24px] bg-[#e6f1d0] p-5 sm:p-6">
            <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#587148]">Progresso ambiental</span><Leaf className="h-5 w-5 text-[#397a4e]" /></div>
            <strong className="mt-5 block text-3xl font-black tracking-tight text-[#1d4a34]">{progresso}%</strong>
            <p className="mt-1 text-sm text-[#55715d]">Rumo ao próximo nível de impacto.</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-[#278050] transition-all duration-500" style={{ width: `${progresso}%` }} /></div>
            <div className="mt-6 flex items-center gap-3 border-t border-[#ccdfb4] pt-4 text-xs font-bold text-[#4c6652]"><Recycle className="h-4 w-4 text-[#278050]" /> Educação ambiental baseada em escolhas práticas.</div>
          </article>
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
          <div className="mt-4 flex flex-wrap gap-2">{categoryFilters.map(categoria => <button key={categoria} type="button" onClick={() => setSelectedCategory(categoria)} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${selectedCategory === categoria ? "bg-[#1d7953] text-white" : "bg-[#edf3ed] text-[#5d796a] hover:bg-[#dff0de]"}`}>{categoria}</button>)}</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {materials.map(material => <article key={material.id} className="rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)]"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf5e8] text-[#2b7a52]"><Recycle className="h-5 w-5" /></span><span className="rounded-full bg-[#f1f5ed] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#69907a]">{material.category}</span></div><h3 className="mt-5 text-base font-black">{material.name}</h3><p className="mt-2 text-sm leading-6 text-[#638071]">{material.disposalInstruction}</p><p className="mt-4 border-t border-[#edf2ed] pt-3 text-xs font-semibold leading-5 text-[#7b9485]">{material.impactNote}</p></article>)}
          {!loading && materials.length === 0 ? <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#708a7b]">Nenhum material encontrado com esse filtro.</p> : null}
        </div>
      </div>
    );
  }

  function renderizarPontos() {
    return (
      <div className="space-y-6">
        <CabecalhoSecao etiqueta="Território" titulo="Pontos de coleta" descricao="A consulta prioriza locais verificados e informa claramente o estado de validação." acao={pode("pontos_coleta:aprovar") ? <button type="button" className="rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white">Revisar pendências</button> : undefined} />
        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-3">{collectionPoints.map(ponto => <article key={ponto.id} className="flex flex-col gap-4 rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)] sm:flex-row sm:items-start"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e9f5e7] text-[#2a7951]"><MapPinned className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{ponto.name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${ponto.isVerified ? "bg-[#e5f5e6] text-[#28744d]" : "bg-[#fff2d9] text-[#9b6812]"}`}>{ponto.isVerified ? "Verificado" : "Em validação"}</span></div><p className="mt-2 text-sm text-[#698273]">{ponto.address} · {ponto.city}</p><div className="mt-3 flex flex-wrap gap-2">{ponto.acceptedCategories.map(categoria => <span key={categoria} className="rounded-lg bg-[#f0f5f0] px-2 py-1 text-xs font-bold text-[#5b7969]">{categoria}</span>)}</div></div><ChevronRight className="hidden h-5 w-5 text-[#8ba496] sm:block" /></article>)}</div>
          <aside className="rounded-[24px] bg-[#17362a] p-6 text-white"><MapPinned className="h-6 w-6 text-[#d6efad]" /><h3 className="mt-5 text-xl font-black">Dados de localização com responsabilidade.</h3><p className="mt-3 text-sm leading-6 text-[#bdd2c3]">Pontos pendentes permanecem identificados como não verificados. A aprovação é uma operação disponível apenas a revisores e administradores.</p><div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-bold text-[#d4ead7]">Autorização efetiva: sempre confirmada pela API.</div></aside>
        </div>
      </div>
    );
  }

  function renderizarQuestionarios() {
    const administrando = pode("questionarios:administrar");
    if (administrando) return <PainelRevisaoQuestionarios />;
    return (
      <div className="space-y-6">
        <CabecalhoSecao etiqueta="Aprendizagem gamificada" titulo="Quiz ambiental" descricao="Responda, receba feedback imediato e acompanhe a evolução da sua pontuação." />
        <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <aside className="rounded-[24px] bg-[#e6f1d0] p-6"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#2d7a50]"><Trophy className="h-5 w-5" /></span><h3 className="mt-5 text-2xl font-black tracking-tight text-[#1d4934]">Aprenda. Acerte. Evolua.</h3><p className="mt-3 text-sm leading-6 text-[#55715d]">Cada resposta correta reforça boas práticas e atualiza os indicadores de gamificação pelo backend.</p><div className="mt-7 rounded-xl border border-[#cddfb6] bg-white/70 p-4"><p className="text-xs font-black text-[#4a694f]">Recompensa desta questão</p><strong className="mt-1 block text-2xl font-black text-[#277c4f]">+50 pontos</strong></div></aside>
          <article className="rounded-[24px] border border-[#e1ebe2] bg-white p-6 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)]"><div className="flex items-center justify-between"><span className="rounded-full bg-[#edf5e9] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#3e8257]">Questão 01</span><span className="text-xs font-bold text-[#809789]">Eletroeletrônicos</span></div><h3 className="mt-6 text-xl font-black leading-7">Qual é o destino correto para celulares, pilhas e outros eletroeletrônicos?</h3><div className="mt-6 grid gap-3">{[{ id: "reciclagem-eletronicos", label: "Ponto de coleta especializado" }, { id: "lixo-comum", label: "Lixo comum" }, { id: "organicos", label: "Resíduos orgânicos" }].map((resposta, indice) => <button key={resposta.id} disabled={Boolean(quizFeedback)} type="button" onClick={() => void responderQuiz(resposta.id)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${quizAnswer === resposta.id ? "border-[#52a36b] bg-[#eaf5e7] text-[#1d6f48]" : "border-[#dfe9e0] hover:border-[#9ac4a5] hover:bg-[#f7fbf6]"}`}><span>{resposta.label}</span><span className="grid h-7 w-7 place-items-center rounded-full border border-current text-xs">{String.fromCharCode(65 + indice)}</span></button>)}</div>{quizFeedback ? <div className={`mt-5 rounded-2xl p-4 ${quizScore ? "bg-[#e6f5e7] text-[#1e7048]" : "bg-[#fff2d9] text-[#865913]"}`}><strong className="text-sm">{quizScore ? `+${quizScore} eco pontos` : "Continue aprendendo"}</strong><p className="mt-1 text-sm leading-5">{quizFeedback}</p></div> : <p className="mt-5 text-xs font-semibold text-[#84998c]">Escolha uma alternativa para receber o feedback.</p>}</article>
        </div>
      </div>
    );
  }

  function renderizarDesafios() {
    return <div className="space-y-6"><CabecalhoSecao etiqueta="Ação prática" titulo="Desafios sustentáveis" descricao="Converta boas escolhas em progresso, pontos e conquistas sem misturar gamificação com permissões administrativas." /><div className="grid gap-4 lg:grid-cols-3"><CartaoDesafio titulo="Separar antes de descartar" progresso={80} meta="4 de 5 ações registradas" pontos="+120 pontos" icone={Recycle} /><CartaoDesafio titulo="Semana sem descartáveis" progresso={45} meta="3 de 7 dias concluídos" pontos="+180 pontos" icone={Leaf} /><CartaoDesafio titulo="Aprender e compartilhar" progresso={100} meta="Concluído hoje" pontos="+50 pontos" icone={Users} /></div><div className="rounded-2xl border border-[#e1ebe2] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-black">Ranking com privacidade</h3><p className="mt-1 text-sm text-[#6b8576]">A posição é exibida por pseudônimo; nomes reais não são compartilhados.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#e8f5e7] px-4 py-2.5 text-sm font-black text-[#28764e]">Ver minha posição <ArrowUpRight className="h-4 w-4" /></button></div></div></div>;
  }

  function renderizarPesquisa() {
    return <div className="space-y-6"><CabecalhoSecao etiqueta="Dados agregados" titulo="Pesquisa e experiência de uso" descricao="Indicadores acadêmicos são apresentados de forma agregada, com consentimento e sem expor respostas individuais." /><section className="grid gap-4 md:grid-cols-3"><IndicadorCard indicador={{ titulo: "Escore SUS", valor: "82,5", detalhe: "Meta ≥ 75", icone: BarChart3, tom: "azul" }} /><IndicadorCard indicador={{ titulo: "Participantes", valor: "48", detalhe: "Respostas válidas", icone: Users, tom: "verde" }} /><IndicadorCard indicador={{ titulo: "Consentimento", valor: "100%", detalhe: "Registro obrigatório", icone: CheckCircle2, tom: "ouro" }} /></section><section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><article className="rounded-2xl border border-[#e1ebe2] bg-white p-6"><h3 className="font-black">Distribuição de percepção</h3><div className="mt-7 flex h-44 items-end gap-3">{[52, 68, 76, 84, 73, 92, 80].map((valor, indice) => <div key={indice} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-xl bg-gradient-to-t from-[#287b52] to-[#bfe39f]" style={{ height: `${valor}%` }} /><span className="text-[10px] font-bold text-[#789082]">S{indice + 1}</span></div>)}</div><p className="mt-5 text-xs leading-5 text-[#738c7d]">Visualização demonstrativa dos indicadores que serão retornados de forma agregada pela API de avaliação SUS.</p></article><aside className="rounded-[24px] bg-[#17362a] p-6 text-white"><ShieldCheck className="h-6 w-6 text-[#d6efad]" /><h3 className="mt-5 text-xl font-black">Privacidade por padrão</h3><p className="mt-3 text-sm leading-6 text-[#bdd2c3]">Resultados só podem ser consultados por perfis autorizados. A plataforma utiliza consentimento obrigatório e pseudonimização.</p></aside></section></div>;
  }

  function renderizarRevisao() {
    return <div className="space-y-6"><CabecalhoSecao etiqueta="Moderação" titulo="Central de revisão" descricao="Aprove conteúdo e pontos de coleta com rastreabilidade e separação de funções." acao={<button type="button" className="rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white">Novo material</button>} /><div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><article className="overflow-hidden rounded-2xl border border-[#e1ebe2] bg-white"><div className="border-b border-[#edf2ed] px-5 py-4"><h3 className="font-black">Fila de pendências</h3></div>{["Ponto de coleta — Bairro dos Estados", "Material educativo — óleo de cozinha", "Questão do quiz — descarte de lâmpadas"].map((item, indice) => <div key={item} className="flex items-center gap-4 border-b border-[#edf2ed] px-5 py-4 last:border-b-0"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff2d9] text-[#a0680a]"><ClipboardCheck className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item}</strong><span className="mt-1 block text-xs text-[#769080]">Enviado há {indice + 1} dia(s)</span></span><button type="button" className="rounded-lg bg-[#eef5ed] px-3 py-2 text-xs font-black text-[#337a51]">Analisar</button></div>)}</article><aside className="rounded-[24px] bg-[#fff1d1] p-6"><ClipboardCheck className="h-6 w-6 text-[#a66a09]" /><h3 className="mt-4 text-xl font-black text-[#5d4618]">Revisão responsável</h3><p className="mt-3 text-sm leading-6 text-[#78632d]">Cada aprovação deve ser persistida com identidade, data e auditoria. O frontend guia o fluxo; a API confirma a permissão.</p><div className="mt-6 rounded-xl bg-white/65 p-3 text-xs font-black text-[#725c28]">12 itens aguardam revisão</div></aside></div></div>;
  }

  function renderizarAdministracao() {
    return <div className="space-y-6"><CabecalhoSecao etiqueta="Governança" titulo="Administração da plataforma" descricao="Visão operacional para usuários, permissões, conteúdos e eventos auditáveis." /><section className="grid gap-4 md:grid-cols-3"><IndicadorCard indicador={{ titulo: "Usuários ativos", valor: "1.248", detalhe: "+8,4% no mês", icone: Users, tom: "verde" }} /><IndicadorCard indicador={{ titulo: "Papéis ativos", valor: "4", detalhe: "Acesso por permissão", icone: ShieldCheck, tom: "azul" }} /><IndicadorCard indicador={{ titulo: "Auditorias", valor: "2.846", detalhe: "Eventos registrados", icone: FileCheck2, tom: "ouro" }} /></section><section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-[#e1ebe2] bg-white p-6"><h3 className="font-black">Governança de acesso</h3><p className="mt-2 text-sm leading-6 text-[#678172]">Papéis não substituem permissões. O administrador acompanha a matriz, mas cada operação sensível ainda é autorizada no backend.</p><div className="mt-5 space-y-3">{["Usuário — aprendizagem e impacto", "Pesquisador — indicadores agregados", "Revisor — moderação de conteúdo", "Administrador — operação e auditoria"].map((item, indice) => <div key={item} className="flex items-center justify-between rounded-xl bg-[#f4f8f3] px-4 py-3 text-sm"><span className="font-bold text-[#315c47]">{item}</span><span className="text-xs font-black text-[#5b9770]">{indice === 3 ? "11 permissões" : "Escopo definido"}</span></div>)}</div></article><article className="rounded-2xl bg-[#17362a] p-6 text-white"><ShieldCheck className="h-7 w-7 text-[#d6efad]" /><h3 className="mt-4 text-xl font-black">Auditoria sem segredos</h3><p className="mt-3 text-sm leading-6 text-[#bfd3c4]">Tokens, senhas, autorizações e segredos são redigidos antes do registro. A interface nunca recebe esses valores.</p><button type="button" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#d6efad] px-4 py-2.5 text-sm font-black text-[#18372a]">Consultar eventos <ArrowUpRight className="h-4 w-4" /></button></article></section></div>;
  }

  function renderizarPerfil() {
    return <div className="space-y-6"><CabecalhoSecao etiqueta="Conta e segurança" titulo="Perfil e sessões" descricao="Gerencie seus dados de exibição e acompanhe sessões ativas. Tokens nunca são exibidos nesta interface." /><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><article className="rounded-[24px] bg-[#17362a] p-6 text-white"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#d6efad] text-lg font-black text-[#17362a]">{perfil.iniciais}</span><h3 className="mt-5 text-xl font-black">{perfil.nomeDemonstracao}</h3><p className="mt-1 text-sm text-[#bcd2c3]">{perfil.rotulo} · conta demonstrativa</p><div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-[#d2e5d7]">A API permite atualização restrita do nome; e-mail, papéis e permissões seguem o fluxo administrativo seguro.</div></article><article className="rounded-2xl border border-[#e1ebe2] bg-white p-6"><div className="flex items-center justify-between"><div><h3 className="font-black">Sessões ativas</h3><p className="mt-1 text-sm text-[#728a7c]">Dispositivos conectados à sua conta.</p></div><button type="button" className="rounded-lg border border-[#ecc6c6] px-3 py-2 text-xs font-black text-[#ae4545]">Revogar todas</button></div>{["Navegador atual · João Pessoa, PB", "Navegador anterior · João Pessoa, PB"].map((sessao, indice) => <div key={sessao} className="mt-5 flex items-center gap-3 rounded-xl bg-[#f5f8f5] p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#497b60]"><Clock3 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{sessao}</strong><span className="mt-1 block text-xs text-[#7f9688]">{indice === 0 ? "Ativa agora" : "Há 2 dias"}</span></span>{indice === 0 ? <span className="rounded-full bg-[#e2f3e2] px-2 py-1 text-[10px] font-black text-[#2d754d]">Atual</span> : <button type="button" className="text-xs font-black text-[#b64b4b]">Revogar</button>}</div>)}</article></div></div>;
  }

  function renderizarArea() {
    if (paginaAtiva === "materiais") return renderizarMateriais();
    if (paginaAtiva === "pontos") return renderizarPontos();
    if (paginaAtiva === "questionarios") return renderizarQuestionarios();
    if (paginaAtiva === "desafios") return renderizarDesafios();
    if (paginaAtiva === "pesquisa") return renderizarPesquisa();
    if (paginaAtiva === "revisao") return renderizarRevisao();
    if (paginaAtiva === "administracao") return renderizarAdministracao();
    if (paginaAtiva === "perfil") return renderizarPerfil();
    return renderizarInicio();
  }

  return (
    <AppShell papel={papel} paginaAtiva={paginaAtiva} onMudarPapel={setPapel} onMudarPagina={setPaginaAtiva}>
      {erroDados ? <div className="mb-5 rounded-2xl border border-[#f2d0c8] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">Não foi possível carregar todos os dados da API agora. O layout continua disponível, mas alguns indicadores podem estar incompletos.</div> : null}
      {renderizarArea()}
    </AppShell>
  );
}

function CartaoDesafio({ titulo, progresso, meta, pontos, icone: Icone }: { titulo: string; progresso: number; meta: string; pontos: string; icone: LucideIcon }) {
  return <article className="rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)]"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf5e8] text-[#27784f]"><Icone className="h-5 w-5" /></span><span className="rounded-full bg-[#fff3d7] px-2.5 py-1 text-[10px] font-black text-[#a66a09]">{pontos}</span></div><h3 className="mt-5 font-black">{titulo}</h3><p className="mt-1 text-sm text-[#728a7b]">{meta}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#edf3ed]"><div className="h-full rounded-full bg-[#338057]" style={{ width: `${progresso}%` }} /></div><p className="mt-2 text-right text-xs font-black text-[#387e55]">{progresso}%</p></article>;
}

function PainelRevisaoQuestionarios() {
  return <div className="space-y-6"><CabecalhoSecao etiqueta="Banco de aprendizagem" titulo="Gestão de questionários" descricao="O revisor organiza questões e alternativas. A resposta correta não é exposta em consultas públicas." acao={<button type="button" className="rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white">Nova questão</button>} /><div className="overflow-hidden rounded-2xl border border-[#e1ebe2] bg-white"><div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[#edf2ed] bg-[#f6f9f5] px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#778f81]"><span>Questão</span><span>Status</span><span>Ação</span></div>{["Descarte correto de lâmpadas", "Separação de resíduos orgânicos", "Coleta de eletrônicos"].map((questao, indice) => <div key={questao} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[#edf2ed] px-5 py-4 last:border-0"><span><strong className="block text-sm">{questao}</strong><span className="mt-1 block text-xs text-[#799082]">Atualizada há {indice + 1} dia(s)</span></span><span className="rounded-full bg-[#e4f4e5] px-2.5 py-1 text-[10px] font-black text-[#27764d]">Publicada</span><button type="button" className="text-xs font-black text-[#347c53]">Editar</button></div>)}</div></div>;
}
