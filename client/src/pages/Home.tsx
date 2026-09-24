import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BatteryCharging,
  BookOpen,
  CircleHelp,
  Clock3,
  FileText,
  GlassWater,
  Leaf,
  MapPinned,
  Recycle,
  Search,
  Smartphone,
  Sparkles,
  Trophy,
} from "lucide-react";
import { lixoCertoClient } from "@/lib/connect";

const categoryFilters = ["Todos", "Eletroeletrônicos", "Recicláveis", "Orgânicos"];

const iconByName = {
  "circle-help": CircleHelp,
  "file-text": FileText,
  "glass-water": GlassWater,
  leaf: Leaf,
  "map-pinned": MapPinned,
  smartphone: Smartphone,
  trophy: Trophy,
} as const;

type DashboardState = Awaited<ReturnType<typeof lixoCertoClient.getDashboard>>;
type MaterialsState = Awaited<ReturnType<typeof lixoCertoClient.listMaterials>>["materials"];

function ActionIcon({ name, className }: { name: keyof typeof iconByName; className?: string }) {
  const Icon = iconByName[name] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [materials, setMaterials] = useState<MaterialsState>([]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboardResponse, materialsResponse] = await Promise.all([
          lixoCertoClient.getDashboard({ userId: "demo-user" }),
          lixoCertoClient.listMaterials({ category: "", query: "" }),
        ]);
        setDashboard(dashboardResponse);
        setMaterials(materialsResponse.materials);
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  useEffect(() => {
    async function filterMaterials() {
      const response = await lixoCertoClient.listMaterials({
        category: selectedCategory === "Todos" ? "" : selectedCategory,
        query,
      });
      setMaterials(response.materials);
    }
    const timer = window.setTimeout(() => void filterMaterials(), 150);
    return () => window.clearTimeout(timer);
  }, [query, selectedCategory]);

  const progress = useMemo(() => Math.min(100, Math.round(((dashboard?.ecoPoints ?? 0) / 1500) * 100)), [dashboard]);

  async function answerQuiz(answerId: string) {
    setQuizAnswer(answerId);
    const response = await lixoCertoClient.submitQuiz({
      userId: "demo-user",
      questionId: "destino-eletronicos",
      answerId,
    });
    setQuizFeedback(response.explanation);
    setQuizScore(response.pointsAwarded);
    if (response.correct && dashboard) {
      setDashboard({ ...dashboard, ecoPoints: response.totalPoints });
    }
  }

  function goTo(target: string) {
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f8f2] text-[#183328]">
      <header className="sticky top-0 z-30 border-b border-[#dfe7db]/90 bg-[#f6f8f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button className="flex items-center gap-3 text-left" onClick={() => goTo("inicio")}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#1d6a4b] text-white shadow-[0_10px_24px_-12px_rgba(29,106,75,0.9)]">
              <Recycle className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-black tracking-tight">Lixo Certo</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6a8775]">Educação em ação</span>
            </span>
          </button>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#466653] md:flex">
            <button onClick={() => goTo("guia")} className="transition hover:text-[#1d6a4b]">Guia de descarte</button>
            <button onClick={() => goTo("quiz")} className="transition hover:text-[#1d6a4b]">Quiz</button>
            <button onClick={() => goTo("impacto")} className="transition hover:text-[#1d6a4b]">Meu impacto</button>
          </nav>
          <button onClick={() => goTo("quiz")} className="rounded-full bg-[#183328] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1d6a4b]">
            Jogar agora
          </button>
        </div>
      </header>

      <main id="inicio">
        <section className="relative mx-auto grid max-w-7xl gap-9 overflow-hidden px-5 pb-14 pt-10 lg:grid-cols-[1.12fr_.88fr] lg:px-8 lg:pb-20 lg:pt-16">
          <div className="pointer-events-none absolute -right-28 top-0 h-80 w-80 rounded-full bg-[#dceca9]/70 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-[#b9dfc6]/55 blur-3xl" />
          <div className="relative z-10 flex flex-col justify-center">
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#cfe2c3] bg-[#ecf4dc] px-3 py-1.5 text-xs font-bold text-[#3d704d]">
              <Sparkles className="h-3.5 w-3.5" />
              Seu descarte começa com informação
            </span>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-[-0.045em] text-[#183328] sm:text-5xl lg:text-6xl">
              Pequenas escolhas. <span className="text-[#3a9b61]">Impacto gigante.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#527060] sm:text-lg">
              Descubra como descartar corretamente, aprenda com desafios e acompanhe a evolução das suas atitudes sustentáveis em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => goTo("guia")} className="inline-flex items-center gap-2 rounded-full bg-[#1d6a4b] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_-16px_rgba(29,106,75,1)] transition hover:-translate-y-0.5 hover:bg-[#15573d]">
                Consultar guia <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => goTo("quiz")} className="rounded-full border border-[#bcd3c0] bg-white px-5 py-3 text-sm font-bold text-[#1d6a4b] transition hover:-translate-y-0.5 hover:border-[#1d6a4b]">
                Fazer o quiz
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[#54705e]">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#58b274]" /> Informação confiável</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f1bd4a]" /> Aprendizado gamificado</span>
            </div>
          </div>

          <aside id="impacto" className="relative z-10 overflow-hidden rounded-[2rem] bg-[#183328] p-6 text-white shadow-[0_28px_60px_-24px_rgba(24,51,40,0.65)] sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#4ca96b]/25 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#c2ddc9]">Seu painel de impacto</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">{loading ? "Carregando..." : "Olá, eco-educador!"}</h2>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f2c75c] text-[#183328]"><Leaf className="h-5 w-5" /></span>
            </div>

            <div className="relative mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm"><Award className="h-4 w-4 text-[#f2c75c]" /><strong className="mt-2 block text-xl">{dashboard?.ecoPoints ?? "—"}</strong><span className="text-[11px] text-[#c2ddc9]">eco pontos</span></div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm"><Clock3 className="h-4 w-4 text-[#b9dfc6]" /><strong className="mt-2 block text-xl">{dashboard?.currentStreak ?? "—"}</strong><span className="text-[11px] text-[#c2ddc9]">dias ativos</span></div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm"><Trophy className="h-4 w-4 text-[#f2c75c]" /><strong className="mt-2 block text-xl">{dashboard?.badgesUnlocked ?? "—"}</strong><span className="text-[11px] text-[#c2ddc9]">badges</span></div>
            </div>

            <div className="relative mt-8 rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-center justify-between text-xs font-bold"><span className="text-[#d6e6d9]">Rumo ao próximo nível</span><span className="text-[#f2c75c]">{progress}%</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#57b475] to-[#dceca9] transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-3 text-xs leading-5 text-[#b9cfbe]">{dashboard?.dailyTip ?? "Carregando dica sustentável..."}</p>
            </div>
          </aside>
        </section>

        <section className="border-y border-[#dfe7db] bg-white/75">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:grid-cols-3 lg:px-8">
            {dashboard?.quickActions.map(action => (
              <button key={action.id} onClick={() => goTo(action.id === "quiz" ? "quiz" : "guia")} className="group flex items-center gap-4 rounded-2xl p-3 text-left transition hover:bg-[#f2f7ed]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef5e7] text-[#277a52] transition group-hover:bg-[#dceca9]"><ActionIcon name={action.icon as keyof typeof iconByName} className="h-5 w-5" /></span>
                <span><strong className="block text-sm">{action.label}</strong><span className="mt-0.5 block text-xs text-[#6a8775]">{action.description}</span></span>
                <ArrowRight className="ml-auto h-4 w-4 text-[#93aa99] transition group-hover:translate-x-1 group-hover:text-[#277a52]" />
              </button>
            ))}
          </div>
        </section>

        <section id="guia" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.17em] text-[#3a9b61]">Guia de descarte</span>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[#183328] sm:text-4xl">Saber o destino certo faz toda diferença.</h2>
              <p className="mt-5 max-w-md leading-7 text-[#5b7665]">Pesquise um material ou navegue por categoria. Cada recomendação vem da API tipada do projeto, preparada para crescer com novas informações e pontos de coleta.</p>
              <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[#d5e1d4] bg-[#f4f8f2] p-4 text-sm text-[#517060]"><MapPinned className="h-5 w-5 shrink-0 text-[#3a9b61]" /> No protótipo, pontos de coleta serão adicionados na próxima etapa do MVP.</div>
            </div>
            <div>
              <label className="flex items-center gap-3 rounded-2xl border border-[#d8e3d5] bg-white px-4 py-3 shadow-sm focus-within:border-[#3a9b61] focus-within:ring-4 focus-within:ring-[#dceca9]/50">
                <Search className="h-5 w-5 text-[#6d8a77]" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: celular, vidro, papel..." className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#9bae9e]" />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {categoryFilters.map(category => <button key={category} onClick={() => setSelectedCategory(category)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${selectedCategory === category ? "bg-[#1d6a4b] text-white" : "bg-[#e9f0e7] text-[#54705e] hover:bg-[#dceca9]"}`}>{category}</button>)}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {materials.map(material => <article key={material.id} className="rounded-2xl border border-[#e0e9dd] bg-white p-4 shadow-[0_10px_25px_-22px_rgba(26,71,44,.7)]">
                  <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eff6e9] text-[#277a52]"><ActionIcon name={material.icon as keyof typeof iconByName} className="h-5 w-5" /></span><div><p className="text-[11px] font-black uppercase tracking-wider text-[#6e987b]">{material.category}</p><h3 className="mt-0.5 text-sm font-black text-[#244735]">{material.name}</h3></div></div>
                  <p className="mt-4 text-xs leading-5 text-[#58715f]">{material.disposalInstruction}</p>
                  <p className="mt-3 border-t border-[#edf2ea] pt-3 text-[11px] font-semibold leading-4 text-[#7a9481]">{material.impactNote}</p>
                </article>)}
                {!materials.length && <p className="col-span-full rounded-2xl bg-[#f4f8f2] p-6 text-center text-sm text-[#67806e]">Nenhum material encontrado com esse filtro.</p>}
              </div>
            </div>
          </div>
        </section>

        <section id="quiz" className="bg-[#183328] px-5 py-16 text-white lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.9fr_1.1fr]">
            <div className="flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#284d3a] px-3 py-1.5 text-xs font-bold text-[#cde7d2]"><Trophy className="h-3.5 w-3.5 text-[#f2c75c]" /> Desafio de hoje</span>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Aprenda. Acerte. Evolua.</h2>
              <p className="mt-5 max-w-md leading-7 text-[#c2d5c7]">A gamificação transforma informação em prática. Responda, receba explicação e acompanhe sua pontuação em tempo real.</p>
              <div className="mt-8 flex items-center gap-3 text-sm text-[#c5dbc9]"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2f6347]"><BatteryCharging className="h-5 w-5 text-[#dceca9]" /></span> Perguntas curtas, aprendizado aplicável e feedback imediato.</div>
            </div>
            <article className="rounded-[2rem] bg-[#f9fbf6] p-6 text-[#183328] shadow-[0_28px_60px_-24px_rgba(0,0,0,.7)] sm:p-8">
              <div className="flex items-center justify-between"><span className="rounded-full bg-[#ecf4dc] px-3 py-1 text-xs font-black text-[#4b794f]">QUIZ AMBIENTAL</span><span className="text-xs font-bold text-[#77907e]">01 / 05</span></div>
              <h3 className="mt-6 text-xl font-black leading-7 sm:text-2xl">Qual é o destino correto para celulares, pilhas e outros eletroeletrônicos?</h3>
              <div className="mt-6 grid gap-3">
                {[{ id: "reciclagem-eletronicos", label: "Ponto de coleta especializado" }, { id: "lixo-comum", label: "Lixo comum" }, { id: "organicos", label: "Resíduos orgânicos" }].map(answer => <button key={answer.id} disabled={Boolean(quizFeedback)} onClick={() => void answerQuiz(answer.id)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-bold transition disabled:cursor-default ${quizAnswer === answer.id ? "border-[#3a9b61] bg-[#eaf5e7] text-[#1d6a4b]" : "border-[#dfe8dc] bg-white hover:border-[#8bbe9a] hover:bg-[#f7fbf4]"}`}><span>{answer.label}</span><span className="grid h-6 w-6 place-items-center rounded-full border border-current text-xs">{answer.id === "reciclagem-eletronicos" ? "A" : answer.id === "lixo-comum" ? "B" : "C"}</span></button>)}
              </div>
              {quizFeedback ? <div className={`mt-5 rounded-2xl p-4 ${quizScore ? "bg-[#eaf5e7] text-[#1d6a4b]" : "bg-[#fff4dc] text-[#7c5a12]"}`}><p className="text-sm font-black">{quizScore ? `+${quizScore} eco pontos` : "Continue aprendendo"}</p><p className="mt-1 text-sm leading-5">{quizFeedback}</p></div> : <p className="mt-5 text-xs text-[#7a9180]">Escolha uma alternativa para receber seu feedback.</p>}
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="rounded-[2rem] bg-[#dceca9] px-6 py-8 sm:px-10 sm:py-10"><div className="max-w-2xl"><span className="text-xs font-black uppercase tracking-[0.16em] text-[#4a754e]">Projeto acadêmico</span><h2 className="mt-3 text-2xl font-black tracking-tight text-[#183328] sm:text-3xl">Uma plataforma para apoiar escolhas mais sustentáveis, com resultados mensuráveis.</h2><p className="mt-4 leading-7 text-[#44644c]">O MVP combina educação ambiental, catálogo de descarte e gamificação. A próxima fase integrará pontos de coleta e instrumentos de avaliação de usabilidade.</p></div></div>
        </section>
      </main>
    </div>
  );
}
