import { useEffect, useState } from "react";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  Flame,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import {
  Abas,
  Aviso,
  BarraProgresso,
  CabecalhoPagina,
  Carregando,
  Cartao,
  ESTILOS,
  Estatistica,
  Etiqueta,
  EstadoVazio,
} from "@/components/pagina/Pagina";
import {
  alterarStatusDesafio,
  atualizarDesafio,
  criarDesafio,
  listarDesafios,
  listarDesafiosGestao,
  participarDesafio,
  registrarAcaoSustentavel,
  type DadosDesafioApi,
} from "@/lib/api";

type DesafioPublico = Awaited<ReturnType<typeof listarDesafios>>["desafios"][number];
type DesafioGestao = Awaited<ReturnType<typeof listarDesafiosGestao>>["desafios"][number];
type TipoCriterio = "descarte" | "quiz" | "categorias_distintas";
type CriterioForm = { tipo: TipoCriterio; meta: number; categoria: string; tema: string; categorias: string };
type FormDesafio = { nome: string; descricao: string; tipoAcao: string; meta: number; pontos: number; inicio: string; fim: string; periodicidade: "unica" | "diaria" | "semanal" | "mensal"; criterios: CriterioForm[] };

const formularioVazio = (): FormDesafio => ({ nome: "", descricao: "", tipoAcao: "metas_compostas", meta: 5, pontos: 50, inicio: dataLocalInput(new Date()), fim: "", periodicidade: "unica", criterios: [] });
const criterioVazio = (): CriterioForm => ({ tipo: "descarte", meta: 1, categoria: "", tema: "", categorias: "" });
const PERIODOS = { unica: "Único", diaria: "Diário", semanal: "Semanal", mensal: "Mensal" } as const;

