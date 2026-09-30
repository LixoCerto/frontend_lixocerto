import { useEffect, useMemo, useState } from "react";
import {
  concluirDescarte,
  iniciarCheckinDescarte,
  listarDescartesGestao,
  listarMeusDescartes,
  listarPontosColeta,
  obterEvidenciaDescarte,
  revisarDescarte,
} from "@/lib/api";

const inputClass = "w-full rounded-xl border border-[#dce8de] bg-white px-3.5 py-3 text-sm text-[#17362a] outline-none transition placeholder:text-[#9aac9f] focus:border-[#5a9a70] focus:ring-2 focus:ring-[#5a9a70]/15";
const primary = "rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#176342] disabled:cursor-wait disabled:opacity-60";
const secondary = "rounded-xl border border-[#dce8de] bg-white px-3 py-2 text-xs font-bold text-[#386348] transition hover:bg-[#f4f8f3] disabled:opacity-50";
const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;
const TAMANHO_MAXIMO_LOTE = 2.5 * 1024 * 1024;
type Registro = Awaited<ReturnType<typeof listarMeusDescartes>>["registros"][number];
type Ponto = Awaited<ReturnType<typeof listarPontosColeta>>["pontosColeta"][number];
type PontoInicial = { idPontoColeta: string; nomePontoColeta: string; cidadePontoColeta: string };
type FotoPreparada = { nomeArquivo: string; bytes: Uint8Array };
type Checkin = { id: string; distancia: number; precisao: number; expiraEm: string };

