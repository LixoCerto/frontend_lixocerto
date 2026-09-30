import { useEffect, useState } from "react";
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
const inputClass = "w-full rounded-xl border border-[#dce8de] bg-white px-3.5 py-3 text-sm text-[#17362a] outline-none transition placeholder:text-[#9aac9f] focus:border-[#5a9a70] focus:ring-2 focus:ring-[#5a9a70]/15";
const buttonPrimary = "rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#176342] disabled:cursor-wait disabled:opacity-60";
const buttonSecondary = "rounded-xl border border-[#dce8de] bg-white px-3 py-2 text-xs font-bold text-[#386348] transition hover:bg-[#f4f8f3] disabled:opacity-50";
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

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 rounded-[24px] bg-[#17362a] p-6 text-white sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#c7e5bf]">Gamificação</p><h2 className="mt-2 text-2xl font-black">Desafios sustentáveis</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#d1e0d5]">Participe de ciclos únicos, diários, semanais ou mensais. Metas automáticas contam quizzes corretos e descartes aprovados em pontos compatíveis.</p></div>
      {podeAdministrar || podeParticiparDesafios ? <div className="flex rounded-xl bg-white/10 p-1">{podeParticiparDesafios ? <button type="button" onClick={() => setAba("participar")} className={`rounded-lg px-3 py-2 text-xs font-black ${abaAtual === "participar" ? "bg-white text-[#1d4934]" : "text-white"}`}>Ver desafios</button> : null}{podeAdministrar ? <button type="button" onClick={() => setAba("gestao")} className={`rounded-lg px-3 py-2 text-xs font-black ${abaAtual === "gestao" ? "bg-white text-[#1d4934]" : "text-white"}`}>Gerenciar</button> : null}</div> : null}
    </header>
    {erro ? <p role="alert" className="rounded-xl border border-[#f1c9c0] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">{erro}</p> : null}
    {aviso ? <p role="status" className="rounded-xl border border-[#cde5cf] bg-[#eff8ee] px-4 py-3 text-sm font-semibold text-[#28764e]">{aviso}</p> : null}

    {abaAtual === "participar" ? <section className="grid gap-4 lg:grid-cols-2">
      {desafiosPublicos.map(desafio => {
        const participando = desafio.statusParticipacao === "participando";
        const automatico = desafio.criterios.length > 0;
        const totalMeta = automatico ? desafio.criterios.reduce((total, criterio) => total + criterio.meta, 0) : desafio.metaQuantidade;
        const progressoTotal = automatico ? desafio.progressoCriterios.reduce((total, item) => total + Math.min(item.progresso, item.criterio?.meta ?? 0), 0) : desafio.quantidadeProgresso;
        const progresso = Math.min(100, Math.round((progressoTotal / Math.max(1, totalMeta)) * 100));
        return <article key={`${desafio.idDesafio}:${desafio.periodoChave}`} className="rounded-[22px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)]">
          <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#edf5e9] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#3e8257]">{PERIODOS[desafio.periodicidade as keyof typeof PERIODOS] ?? "Único"}</span><span className="text-xs font-bold text-[#809789]">{desafio.quantidadePontos} pontos</span></div>
          <h3 className="mt-4 text-lg font-black leading-7 text-[#17362a]">{desafio.nomeDesafio}</h3><p className="mt-2 text-sm leading-6 text-[#647d6c]">{desafio.descricaoDesafio}</p>
          <p className="mt-3 text-[11px] font-semibold text-[#82978a]">Ciclo {desafio.periodoChave} · termina {formatarData(desafio.dataFimPeriodo)}</p>
          {participando ? <><div className="mt-5 flex items-center justify-between text-xs font-bold text-[#5d7766]"><span>Progresso</span><span>{progressoTotal}/{totalMeta}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eaf0e9]"><div className="h-full rounded-full bg-[#5aa66d] transition-all" style={{ width: `${progresso}%` }} /></div></> : null}
          {automatico && participando ? <div className="mt-4 space-y-2">{desafio.progressoCriterios.map((item, indice) => { const criterio = item.criterio; if (!criterio) return null; return <div key={`${criterio.tipo}:${criterio.categoria}:${criterio.tema}:${indice}`} className="rounded-xl bg-[#f6f9f5] px-3.5 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#587261]">{rotuloCriterio(criterio)}</span><strong className="text-xs text-[#1d7953]">{item.progresso}/{criterio.meta}</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4ece3]"><div className="h-full rounded-full bg-[#5aa66d]" style={{ width: `${Math.min(100, Math.round(item.progresso / Math.max(1, criterio.meta) * 100))}%` }} /></div></div>;})}<p className="text-[11px] leading-5 text-[#82978a]">O progresso atualiza após a aprovação do descarte ou a resposta correta do quiz.</p></div> : null}
          {participando && !automatico ? <div className="mt-4 space-y-2"><textarea className={`${inputClass} min-h-16 resize-y`} value={descricaoAcao[desafio.idDesafio] ?? ""} onChange={evento => setDescricaoAcao(atual => ({ ...atual, [desafio.idDesafio]: evento.target.value }))} placeholder="Descreva a ação (opcional)" /><button type="button" className={buttonPrimary} onClick={() => void registrarAcao(desafio)}>Registrar ação</button></div> : !participando ? <button type="button" className={`${buttonPrimary} mt-4`} onClick={() => void participar(desafio.idDesafio)}>Participar deste ciclo</button> : null}
        </article>;
      })}
      {!desafiosPublicos.length ? <div className="rounded-2xl border border-dashed border-[#d9e6dc] bg-white p-8 text-center text-sm font-semibold text-[#718b7a] lg:col-span-2">Nenhum desafio está ativo neste momento.</div> : null}
    </section> : <section className="grid items-start gap-5 xl:grid-cols-[minmax(320px,.85fr)_minmax(0,1.15fr)]">
      <form onSubmit={salvar} className="space-y-4 rounded-[22px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.13em] text-[#62806c]">{idEdicao ? "Edição" : "Novo conteúdo"}</p><h3 className="mt-1 text-lg font-black">{idEdicao ? "Editar desafio" : "Criar desafio"}</h3></div>{idEdicao ? <button type="button" className={buttonSecondary} onClick={limparFormulario}>Cancelar</button> : null}</div>
        <label className="block text-xs font-bold text-[#587261]">Nome<input required maxLength={160} className={`${inputClass} mt-1.5`} value={form.nome} onChange={evento => setForm(atual => ({ ...atual, nome: evento.target.value }))} placeholder="Ex.: Semana sem descartáveis" /></label>
        <label className="block text-xs font-bold text-[#587261]">Descrição<textarea required maxLength={8000} className={`${inputClass} mt-1.5 min-h-24 resize-y`} value={form.descricao} onChange={evento => setForm(atual => ({ ...atual, descricao: evento.target.value }))} placeholder="Explique o propósito e como participar" /></label>
        <label className="block text-xs font-bold text-[#587261]">Tipo de ação legado<input required pattern="[a-z0-9_]+" maxLength={100} className={`${inputClass} mt-1.5`} value={form.tipoAcao} onChange={evento => setForm(atual => ({ ...atual, tipoAcao: evento.target.value }))} placeholder="metas_compostas" /><span className="mt-1 block font-normal text-[#82978a]">Usado apenas por metas manuais sem critérios automáticos.</span></label>
        <label className="block text-xs font-bold text-[#587261]">Periodicidade<select className={`${inputClass} mt-1.5`} value={form.periodicidade} onChange={evento => setForm(atual => ({ ...atual, periodicidade: evento.target.value as FormDesafio["periodicidade"] }))}><option value="unica">Único</option><option value="diaria">Diário</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option></select></label>
        {!form.criterios.length ? <label className="block text-xs font-bold text-[#587261]">Meta de ações<input required type="number" min={1} max={100000} className={`${inputClass} mt-1.5`} value={form.meta} onChange={evento => setForm(atual => ({ ...atual, meta: Number(evento.target.value) }))} /></label> : <p className="rounded-xl bg-[#f5f9f3] p-3 text-xs leading-5 text-[#698375]">A meta total será calculada pela soma dos critérios automáticos definidos abaixo.</p>}
        <label className="block text-xs font-bold text-[#587261]">Recompensa ao concluir o ciclo<input required type="number" min={0} max={100000} className={`${inputClass} mt-1.5`} value={form.pontos} onChange={evento => setForm(atual => ({ ...atual, pontos: Number(evento.target.value) }))} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-[#587261]">Início<input required type="datetime-local" className={`${inputClass} mt-1.5`} value={form.inicio} onChange={evento => setForm(atual => ({ ...atual, inicio: evento.target.value }))} /></label><label className="block text-xs font-bold text-[#587261]">Fim (opcional)<input type="datetime-local" className={`${inputClass} mt-1.5`} value={form.fim} onChange={evento => setForm(atual => ({ ...atual, fim: evento.target.value }))} /></label></div>

        <div className="space-y-3 rounded-2xl border border-[#e2ebe3] bg-[#fbfdfb] p-4">
          <div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-black text-[#244637]">Critérios automáticos</h4><p className="mt-1 text-[11px] leading-5 text-[#82978a]">Descartes contam após aprovação; quizzes contam somente quando corretos.</p></div><button type="button" className={buttonSecondary} disabled={form.criterios.length >= 8} onClick={() => setForm(atual => ({ ...atual, criterios: [...atual.criterios, criterioVazio()] }))}>+ Adicionar</button></div>
          {form.criterios.map((criterio, indice) => <div key={indice} className="space-y-2 rounded-xl border border-[#e4ece4] bg-white p-3">
            <div className="flex items-center justify-between gap-2"><strong className="text-xs text-[#587261]">Critério {indice + 1}</strong><button type="button" aria-label={`Remover critério ${indice + 1}`} className="text-xs font-bold text-[#a85040]" onClick={() => setForm(atual => ({ ...atual, criterios: atual.criterios.filter((_, pos) => pos !== indice) }))}>Remover</button></div>
            <div className="grid gap-2 sm:grid-cols-[1fr_100px]"><select className={inputClass} value={criterio.tipo} onChange={evento => setForm(atual => ({ ...atual, criterios: atual.criterios.map((item, pos) => pos === indice ? { ...item, tipo: evento.target.value as TipoCriterio } : item) }))}><option value="descarte">Descartes aprovados por categoria</option><option value="quiz">Respostas corretas de quiz</option><option value="categorias_distintas">Categorias de descarte distintas</option></select><input aria-label="Meta do critério" required type="number" min={1} max={100000} className={inputClass} value={criterio.meta} onChange={evento => setForm(atual => ({ ...atual, criterios: atual.criterios.map((item, pos) => pos === indice ? { ...item, meta: Number(evento.target.value) } : item) }))} /></div>
            {criterio.tipo === "descarte" ? <input required maxLength={80} className={inputClass} value={criterio.categoria} onChange={evento => setForm(atual => ({ ...atual, criterios: atual.criterios.map((item, pos) => pos === indice ? { ...item, categoria: evento.target.value } : item) }))} placeholder="Categoria exata do ponto (ex.: plástico)" /> : null}
            {criterio.tipo === "quiz" ? <input maxLength={80} className={inputClass} value={criterio.tema} onChange={evento => setForm(atual => ({ ...atual, criterios: atual.criterios.map((item, pos) => pos === indice ? { ...item, tema: evento.target.value } : item) }))} placeholder="Tema do quiz (opcional; vazio = qualquer tema)" /> : null}
            {criterio.tipo === "categorias_distintas" ? <input className={inputClass} value={criterio.categorias} onChange={evento => setForm(atual => ({ ...atual, criterios: atual.criterios.map((item, pos) => pos === indice ? { ...item, categorias: evento.target.value } : item) }))} placeholder="Categorias permitidas separadas por vírgula (opcional)" /> : null}
          </div>)}
        </div>
        <button type="submit" disabled={salvando} className={`${buttonPrimary} w-full`}>{salvando ? "Salvando..." : idEdicao ? "Salvar e voltar para rascunho" : "Salvar como rascunho"}</button><p className="text-[11px] leading-5 text-[#82978a]">Desafios com participação ou ações ficam protegidos contra edição. Arquive-os para preservar o histórico.</p>
      </form>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#e1ebe2] bg-white p-4 sm:flex-row"><input className={inputClass} value={busca} onChange={evento => setBusca(evento.target.value)} onKeyDown={evento => { if (evento.key === "Enter") { evento.preventDefault(); setBuscaAplicada(busca); } }} placeholder="Buscar nome, descrição ou tipo" /><button type="button" className={buttonSecondary} onClick={() => setBuscaAplicada(busca)}>Buscar</button><select className={`${inputClass} sm:max-w-44`} value={statusFiltro} onChange={evento => setStatusFiltro(evento.target.value)}><option value="todos">Todos os status</option><option value="rascunho">Rascunho</option><option value="publicado">Publicado</option><option value="arquivado">Arquivado</option></select></div>
        {carregando ? <p className="rounded-xl bg-white p-5 text-sm font-semibold text-[#718b7a]">Carregando desafios…</p> : null}
        {!carregando && !desafiosGestao.length ? <div className="rounded-2xl border border-dashed border-[#d9e6dc] bg-white p-8 text-center text-sm font-semibold text-[#718b7a]">Nenhum desafio neste filtro. Crie um rascunho para começar.</div> : null}
        {desafiosGestao.map(desafio => <article key={desafio.idDesafio} className="rounded-[20px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.5)]"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${desafio.statusDesafio === "publicado" ? "bg-[#e7f4e6] text-[#27764d]" : desafio.statusDesafio === "arquivado" ? "bg-[#f0eeee] text-[#77716e]" : "bg-[#fff3d7] text-[#96630d]"}`}>{desafio.statusDesafio}</span><span className="text-xs font-bold text-[#7b9283]">{desafio.quantidadePontos} pontos · {PERIODOS[desafio.periodicidade as keyof typeof PERIODOS] ?? "Único"}</span></div><h3 className="mt-3 font-black leading-6 text-[#17362a]">{desafio.nomeDesafio}</h3><p className="mt-2 text-sm leading-5 text-[#647d6c]">{desafio.descricaoDesafio}</p><p className="mt-2 text-xs text-[#82978a]">Ação: {desafio.tipoAcao} · início: {formatarData(desafio.dataInicio)}{desafio.dataFim ? ` · fim: ${formatarData(desafio.dataFim)}` : " · sem data final"}</p>{desafio.criterios.length ? <div className="mt-3 flex flex-wrap gap-2">{desafio.criterios.map((criterio, indice) => <span key={`${criterio.tipo}:${indice}`} className="rounded-full bg-[#f1f7ee] px-3 py-1 text-[10px] font-bold text-[#4e7258]">{criterioLabel(criterio.tipo, criterio.categoria, criterio.tema, criterio.meta)}</span>)}</div> : <p className="mt-2 text-xs text-[#82978a]">Meta: {desafio.metaQuantidade} ações manuais.</p>}<div className="mt-4 flex flex-wrap gap-2">{desafio.statusDesafio !== "arquivado" ? <button type="button" className={buttonSecondary} onClick={() => iniciarEdicao(desafio)}>Editar</button> : null}{desafio.statusDesafio === "rascunho" ? <button type="button" className={buttonSecondary} onClick={() => void mudarStatus(desafio.idDesafio, "publicado")}>Publicar</button> : null}{desafio.statusDesafio === "publicado" ? <button type="button" className={buttonSecondary} onClick={() => void mudarStatus(desafio.idDesafio, "rascunho")}>Voltar a rascunho</button> : null}{desafio.statusDesafio === "arquivado" ? <button type="button" className={buttonSecondary} onClick={() => void mudarStatus(desafio.idDesafio, "rascunho")}>Restaurar como rascunho</button> : <button type="button" className="rounded-xl border border-[#f1d4cd] px-3 py-2 text-xs font-bold text-[#a85040] hover:bg-[#fff4f0]" onClick={() => void mudarStatus(desafio.idDesafio, "arquivado")}>Arquivar</button>}</div></article>)}
      </div>
    </section>}
  </div>;
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