export default function DesafiosCrud({ podeAdministrar, podeLer, podeParticipar }: { podeAdministrar: boolean; podeLer: boolean; podeParticipar: boolean }) {
  const podeParticiparDesafios = podeLer && podeParticipar;
  const [aba, setAba] = useState<"participar" | "gestao">(podeAdministrar ? "gestao" : "participar");
  const abaAtual = aba === "participar" && !podeParticiparDesafios ? "gestao" : aba === "gestao" && !podeAdministrar ? "participar" : aba;
  const [desafiosPublicos, setDesafiosPublicos] = useState<DesafioPublico[]>([]);
  const [desafiosGestao, setDesafiosGestao] = useState<DesafioGestao[]>([]);
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [form, setForm] = useState<FormDesafio>(formularioVazio());
  const [idEdicao, setIdEdicao] = useState("");
  const [descricaoAcao, setDescricaoAcao] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!podeParticiparDesafios) return;
    let ativo = true;
    void listarDesafios().then(resultado => { if (ativo) setDesafiosPublicos(resultado.desafios); })
      .catch(() => { if (ativo) setErro("Não foi possível carregar os desafios disponíveis."); });
    return () => { ativo = false; };
  }, [podeParticiparDesafios]);

  useEffect(() => {
    if (!podeAdministrar || abaAtual !== "gestao") return;
    let ativo = true;
    setCarregando(true);
    void listarDesafiosGestao(buscaAplicada, statusFiltro).then(resultado => {
      if (ativo) setDesafiosGestao(resultado.desafios);
    }).catch(() => {
      if (ativo) setErro("Não foi possível carregar os desafios para gestão.");
    }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [podeAdministrar, abaAtual, buscaAplicada, statusFiltro]);

  async function recarregar() {
    const gestao = await listarDesafiosGestao(buscaAplicada, statusFiltro);
    setDesafiosGestao(gestao.desafios);
    if (podeParticiparDesafios) {
      const publicos = await listarDesafios();
      setDesafiosPublicos(publicos.desafios);
    }
  }

  function iniciarEdicao(desafio: DesafioGestao) {
    if (desafio.statusDesafio === "arquivado") return;
    setIdEdicao(desafio.idDesafio);
    setForm({
      nome: desafio.nomeDesafio,
      descricao: desafio.descricaoDesafio,
      tipoAcao: desafio.tipoAcao,
      meta: desafio.metaQuantidade,
      pontos: desafio.quantidadePontos,
      inicio: desafio.dataInicio ? dataLocalInput(new Date(desafio.dataInicio)) : "",
      fim: desafio.dataFim ? dataLocalInput(new Date(desafio.dataFim)) : "",
      periodicidade: (desafio.periodicidade || "unica") as FormDesafio["periodicidade"],
      criterios: desafio.criterios.map(criterio => ({
        tipo: criterio.tipo as TipoCriterio,
        meta: criterio.meta,
        categoria: criterio.categoria,
        tema: criterio.tema,
        categorias: criterio.categorias.join(", "),
      })),
    });
    setErro(""); setAviso(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limparFormulario() { setIdEdicao(""); setForm(formularioVazio()); }

  function converterDados(): DadosDesafioApi {
    return {
      nomeDesafio: form.nome,
      descricaoDesafio: form.descricao,
      tipoAcao: form.tipoAcao,
      metaQuantidade: Number(form.meta),
      quantidadePontos: Number(form.pontos),
      dataInicio: new Date(form.inicio).toISOString(),
      dataFim: form.fim ? new Date(form.fim).toISOString() : "",
      periodicidade: form.periodicidade,
      criterios: form.criterios.map(criterio => ({
        tipo: criterio.tipo,
        meta: Number(criterio.meta),
        categoria: criterio.categoria.trim(),
        tema: criterio.tema.trim(),
        categorias: criterio.categorias.split(",").map(item => item.trim()).filter(Boolean),
      })),
    };
  }

  async function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setSalvando(true); setErro(""); setAviso("");
    try {
      const dados = converterDados();
      const resultado = idEdicao ? await atualizarDesafio(idEdicao, dados) : await criarDesafio(dados);
      if (!resultado.operacaoAceita) throw new Error(resultado.mensagemResultado || "Não foi possível salvar o desafio.");
      setAviso(resultado.mensagemResultado); limparFormulario(); await recarregar();
    } catch (falha) {
      setErro(mensagemErro(falha, "Não foi possível salvar. Confira as datas e os campos."));
    } finally { setSalvando(false); }
  }

  async function mudarStatus(id: string, status: string) {
    setErro(""); setAviso("");
    try {
      const resultado = await alterarStatusDesafio(id, status);
      if (!resultado.operacaoAceita) throw new Error(resultado.mensagemResultado || "Não foi possível alterar o status.");
      setAviso(resultado.mensagemResultado); if (idEdicao === id) limparFormulario(); await recarregar();
    } catch (falha) { setErro(mensagemErro(falha, "Não foi possível alterar o status do desafio.")); }
  }

  async function participar(id: string) {
    setErro(""); setAviso("");
    try {
      const resultado = await participarDesafio(id);
      if (!resultado.participacaoAceita) throw new Error(resultado.mensagemResultado || "Este desafio não está disponível para participação.");
      setAviso(resultado.mensagemResultado); const atualizados = await listarDesafios(); setDesafiosPublicos(atualizados.desafios);
    } catch (falha) { setErro(mensagemErro(falha, "Não foi possível entrar no desafio.")); }
  }

  async function registrarAcao(desafio: DesafioPublico) {
    setErro(""); setAviso("");
    try {
      const resultado = await registrarAcaoSustentavel(desafio.idDesafio, desafio.tipoAcao, descricaoAcao[desafio.idDesafio] ?? "");
      if (!resultado.acaoAceita) throw new Error(resultado.mensagemResultado || "A ação não foi aceita.");
      setAviso(resultado.desafioConcluido ? `Desafio concluído! Você recebeu ${resultado.quantidadePontos} pontos.` : `Ação registrada · progresso ${resultado.quantidadeProgresso}/${desafio.metaQuantidade}.`);
      setDescricaoAcao(atual => ({ ...atual, [desafio.idDesafio]: "" }));
      const atualizados = await listarDesafios(); setDesafiosPublicos(atualizados.desafios);
    } catch (falha) { setErro(mensagemErro(falha, "Não foi possível registrar a ação.")); }
  }

  if (!podeAdministrar && !podeParticiparDesafios) return null;

  const participandoAgora = desafiosPublicos.filter(desafio => desafio.statusParticipacao === "participando").length;
  const pontosEmJogo = desafiosPublicos.reduce((total, desafio) => total + desafio.quantidadePontos, 0);
  const abas = [
    ...(podeParticiparDesafios ? [{ id: "participar" as const, rotulo: "Desafios", icone: Flame, contador: desafiosPublicos.length }] : []),
    ...(podeAdministrar ? [{ id: "gestao" as const, rotulo: "Gerenciar desafios", icone: ListChecks }] : []),
  ];
  const atualizarCriterio = (indice: number, mudanca: Partial<CriterioForm>) =>
    setForm(atual => ({ ...atual, criterios: atual.criterios.map((item, pos) => pos === indice ? { ...item, ...mudanca } : item) }));

  return <div className="space-y-5">
    <CabecalhoPagina
      icone={Trophy}
      tom="vermelho"
      titulo="Desafios"
      descricao="Entre em desafios sustentáveis, cumpra as metas e ganhe pontos. Alguns contam sozinhos: quizzes certos e descartes aprovados já entram no seu progresso."
    >
      {podeParticiparDesafios ? (
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Estatistica icone={Trophy} tom="vermelho" valor={desafiosPublicos.length} rotulo="Desafios disponíveis" />
          <Estatistica icone={Flame} tom="verde" valor={participandoAgora} rotulo="Você está participando" />
          <Estatistica icone={Star} tom="amarelo" valor={pontosEmJogo} rotulo="Pontos para ganhar" />
        </div>
      ) : null}
    </CabecalhoPagina>

    {abas.length > 1 ? <Abas rotulo="Seções de desafios" abas={abas} ativa={abaAtual} onChange={setAba} /> : null}

    {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
    {aviso ? <Aviso tipo="sucesso">{aviso}</Aviso> : null}

    {abaAtual === "participar" ? <section aria-label="Desafios disponíveis">
      {desafiosPublicos.length ? <div className="grid gap-4 lg:grid-cols-2">
        {desafiosPublicos.map(desafio => {
          const participando = desafio.statusParticipacao === "participando";
          const automatico = desafio.criterios.length > 0;
          const totalMeta = automatico ? desafio.criterios.reduce((total, criterio) => total + criterio.meta, 0) : desafio.metaQuantidade;
          const progressoTotal = automatico ? desafio.progressoCriterios.reduce((total, item) => total + Math.min(item.progresso, item.criterio?.meta ?? 0), 0) : desafio.quantidadeProgresso;
          const progresso = Math.min(100, Math.round((progressoTotal / Math.max(1, totalMeta)) * 100));
          return <article key={`${desafio.idDesafio}:${desafio.periodoChave}`} className={`flex flex-col rounded-[24px] border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-30px_rgba(23,54,42,.55)] sm:p-6 ${participando ? "border-[#cfe8d8]" : "border-[#e1ebe2]"}`}>
            <div className="flex items-start gap-3.5">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_22px_-12px_rgba(0,0,0,.45)] ${participando ? "bg-[#2f9a5f]" : "bg-[#d0493e]"}`}>
                {participando ? <Flame className="h-6 w-6" aria-hidden="true" /> : <Trophy className="h-6 w-6" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  <Etiqueta tom="amarelo" icone={Star}>{desafio.quantidadePontos} pontos</Etiqueta>
                  <Etiqueta tom="azul" icone={desafio.periodicidade === "unica" ? CalendarDays : Repeat}>{PERIODOS[desafio.periodicidade as keyof typeof PERIODOS] ?? "Único"}</Etiqueta>
                  {participando ? <Etiqueta tom="verde" icone={Check}>Participando</Etiqueta> : null}
                </div>
                <h3 className="mt-2 text-lg font-black leading-7 text-[#17362a]">{desafio.nomeDesafio}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#5c7768]">{desafio.descricaoDesafio}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#6c8879]">
              <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#d0493e]" aria-hidden="true" />
              <span>Termina em {formatarData(desafio.dataFimPeriodo)}</span>
              <span className="text-[#a3b5aa]">·</span>
              <span>Ciclo {desafio.periodoChave}</span>
            </p>

            {participando ? <div className="mt-5 rounded-2xl bg-[#f5faf6] p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#2c4a3c]"><Target className="h-4 w-4 text-[#2f9a5f]" aria-hidden="true" />Seu progresso</span>
                <span className="font-black tabular-nums text-[#1d6b43]">{progressoTotal}/{totalMeta}</span>
              </div>
              <BarraProgresso percentual={progresso} tom="verde" rotulo={`Progresso no desafio ${desafio.nomeDesafio}`} />
            </div> : null}

            {automatico && participando ? <div className="mt-3 space-y-2">
              {desafio.progressoCriterios.map((item, indice) => {
                const criterio = item.criterio;
                if (!criterio) return null;
                const concluido = item.progresso >= criterio.meta;
                return <div key={`${criterio.tipo}:${criterio.categoria}:${criterio.tema}:${indice}`} className="rounded-xl border border-[#e1ebe2] bg-white px-3.5 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-bold text-[#2c4a3c]">
                      {concluido ? <CircleCheck className="h-4 w-4 shrink-0 text-[#2f9a5f]" aria-hidden="true" /> : <ListChecks className="h-4 w-4 shrink-0 text-[#6c8879]" aria-hidden="true" />}
                      <span className="break-words">{rotuloCriterio(criterio)}</span>
                    </span>
                    <strong className="shrink-0 text-sm tabular-nums text-[#1d7953]">{item.progresso}/{criterio.meta}</strong>
                  </div>
                  <BarraProgresso percentual={Math.min(100, Math.round(item.progresso / Math.max(1, criterio.meta) * 100))} tom="verde" rotulo={rotuloCriterio(criterio)} />
                </div>;
              })}
              <p className="flex items-start gap-1.5 text-xs leading-5 text-[#6c8879]"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#c98a12]" aria-hidden="true" />O progresso sobe sozinho quando seu descarte é aprovado ou quando você acerta uma pergunta do quiz.</p>
            </div> : null}

            <div className="mt-auto pt-4">
              {participando && !automatico ? <div className="space-y-2.5">
                <label className="block">
                  <span className={ESTILOS.rotulo}>O que você fez? <span className="font-semibold text-[#8aa094]">(opcional)</span></span>
                  <textarea className={`${ESTILOS.areaTexto} min-h-20 resize-y`} value={descricaoAcao[desafio.idDesafio] ?? ""} onChange={evento => setDescricaoAcao(atual => ({ ...atual, [desafio.idDesafio]: evento.target.value }))} placeholder="Descreva a ação (opcional)" />
                </label>
                <button type="button" className={`${ESTILOS.botaoPrincipal} h-12 w-full`} onClick={() => void registrarAcao(desafio)}><Check className="h-4 w-4" aria-hidden="true" />Registrar ação</button>
              </div> : !participando ? <button type="button" className={`${ESTILOS.botaoPrincipal} h-12 w-full`} onClick={() => void participar(desafio.idDesafio)}>Participar deste desafio<ArrowRight className="h-4 w-4" aria-hidden="true" /></button> : null}
            </div>
          </article>;
        })}
      </div> : <EstadoVazio icone={Trophy} tom="vermelho" titulo="Nenhum desafio ativo agora" descricao="Novos desafios aparecem por aqui. Enquanto isso, que tal responder o quiz ou registrar um descarte?" />}
    </section> : <section className="space-y-4" aria-label="Gerenciar desafios">
      <Aviso tipo="info">Área de gestão: aqui você cria, edita e publica os desafios que as pessoas veem.</Aviso>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,.85fr)_minmax(0,1.15fr)]">
        <Cartao
          icone={idEdicao ? Pencil : Plus}
          tom="vermelho"
          titulo={idEdicao ? "Editar desafio" : "Criar desafio"}
          descricao={idEdicao ? "Ao salvar, o desafio volta para rascunho." : "Ele fica como rascunho até você publicar."}
          acoes={idEdicao ? <button type="button" className={ESTILOS.botaoSecundario} onClick={limparFormulario}><X className="h-4 w-4" aria-hidden="true" />Cancelar</button> : undefined}
        >
          <form onSubmit={salvar} className="space-y-4">
            <label className="block"><span className={ESTILOS.rotulo}>Nome</span><input required maxLength={160} className={ESTILOS.campo} value={form.nome} onChange={evento => setForm(atual => ({ ...atual, nome: evento.target.value }))} placeholder="Ex.: Semana sem descartáveis" /></label>
            <label className="block"><span className={ESTILOS.rotulo}>Descrição</span><textarea required maxLength={8000} className={`${ESTILOS.areaTexto} resize-y`} value={form.descricao} onChange={evento => setForm(atual => ({ ...atual, descricao: evento.target.value }))} placeholder="Explique o propósito e como participar" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className={ESTILOS.rotulo}>Repetição</span><select className={ESTILOS.campo} value={form.periodicidade} onChange={evento => setForm(atual => ({ ...atual, periodicidade: evento.target.value as FormDesafio["periodicidade"] }))}><option value="unica">Único</option><option value="diaria">Diário</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option></select></label>
              <label className="block"><span className={ESTILOS.rotulo}>Pontos ao concluir</span><input required type="number" min={0} max={100000} className={ESTILOS.campo} value={form.pontos} onChange={evento => setForm(atual => ({ ...atual, pontos: Number(evento.target.value) }))} /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className={ESTILOS.rotulo}>Tipo de ação (metas manuais)</span><input required pattern="[a-z0-9_]+" maxLength={100} className={ESTILOS.campo} value={form.tipoAcao} onChange={evento => setForm(atual => ({ ...atual, tipoAcao: evento.target.value }))} placeholder="metas_compostas" /><span className="mt-1 block text-xs leading-5 text-[#6c8879]">Só usado quando não há critérios automáticos.</span></label>
              {!form.criterios.length ? <label className="block"><span className={ESTILOS.rotulo}>Meta de ações</span><input required type="number" min={1} max={100000} className={ESTILOS.campo} value={form.meta} onChange={evento => setForm(atual => ({ ...atual, meta: Number(evento.target.value) }))} /></label> : <p className="self-start rounded-xl bg-[#f5f9f3] p-3 text-xs leading-5 text-[#5c7768] sm:mt-7">A meta total será a soma dos critérios automáticos abaixo.</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className={ESTILOS.rotulo}>Início</span><input required type="datetime-local" className={ESTILOS.campo} value={form.inicio} onChange={evento => setForm(atual => ({ ...atual, inicio: evento.target.value }))} /></label>
              <label className="block"><span className={ESTILOS.rotulo}>Fim <span className="font-semibold text-[#8aa094]">(opcional)</span></span><input type="datetime-local" className={ESTILOS.campo} value={form.fim} onChange={evento => setForm(atual => ({ ...atual, fim: evento.target.value }))} /></label>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#e1ebe2] bg-[#fafcf9] p-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><h4 className="text-sm font-black text-[#17362a]">Critérios automáticos</h4><p className="mt-1 text-xs leading-5 text-[#6c8879]">Descartes contam depois de aprovados; quizzes contam só quando a resposta está certa.</p></div>
                <button type="button" className={`${ESTILOS.botaoSecundario} shrink-0`} disabled={form.criterios.length >= 8} onClick={() => setForm(atual => ({ ...atual, criterios: [...atual.criterios, criterioVazio()] }))}><Plus className="h-4 w-4" aria-hidden="true" />Adicionar</button>
              </div>
              {form.criterios.map((criterio, indice) => <div key={indice} className="space-y-2.5 rounded-xl border border-[#e1ebe2] bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <strong className="inline-flex items-center gap-1.5 text-sm font-black text-[#2c4a3c]"><Target className="h-4 w-4 text-[#d0493e]" aria-hidden="true" />Critério {indice + 1}</strong>
                  <button type="button" aria-label={`Remover critério ${indice + 1}`} className={`${ESTILOS.botaoIcone} text-[#a8493e] hover:bg-[#fff5f3] hover:text-[#a8493e]`} onClick={() => setForm(atual => ({ ...atual, criterios: atual.criterios.filter((_, pos) => pos !== indice) }))}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
                  <select className={ESTILOS.campo} aria-label={`Tipo do critério ${indice + 1}`} value={criterio.tipo} onChange={evento => atualizarCriterio(indice, { tipo: evento.target.value as TipoCriterio })}><option value="descarte">Descartes aprovados por categoria</option><option value="quiz">Respostas corretas de quiz</option><option value="categorias_distintas">Categorias de descarte distintas</option></select>
                  <input aria-label="Meta do critério" required type="number" min={1} max={100000} className={ESTILOS.campo} value={criterio.meta} onChange={evento => atualizarCriterio(indice, { meta: Number(evento.target.value) })} />
                </div>
                {criterio.tipo === "descarte" ? <input required maxLength={80} className={ESTILOS.campo} value={criterio.categoria} onChange={evento => atualizarCriterio(indice, { categoria: evento.target.value })} placeholder="Categoria exata do ponto (ex.: plástico)" /> : null}
                {criterio.tipo === "quiz" ? <input maxLength={80} className={ESTILOS.campo} value={criterio.tema} onChange={evento => atualizarCriterio(indice, { tema: evento.target.value })} placeholder="Tema do quiz (opcional; vazio = qualquer tema)" /> : null}
                {criterio.tipo === "categorias_distintas" ? <input className={ESTILOS.campo} value={criterio.categorias} onChange={evento => atualizarCriterio(indice, { categorias: evento.target.value })} placeholder="Categorias permitidas separadas por vírgula (opcional)" /> : null}
              </div>)}
            </div>
            <button type="submit" disabled={salvando} className={`${ESTILOS.botaoPrincipal} h-12 w-full`}>
              {salvando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              {salvando ? "Salvando..." : idEdicao ? "Salvar e voltar para rascunho" : "Salvar como rascunho"}
            </button>
            <p className="text-xs leading-5 text-[#6c8879]">Desafios com participantes ou ações registradas não podem ser editados. Arquive-os para guardar o histórico.</p>
          </form>
        </Cartao>

        <div className="space-y-4">
          <div className="flex flex-col gap-2.5 rounded-[24px] border border-[#e1ebe2] bg-white p-4 sm:flex-row">
            <input className={ESTILOS.campo} aria-label="Buscar desafio" value={busca} onChange={evento => setBusca(evento.target.value)} onKeyDown={evento => { if (evento.key === "Enter") { evento.preventDefault(); setBuscaAplicada(busca); } }} placeholder="Buscar nome, descrição ou tipo" />
            <button type="button" className={`${ESTILOS.botaoSecundario} h-12 shrink-0`} onClick={() => setBuscaAplicada(busca)}><Search className="h-4 w-4" aria-hidden="true" />Buscar</button>
            <select className={`${ESTILOS.campo} sm:max-w-44`} aria-label="Filtrar por situação" value={statusFiltro} onChange={evento => setStatusFiltro(evento.target.value)}><option value="todos">Todos os status</option><option value="rascunho">Rascunho</option><option value="publicado">Publicado</option><option value="arquivado">Arquivado</option></select>
          </div>
          {carregando ? <Carregando texto="Carregando desafios…" /> : null}
          {!carregando && !desafiosGestao.length ? <EstadoVazio icone={Trophy} tom="vermelho" titulo="Nenhum desafio por aqui" descricao="Nada encontrado neste filtro. Crie um rascunho para começar." /> : null}
          {desafiosGestao.map(desafio => <article key={desafio.idDesafio} className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 transition hover:border-[#cfe0d3] hover:shadow-[0_18px_36px_-28px_rgba(23,54,42,.45)]">
            <div className="flex flex-wrap items-center gap-2">
              <EtiquetaStatusDesafio status={desafio.statusDesafio} />
              <Etiqueta tom="amarelo" icone={Star}>{desafio.quantidadePontos} pontos</Etiqueta>
              <Etiqueta tom="azul" icone={desafio.periodicidade === "unica" ? CalendarDays : Repeat}>{PERIODOS[desafio.periodicidade as keyof typeof PERIODOS] ?? "Único"}</Etiqueta>
            </div>
            <h3 className="mt-3 text-base font-black leading-6 text-[#17362a]">{desafio.nomeDesafio}</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#5c7768]">{desafio.descricaoDesafio}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#6c8879]"><CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Ação: {desafio.tipoAcao} · início: {formatarData(desafio.dataInicio)}{desafio.dataFim ? ` · fim: ${formatarData(desafio.dataFim)}` : " · sem data final"}</p>
            {desafio.criterios.length ? <div className="mt-3 flex flex-wrap gap-1.5">{desafio.criterios.map((criterio, indice) => <Etiqueta key={`${criterio.tipo}:${indice}`} tom="verde" icone={Target}>{criterioLabel(criterio.tipo, criterio.categoria, criterio.tema, criterio.meta)}</Etiqueta>)}</div> : <p className="mt-2 text-xs text-[#6c8879]">Meta: {desafio.metaQuantidade} ações manuais.</p>}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eef3ef] pt-4">
              {desafio.statusDesafio !== "arquivado" ? <button type="button" className={ESTILOS.botaoSecundario} onClick={() => iniciarEdicao(desafio)}><Pencil className="h-4 w-4" aria-hidden="true" />Editar</button> : null}
              {desafio.statusDesafio === "rascunho" ? <button type="button" className={ESTILOS.botaoPrincipal} onClick={() => void mudarStatus(desafio.idDesafio, "publicado")}><Send className="h-4 w-4" aria-hidden="true" />Publicar</button> : null}
              {desafio.statusDesafio === "publicado" ? <button type="button" className={ESTILOS.botaoSecundario} onClick={() => void mudarStatus(desafio.idDesafio, "rascunho")}><RotateCcw className="h-4 w-4" aria-hidden="true" />Voltar a rascunho</button> : null}
              {desafio.statusDesafio === "arquivado" ? <button type="button" className={ESTILOS.botaoSecundario} onClick={() => void mudarStatus(desafio.idDesafio, "rascunho")}><RotateCcw className="h-4 w-4" aria-hidden="true" />Restaurar como rascunho</button> : <button type="button" className={ESTILOS.botaoPerigo} onClick={() => void mudarStatus(desafio.idDesafio, "arquivado")}><Archive className="h-4 w-4" aria-hidden="true" />Arquivar</button>}
            </div>
          </article>)}
        </div>
      </div>
    </section>}
  </div>;
}

function EtiquetaStatusDesafio({ status }: { status: string }) {
  if (status === "publicado") return <Etiqueta tom="verde" icone={CircleCheck}>Publicado</Etiqueta>;
  if (status === "arquivado") return <Etiqueta tom="cinza" icone={Archive}>Arquivado</Etiqueta>;
  if (status === "rascunho") return <Etiqueta tom="amarelo" icone={Pencil}>Rascunho</Etiqueta>;
  return <Etiqueta tom="cinza">{status}</Etiqueta>;
}

function rotuloCriterio(criterio: { tipo: string; categoria: string; tema: string; categorias: string[] }) {
  if (criterio.tipo === "descarte") return `Descarte aprovado · ${criterio.categoria}`;
  if (criterio.tipo === "quiz") return `Quiz correto${criterio.tema ? ` · ${criterio.tema}` : " · qualquer tema"}`;
  return `Categorias distintas${criterio.categorias.length ? ` · ${criterio.categorias.join(", ")}` : ""}`;
}
function criterioLabel(tipo: string, categoria: string, tema: string, meta: number) {
  if (tipo === "descarte") return `${meta} descarte(s) · ${categoria}`;
  if (tipo === "quiz") return `${meta} quiz(es) correto(s)${tema ? ` · ${tema}` : ""}`;
  return `${meta} categoria(s) distinta(s)`;
}
function dataLocalInput(data: Date) {
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function formatarData(valor: string) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(data);
}
function mensagemErro(falha: unknown, padrao: string) {
  return falha instanceof Error && falha.message ? falha.message : padrao;
}
