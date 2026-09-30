import { useEffect, useMemo, useState } from "react";
import {
  listarDescartesGestao,
  listarMeusDescartes,
  listarPontosColeta,
  registrarDescarte,
  revisarDescarte,
} from "@/lib/api";

const inputClass = "w-full rounded-xl border border-[#dce8de] bg-white px-3.5 py-3 text-sm text-[#17362a] outline-none transition placeholder:text-[#9aac9f] focus:border-[#5a9a70] focus:ring-2 focus:ring-[#5a9a70]/15";
const primary = "rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#176342] disabled:cursor-wait disabled:opacity-60";
const secondary = "rounded-xl border border-[#dce8de] bg-white px-3 py-2 text-xs font-bold text-[#386348] transition hover:bg-[#f4f8f3] disabled:opacity-50";
type Registro = Awaited<ReturnType<typeof listarMeusDescartes>>["registros"][number];
type Ponto = Awaited<ReturnType<typeof listarPontosColeta>>["pontosColeta"][number];

export default function RegistrosDescarte({ podeRegistrar, podeLer, podeRevisar }: { podeRegistrar: boolean; podeLer: boolean; podeRevisar: boolean }) {
  const [meusRegistros, setMeusRegistros] = useState<Registro[]>([]);
  const [fila, setFila] = useState<Registro[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [cidade, setCidade] = useState("João Pessoa");
  const [categoria, setCategoria] = useState("");
  const [pontoSelecionado, setPontoSelecionado] = useState("");
  const [relato, setRelato] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [carregando, setCarregando] = useState(false);
  const [idProcessando, setIdProcessando] = useState("");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  async function carregarMeus() {
    if (!podeLer) return;
    const resultado = await listarMeusDescartes();
    setMeusRegistros(resultado.registros);
  }

  async function carregarFila(status = filtroStatus) {
    if (!podeRevisar) return;
    const resultado = await listarDescartesGestao(status);
    setFila(resultado.registros);
  }

  async function buscarPontos() {
    setErro("");
    setCarregando(true);
    try {
      const resultado = await listarPontosColeta(cidade.trim());
      const lista = resultado.pontosColeta;
      setPontos(lista);
      const novasCategorias = Array.from(new Set(lista.flatMap((ponto: Ponto) => ponto.categoriasAceitas))).sort((a, b) => a.localeCompare(b, "pt-BR"));
      setCategorias(novasCategorias);
      setCategoria(atual => novasCategorias.includes(atual) ? atual : novasCategorias[0] ?? "");
      setPontoSelecionado("");
      if (!lista.length) setAviso("Não encontramos pontos verificados nessa cidade. Confira o nome da cidade ou tente outra.");
    } catch {
      setErro("Não foi possível carregar os pontos verificados. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const resultados = await Promise.all([
          podeLer ? listarMeusDescartes() : Promise.resolve({ registros: [] }),
          podeRevisar ? listarDescartesGestao(filtroStatus) : Promise.resolve({ registros: [] }),
        ]);
        if (!ativo) return;
        setMeusRegistros(resultados[0].registros);
        setFila(resultados[1].registros);
      } catch {
        if (ativo) setErro("Não foi possível carregar os registros de descarte.");
      }
    }
    void carregar();
    return () => { ativo = false; };
  }, [podeLer, podeRevisar, filtroStatus]);

  const pontosDaCategoria = useMemo(() => pontos.filter(ponto => !categoria || ponto.categoriasAceitas.some((item: string) => normalizar(item) === normalizar(categoria))), [pontos, categoria]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!pontoSelecionado || !categoria) return;
    setIdProcessando("novo"); setErro(""); setAviso("");
    try {
      const resultado = await registrarDescarte(pontoSelecionado, categoria, relato);
      if (!resultado.operacaoAceita) throw new Error(resultado.mensagemResultado || "O registro não foi aceito.");
      setAviso("Registro enviado. Os 20 pontos serão creditados somente se a equipe aprovar o relato.");
      setRelato(""); setPontoSelecionado("");
      await carregarMeus();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar o registro.");
    } finally { setIdProcessando(""); }
  }

  async function decidir(id: string, status: "aprovado" | "rejeitado") {
    setIdProcessando(id); setErro(""); setAviso("");
    try {
      const resultado = await revisarDescarte(id, status);
      if (!resultado.operacaoAceita) throw new Error(resultado.mensagemResultado || "A revisão não foi aplicada.");
      setAviso(resultado.mensagemResultado);
      await Promise.all([carregarFila(), carregarMeus()]);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir a revisão.");
    } finally { setIdProcessando(""); }
  }

  if (!podeRegistrar && !podeLer && !podeRevisar) return null;

  return <section className="space-y-5">
    <header className="rounded-[24px] bg-[#e8f3df] p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#397649]">Ação ambiental validada</p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-[#17362a]">Registro de descarte correto</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f7967]">Escolha um ponto verificado que aceite a categoria informada. Cada registro aprovado vale 20 pontos e pode contar para desafios. A equipe analisa o relato; a plataforma não comprova automaticamente a entrega física do material.</p>
    </header>

    {erro ? <p role="alert" className="rounded-xl border border-[#f1c9c0] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">{erro}</p> : null}
    {aviso ? <p role="status" className="rounded-xl border border-[#cde5cf] bg-[#eff8ee] px-4 py-3 text-sm font-semibold text-[#28764e]">{aviso}</p> : null}

    {podeRegistrar ? <form onSubmit={enviar} className="space-y-4 rounded-[22px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)]">
      <h3 className="font-black text-[#17362a]">Declarar um descarte</h3>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="block text-xs font-bold text-[#587261]">Cidade dos pontos<input required maxLength={120} className={`${inputClass} mt-1.5`} value={cidade} onChange={evento => setCidade(evento.target.value)} placeholder="Ex.: João Pessoa" /></label>
        <button type="button" disabled={carregando || !cidade.trim()} onClick={() => void buscarPontos()} className={`${secondary} self-end min-h-11`}>{carregando ? "Buscando…" : "Buscar pontos verificados"}</button>
      </div>
      {pontos.length ? <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-bold text-[#587261]">Categoria<select required className={`${inputClass} mt-1.5`} value={categoria} onChange={evento => { setCategoria(evento.target.value); setPontoSelecionado(""); }}><option value="">Selecione</option>{categorias.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="block text-xs font-bold text-[#587261]">Ponto que recebe essa categoria<select required className={`${inputClass} mt-1.5`} value={pontoSelecionado} onChange={evento => setPontoSelecionado(evento.target.value)}><option value="">Selecione</option>{pontosDaCategoria.map(ponto => <option key={ponto.idPontoColeta} value={ponto.idPontoColeta}>{ponto.nomePontoColeta} · {ponto.enderecoPontoColeta}</option>)}</select></label>
      </div> : <p className="text-xs text-[#82978a]">Busque pontos verificados para escolher um destino compatível.</p>}
      <label className="block text-xs font-bold text-[#587261]">Relato para a equipe revisora<textarea maxLength={500} className={`${inputClass} mt-1.5 min-h-20 resize-y`} value={relato} onChange={evento => setRelato(evento.target.value)} placeholder="Descreva brevemente o material e como foi separado (opcional)." /></label>
      <button type="submit" disabled={!pontoSelecionado || !categoria || idProcessando === "novo"} className={primary}>{idProcessando === "novo" ? "Enviando…" : "Enviar para validação"}</button>
    </form> : null}

    {podeLer ? <section className="rounded-[22px] border border-[#e1ebe2] bg-white p-5">
      <h3 className="font-black text-[#17362a]">Meus registros</h3>
      <div className="mt-3 space-y-2">{meusRegistros.map(registro => <article key={registro.idRegistro} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7faf6] p-3.5"><div><strong className="text-sm text-[#244637]">{registro.categoriaMaterial} · {registro.nomePontoColeta}</strong><p className="mt-1 text-xs text-[#718579]">{registro.cidadePontoColeta} · {formatarData(registro.dataRegistro)}{registro.relato ? ` · ${registro.relato}` : ""}</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${registro.status === "aprovado" ? "bg-[#e7f4e6] text-[#27764d]" : registro.status === "rejeitado" ? "bg-[#f9e9e5] text-[#a85040]" : "bg-[#fff3d7] text-[#96630d]"}`}>{registro.status}{registro.status === "aprovado" ? " · +20 pts" : ""}</span></article>)}
        {!meusRegistros.length ? <p className="rounded-xl bg-[#f7faf6] p-4 text-sm text-[#718579]">Você ainda não enviou registros de descarte.</p> : null}</div>
    </section> : null}

    {podeRevisar ? <section className="rounded-[22px] border border-[#e1ebe2] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.13em] text-[#62806c]">Fila de revisão</p><h3 className="mt-1 font-black text-[#17362a]">Registros de descarte</h3></div><select className={`${inputClass} max-w-48`} value={filtroStatus} onChange={evento => setFiltroStatus(evento.target.value)}><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="rejeitado">Rejeitados</option><option value="todos">Todos</option></select></div>
      <div className="mt-4 space-y-3">{fila.map(registro => <article key={registro.idRegistro} className="rounded-xl border border-[#e7eee6] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm text-[#244637]">{registro.categoriaMaterial} · {registro.nomePontoColeta}</strong><p className="mt-1 text-xs text-[#718579]">{registro.cidadePontoColeta} · participante {registro.identificadorParticipante} · {formatarData(registro.dataRegistro)}</p><p className="mt-2 text-sm leading-5 text-[#5d7565]">{registro.relato || "Sem relato adicional."}</p></div><span className="rounded-full bg-[#fff3d7] px-3 py-1 text-[10px] font-black uppercase text-[#96630d]">{registro.status}</span></div>{registro.status === "pendente" ? <div className="mt-3 flex gap-2"><button type="button" disabled={Boolean(idProcessando)} onClick={() => void decidir(registro.idRegistro, "aprovado")} className={primary}>{idProcessando === registro.idRegistro ? "Salvando…" : "Aprovar · conceder 20 pts"}</button><button type="button" disabled={Boolean(idProcessando)} onClick={() => void decidir(registro.idRegistro, "rejeitado")} className="rounded-xl border border-[#f1d4cd] px-3 py-2 text-xs font-bold text-[#a85040] hover:bg-[#fff4f0]">Rejeitar</button></div> : registro.status === "aprovado" ? <p className="mt-3 text-xs font-bold text-[#27764d]">20 pontos concedidos · revisado em {formatarData(registro.dataRevisao)}</p> : null}</article>)}
        {!fila.length ? <p className="rounded-xl bg-[#f7faf6] p-4 text-sm text-[#718579]">Nenhum registro encontrado neste filtro.</p> : null}</div>
    </section> : null}
  </section>;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

function formatarData(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "data não informada" : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