export default function RegistrosDescarte({
  podeRegistrar,
  podeLer,
  podeRevisar,
  pontoInicial = null,
  onPontoInicialAplicado,
}: {
  podeRegistrar: boolean;
  podeLer: boolean;
  podeRevisar: boolean;
  pontoInicial?: PontoInicial | null;
  onPontoInicialAplicado?: () => void;
}) {
  const [meusRegistros, setMeusRegistros] = useState<Registro[]>([]);
  const [fila, setFila] = useState<Registro[]>([]);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [cidade, setCidade] = useState("João Pessoa");
  const [pontoSelecionado, setPontoSelecionado] = useState("");
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [fotos, setFotos] = useState<Record<string, FotoPreparada>>({});
  const [relato, setRelato] = useState("");
  const [checkin, setCheckin] = useState<Checkin | null>(null);
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

  async function buscarPontos(cidadeBusca = cidade, idInicial = "") {
    setErro("");
    setCarregando(true);
    try {
      const resultado = await listarPontosColeta(cidadeBusca.trim());
      const lista = resultado.pontosColeta;
      setPontos(lista);
      setPontoSelecionado(idInicial && lista.some(ponto => ponto.idPontoColeta === idInicial) ? idInicial : "");
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

  useEffect(() => {
    if (!pontoInicial) return;
    setCidade(pontoInicial.cidadePontoColeta);
    setPontoSelecionado(pontoInicial.idPontoColeta);
    setCheckin(null);
    setCategoriasSelecionadas([]);
    setFotos({});
    setErro("");
    setAviso(`Destino selecionado: ${pontoInicial.nomePontoColeta}. Autorize a geolocalização no local para iniciar.`);
    void buscarPontos(pontoInicial.cidadePontoColeta, pontoInicial.idPontoColeta);
    onPontoInicialAplicado?.();
  }, [pontoInicial?.idPontoColeta]);

  const pontoAtual = useMemo(() => pontos.find(ponto => ponto.idPontoColeta === pontoSelecionado), [pontos, pontoSelecionado]);
  const categoriasAceitas = pontoAtual?.categoriasAceitas ?? [];
  const totalFotosBytes = Object.values(fotos).reduce((total, foto) => total + foto.bytes.byteLength, 0);
  const fotosPendentes = categoriasSelecionadas.filter(categoria => !fotos[categoria]);

  function obterLocalizacao(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Este navegador não disponibiliza geolocalização. Tente em um navegador compatível e com conexão segura (HTTPS)."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, erroLocalizacao => {
        reject(new Error(erroLocalizacao.code === 1
          ? "A permissão de localização foi negada. Autorize-a no navegador para continuar."
          : erroLocalizacao.code === 3
            ? "A localização demorou demais. Tente novamente ao ar livre ou perto de uma janela."
            : "Não foi possível obter uma localização precisa. Ative o GPS e tente novamente."));
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 25_000 });
    });
  }

  async function iniciarCheckin() {
    if (!pontoAtual) return;
    setIdProcessando("checkin"); setErro(""); setAviso("");
    try {
      const posicao = await obterLocalizacao();
      const resposta = await iniciarCheckinDescarte({
        idPontoColeta: pontoAtual.idPontoColeta,
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        precisaoMetros: posicao.coords.accuracy,
      });
      if (!resposta.operacaoAceita || !resposta.idCheckin) throw new Error(resposta.mensagemResultado || "Check-in não validado.");
      setCheckin({ id: resposta.idCheckin, distancia: resposta.distanciaMetros, precisao: resposta.precisaoMetros, expiraEm: resposta.dataExpiracao });
      setCategoriasSelecionadas([]); setFotos({});
      setAviso(`Check-in validado a ${resposta.distanciaMetros.toFixed(1)} m do ponto. Você tem 30 minutos para concluir.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível iniciar o check-in.");
    } finally { setIdProcessando(""); }
  }

  function alternarCategoria(categoria: string) {
    setCategoriasSelecionadas(atual => atual.includes(categoria)
      ? atual.filter(item => item !== categoria)
      : atual.length >= 5 ? atual : [...atual, categoria]);
    setFotos(atual => {
      const novas = { ...atual };
      if (categoriasSelecionadas.includes(categoria)) delete novas[categoria];
      return novas;
    });
  }

  async function selecionarFoto(categoria: string, arquivo?: File) {
    if (!arquivo) return;
    setErro("");
    try {
      const bytes = await comprimirFoto(arquivo);
      const tamanhoAtualSemCategoria = Object.entries(fotos).reduce((total, [chave, foto]) => total + (chave === categoria ? 0 : foto.bytes.byteLength), 0);
      if (bytes.byteLength > TAMANHO_MAXIMO_FOTO) throw new Error("Esta foto ainda está grande. Escolha outra imagem com até 2 MiB após compressão.");
      if (tamanhoAtualSemCategoria + bytes.byteLength > TAMANHO_MAXIMO_LOTE) throw new Error("O conjunto de fotos pode ter no máximo 2,5 MiB. Remova ou reduza outra imagem.");
      setFotos(atual => ({ ...atual, [categoria]: { nomeArquivo: arquivo.name, bytes } }));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível processar essa foto.");
    }
  }

  async function enviarEvidencias(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!checkin || categoriasSelecionadas.length === 0 || fotosPendentes.length) {
      setErro("Selecione ao menos uma categoria e inclua uma foto correspondente para cada uma.");
      return;
    }
    if (totalFotosBytes > TAMANHO_MAXIMO_LOTE) {
      setErro("O conjunto de fotos pode ter no máximo 2,5 MiB.");
      return;
    }
    setIdProcessando("enviar"); setErro(""); setAviso("");
    try {
      const resposta = await concluirDescarte(checkin.id, categoriasSelecionadas.map(categoria => ({
        categoriaMaterial: categoria,
        foto: fotos[categoria].bytes,
        relato,
      })));
      if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "Não foi possível concluir o descarte.");
      setAviso(`${resposta.registros.length} ${resposta.registros.length === 1 ? "registro enviado" : "registros enviados"} para revisão. Pontos só serão concedidos após aprovação.`);
      setCheckin(null); setCategoriasSelecionadas([]); setFotos({}); setRelato("");
      await Promise.all([carregarMeus(), carregarFila()]);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar as evidências.");
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
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#397649]">Check-in e evidência por categoria</p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-[#17362a]">Iniciar descarte no ponto escolhido</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f7967]">1. No local, permita a geolocalização de alta precisão: o servidor exige distância de até 5 m e precisão do GPS de até 10 m. 2. Selecione cada categoria e anexe uma foto própria do material separado. O check-in dura 30 minutos; os pontos continuam sujeitos à revisão humana.</p>
    </header>

    {erro ? <p role="alert" className="rounded-xl border border-[#f1c9c0] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">{erro}</p> : null}
    {aviso ? <p role="status" className="rounded-xl border border-[#cde5cf] bg-[#eff8ee] px-4 py-3 text-sm font-semibold text-[#28764e]">{aviso}</p> : null}

    {podeRegistrar ? <section className="space-y-4 rounded-[22px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)]">
      <h3 className="font-black text-[#17362a]">Etapa 1 — selecionar o destino e confirmar presença</h3>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="block text-xs font-bold text-[#587261]">Cidade dos pontos<input required maxLength={120} className={`${inputClass} mt-1.5`} value={cidade} onChange={evento => setCidade(evento.target.value)} placeholder="Ex.: João Pessoa" disabled={Boolean(checkin)} /></label>
        <button type="button" disabled={carregando || Boolean(checkin) || !cidade.trim()} onClick={() => void buscarPontos()} className={`${secondary} self-end min-h-11`}>{carregando ? "Buscando…" : "Buscar pontos verificados"}</button>
      </div>
      {pontos.length ? <label className="block text-xs font-bold text-[#587261]">Ponto de coleta verificado<select required className={`${inputClass} mt-1.5`} value={pontoSelecionado} disabled={Boolean(checkin)} onChange={evento => { setPontoSelecionado(evento.target.value); setCategoriasSelecionadas([]); setFotos({}); }}><option value="">Selecione um ponto</option>{pontos.map(ponto => <option key={ponto.idPontoColeta} value={ponto.idPontoColeta}>{ponto.nomePontoColeta} · {ponto.enderecoPontoColeta} · aceita {ponto.categoriasAceitas.join(", ") || "categorias não informadas"}</option>)}</select></label> : <p className="text-xs text-[#82978a]">Busque pontos verificados ou use “Iniciar descarte” no cartão do local escolhido.</p>}
      {pontoAtual ? <div className="rounded-xl bg-[#f5f9f3] p-3 text-xs leading-5 text-[#5f7967]"><strong>{pontoAtual.nomePontoColeta}</strong> · {pontoAtual.enderecoPontoColeta}, {pontoAtual.cidadePontoColeta}. Categorias aceitas: {pontoAtual.categoriasAceitas.join(", ") || "não informadas"}.</div> : null}
      {!checkin ? <button type="button" disabled={!pontoAtual || idProcessando === "checkin"} onClick={() => void iniciarCheckin()} className={primary}>{idProcessando === "checkin" ? "Obtendo localização precisa…" : "Usar minha localização e iniciar check-in"}</button> : <div className="rounded-xl border border-[#cde5cf] bg-[#eff8ee] p-3 text-sm text-[#28764e]"><strong>Check-in ativo</strong> · distância verificada: {checkin.distancia.toFixed(1)} m · precisão GPS: {checkin.precisao.toFixed(1)} m · expira {formatarData(checkin.expiraEm)}.<button type="button" className="ml-3 font-bold underline" onClick={() => { setCheckin(null); setCategoriasSelecionadas([]); setFotos({}); }}>Cancelar</button></div>}

      {checkin ? <form onSubmit={enviarEvidencias} className="space-y-4 border-t border-[#e8efe7] pt-4">
        <h3 className="font-black text-[#17362a]">Etapa 2 — separar as fotos por categoria</h3>
        <p className="text-xs leading-5 text-[#6b8474]">Cada categoria gera um registro próprio e exige uma foto correspondente. Máximo de 5 categorias por check-in. Não inclua pessoas, documentos, placas ou outros dados pessoais na imagem.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categorias aceitas pelo ponto">
          {categoriasAceitas.map(categoria => <button key={categoria} type="button" aria-pressed={categoriasSelecionadas.includes(categoria)} onClick={() => alternarCategoria(categoria)} disabled={!categoriasSelecionadas.includes(categoria) && categoriasSelecionadas.length >= 5} className={`min-h-10 rounded-full px-3 py-2 text-xs font-black ${categoriasSelecionadas.includes(categoria) ? "bg-[#1d7953] text-white" : "bg-[#edf3ed] text-[#5d796a]"}`}>{categoria}</button>)}
          {!categoriasAceitas.length ? <p className="text-sm text-[#a85040]">Este ponto não tem categorias aceitas cadastradas; não é possível continuar.</p> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">{categoriasSelecionadas.map(categoria => <label key={categoria} className="block rounded-xl border border-[#e2ece2] bg-[#fbfdfb] p-3 text-xs font-bold text-[#587261]">Foto — {categoria}<input required type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={evento => void selecionarFoto(categoria, evento.target.files?.[0])} className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#e8f3df] file:px-3 file:py-2 file:font-black file:text-[#286743]" />{fotos[categoria] ? <span className="mt-2 block text-[#28764e]">Foto otimizada: {fotos[categoria].nomeArquivo} · {(fotos[categoria].bytes.byteLength / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KiB</span> : <span className="mt-2 block text-[#82978a]">Use uma foto nítida do material já separado.</span>}</label>)}</div>
        <label className="block text-xs font-bold text-[#587261]">Observação opcional<textarea maxLength={500} className={`${inputClass} mt-1.5 min-h-20 resize-y`} value={relato} onChange={evento => setRelato(evento.target.value)} placeholder="Descreva brevemente o material (não inclua dados pessoais)." /></label>
        <p className="text-xs text-[#718579]">Tamanho total das fotos: {(totalFotosBytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} / 2.560 KiB · Fotos normalizadas, sem EXIF, armazenadas em volume privado e eliminadas em até 90 dias após a decisão.</p>
        <button type="submit" disabled={!categoriasSelecionadas.length || fotosPendentes.length > 0 || Boolean(idProcessando)} className={primary}>{idProcessando === "enviar" ? "Enviando evidências…" : "Concluir e enviar para revisão"}</button>
      </form> : null}
      <p className="text-[11px] leading-5 text-[#82978a]">A localização vem do navegador e pode ser imprecisa ou manipulada; a checagem de 5 m não é prova antifraude. A foto é analisada por pessoa revisora e não confirma automaticamente a entrega física.</p>
    </section> : null}

    {podeLer ? <section className="rounded-[22px] border border-[#e1ebe2] bg-white p-5">
      <h3 className="font-black text-[#17362a]">Meus registros</h3>
      <div className="mt-3 space-y-2">{meusRegistros.map(registro => <article key={registro.idRegistro} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7faf6] p-3.5"><div className="min-w-0"><strong className="text-sm text-[#244637]">{registro.categoriaMaterial} · {registro.nomePontoColeta}</strong><p className="mt-1 text-xs text-[#718579]">{registro.cidadePontoColeta} · {formatarData(registro.dataRegistro)}{registro.relato ? ` · ${registro.relato}` : ""}</p>{registro.status === "pendente" ? <p className="mt-1 text-xs text-[#96630d]">Aguardando validação; nenhum ponto foi creditado ainda.</p> : null}{registro.evidenciaDisponivel ? <FotoRegistro idRegistro={registro.idRegistro} /> : registro.temCheckin ? <p className="mt-2 text-xs text-[#82978a]">Foto já expirada conforme a política de retenção.</p> : <p className="mt-2 text-xs text-[#96630d]">Registro legado, enviado antes da exigência de check-in e foto.</p>}</div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${registro.status === "aprovado" ? "bg-[#e7f4e6] text-[#27764d]" : registro.status === "rejeitado" ? "bg-[#f9e9e5] text-[#a85040]" : "bg-[#fff3d7] text-[#96630d]"}`}>{registro.status}{registro.status === "aprovado" ? ` · +${registro.pontosConcedidos} pts` : ""}</span></article>)}
        {!meusRegistros.length ? <p className="rounded-xl bg-[#f7faf6] p-4 text-sm text-[#718579]">Você ainda não enviou registros de descarte.</p> : null}</div>
    </section> : null}

    {podeRevisar ? <section className="rounded-[22px] border border-[#e1ebe2] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.13em] text-[#62806c]">Fila de revisão</p><h3 className="mt-1 font-black text-[#17362a]">Registros de descarte</h3></div><select className={`${inputClass} max-w-48`} value={filtroStatus} onChange={evento => setFiltroStatus(evento.target.value)}><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="rejeitado">Rejeitados</option><option value="todos">Todos</option></select></div>
      <div className="mt-4 space-y-3">{fila.map(registro => <article key={registro.idRegistro} className="rounded-xl border border-[#e7eee6] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><strong className="text-sm text-[#244637]">{registro.categoriaMaterial} · {registro.nomePontoColeta}</strong><p className="mt-1 text-xs text-[#718579]">{registro.cidadePontoColeta} · participante {registro.identificadorParticipante} · {formatarData(registro.dataRegistro)}</p><p className="mt-2 text-sm leading-5 text-[#5d7565]">{registro.relato || "Sem relato adicional."}</p>{registro.temCheckin ? <p className="mt-1 text-xs text-[#718579]">Check-in: {registro.distanciaCheckinMetros.toFixed(1)} m do ponto · precisão informada {registro.precisaoCheckinMetros.toFixed(1)} m.</p> : <p className="mt-1 text-xs font-bold text-[#96630d]">Registro legado sem check-in.</p>}{registro.evidenciaDisponivel ? <FotoRegistro idRegistro={registro.idRegistro} /> : <p className="mt-2 text-xs text-[#96630d]">Sem foto disponível.</p>}</div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${registro.status === "aprovado" ? "bg-[#e7f4e6] text-[#27764d]" : registro.status === "rejeitado" ? "bg-[#f9e9e5] text-[#a85040]" : "bg-[#fff3d7] text-[#96630d]"}`}>{registro.status}</span></div>{registro.status === "pendente" ? <div className="mt-3 flex flex-wrap gap-2">{registro.evidenciaDisponivel && registro.temCheckin ? <button type="button" disabled={Boolean(idProcessando)} onClick={() => void decidir(registro.idRegistro, "aprovado")} className={primary}>{idProcessando === registro.idRegistro ? "Salvando…" : "Aprovar · conceder 20 pts"}</button> : <p className="self-center text-xs font-semibold text-[#96630d]">Este registro anterior não pode gerar pontos sem check-in e evidência; rejeite e oriente um novo envio pelo fluxo atual.</p>}<button type="button" disabled={Boolean(idProcessando)} onClick={() => void decidir(registro.idRegistro, "rejeitado")} className="rounded-xl border border-[#f1d4cd] px-3 py-2 text-xs font-bold text-[#a85040] hover:bg-[#fff4f0]">Rejeitar</button></div> : registro.status === "aprovado" ? <p className="mt-3 text-xs font-bold text-[#27764d]">{registro.pontosConcedidos} pontos concedidos · revisado em {formatarData(registro.dataRevisao)}</p> : null}</article>)}
        {!fila.length ? <p className="rounded-xl bg-[#f7faf6] p-4 text-sm text-[#718579]">Nenhum registro encontrado neste filtro.</p> : null}</div>
    </section> : null}
  </section>;
}

function FotoRegistro({ idRegistro }: { idRegistro: string }) {
  const [url, setUrl] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function carregarFoto() {
    if (url) return;
    setCarregando(true); setErro("");
    try {
      const resposta = await obterEvidenciaDescarte(idRegistro);
      if (!resposta.evidenciaDisponivel || !resposta.fotoWebp.byteLength) throw new Error("Foto indisponível ou já removida pela política de retenção.");
      const bytes = new Uint8Array(resposta.fotoWebp.byteLength);
      bytes.set(resposta.fotoWebp);
      setUrl(URL.createObjectURL(new Blob([bytes.buffer], { type: resposta.tipoConteudo || "image/webp" })));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir a foto.");
    } finally { setCarregando(false); }
  }

  return <div className="mt-2"><button type="button" onClick={() => void carregarFoto()} disabled={carregando} className="text-xs font-bold text-[#1d7953] underline disabled:opacity-60">{carregando ? "Carregando foto…" : url ? "Foto da evidência" : "Ver foto da evidência"}</button>{erro ? <p role="alert" className="mt-1 text-xs text-[#a85040]">{erro}</p> : null}{url ? <img src={url} alt="Evidência fotográfica privada do material descartado" loading="lazy" className="mt-2 max-h-64 max-w-full rounded-lg border border-[#e1ebe2] object-contain" /> : null}</div>;
}

async function comprimirFoto(arquivo: File): Promise<Uint8Array> {
  if (!/^image\/(jpeg|png|webp)$/i.test(arquivo.type)) throw new Error("Use uma foto JPEG, PNG ou WebP.");
  const imagem = await createImageBitmap(arquivo);
  try {
    if (!imagem.width || !imagem.height || imagem.width * imagem.height > 20_000_000) throw new Error("Esta imagem excede o limite de resolução suportado.");
    const escala = Math.min(1, 1600 / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(imagem.width * escala));
    canvas.height = Math.max(1, Math.round(imagem.height * escala));
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("O navegador não pôde processar essa imagem.");
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(resultado => resultado ? resolve(resultado) : reject(new Error("A foto não pôde ser otimizada.")), "image/jpeg", 0.78));
    if (blob.size > TAMANHO_MAXIMO_FOTO) throw new Error("A foto otimizada excede 2 MiB. Escolha uma imagem menor.");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    imagem.close();
  }
}

function formatarData(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "data não informada" : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
