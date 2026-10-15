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
import { Award, Camera, Check, CircleCheck, CircleX, Clock3, Crosshair, Info, LoaderCircle, MapPinned, Plus, Recycle, Search, ShieldCheck, Trophy, X, type LucideIcon } from "lucide-react";
import { Aviso, BarraProgresso, Cartao, ESTILOS, EstadoVazio, Etiqueta, TONS, type TomPagina } from "@/components/pagina/Pagina";

const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;
const TAMANHO_MAXIMO_LOTE = 2.5 * 1024 * 1024;
const PRECISAO_MAXIMA_GPS_METROS = 10;
const TEMPO_MAXIMO_GPS_MS = 30_000;
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
      let idMonitoramento: number | null = null;
      let temporizador: number | undefined;
      let melhorPosicao: GeolocationPosition | null = null;
      let finalizado = false;

      const finalizar = (acao: () => void) => {
        if (finalizado) return;
        finalizado = true;
        if (idMonitoramento !== null) navigator.geolocation.clearWatch(idMonitoramento);
        if (temporizador !== undefined) window.clearTimeout(temporizador);
        acao();
      };

      temporizador = window.setTimeout(() => finalizar(() => {
        const precisao = melhorPosicao?.coords.accuracy;
        reject(new Error(precisao !== undefined
          ? `A melhor precisão reportada após 30 s foi ${precisao.toFixed(0)} m; o limite é 10 m. Ative a localização/GPS do dispositivo, tente ao ar livre ou perto de uma janela e toque novamente.`
          : "Não foi possível obter uma posição em 30 s. Confirme a localização/GPS do dispositivo e tente novamente ao ar livre ou perto de uma janela."));
      }), TEMPO_MAXIMO_GPS_MS);

      try {
        idMonitoramento = navigator.geolocation.watchPosition(posicao => {
          const precisao = posicao.coords.accuracy;
          if (!Number.isFinite(precisao) || precisao <= 0) return;
          if (!melhorPosicao || precisao < melhorPosicao.coords.accuracy) melhorPosicao = posicao;
          if (precisao <= PRECISAO_MAXIMA_GPS_METROS) finalizar(() => resolve(posicao));
        }, erroLocalizacao => {
          if (erroLocalizacao.code === 1) {
            finalizar(() => reject(new Error("A permissão de localização foi negada. Autorize-a no navegador e nas configurações do dispositivo para continuar.")));
          }
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
      } catch {
        finalizar(() => reject(new Error("Não foi possível iniciar o GPS. Confirme a permissão de localização e tente novamente.")));
      }
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

  return <section className="space-y-6" aria-label="Registros de descarte">
    <Cartao icone={Recycle} tom="verde" titulo="Registrar descarte" descricao="Leve o material ao ponto, confirme que você está lá e envie uma foto de cada tipo. Depois da revisão, você ganha pontos.">
      <ol className="grid gap-3 sm:grid-cols-3">
        <PassoGuia numero={1} icone={MapPinned} tom="verde" titulo="Vá até o ponto" texto="Escolha um ponto verificado. Você precisa estar a até 5 m dele." />
        <PassoGuia numero={2} icone={Crosshair} tom="azul" titulo="Confirme o local" texto="Permita a localização e deixe a tela aberta. O GPS leva até 30 s e precisa de precisão de até 10 m." />
        <PassoGuia numero={3} icone={Camera} tom="amarelo" titulo="Envie as fotos" texto="Uma foto por material, em até 30 minutos. Uma pessoa revisa antes de liberar os pontos." />
      </ol>

      {erro || aviso ? <div className="mt-5 space-y-3">
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
        {aviso ? <Aviso tipo="sucesso">{aviso}</Aviso> : null}
      </div> : null}

      {podeRegistrar ? <div className="mt-6 space-y-6">
        <div className="space-y-4 rounded-[22px] border border-[#e1ebe2] bg-[#fafcf9] p-4 sm:p-5">
          <TituloEtapa numero={1} titulo="Escolha o ponto e confirme que você está lá" />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block min-w-0"><span className={ESTILOS.rotulo}>Cidade</span><input required maxLength={120} className={ESTILOS.campo} value={cidade} onChange={evento => setCidade(evento.target.value)} placeholder="Ex.: João Pessoa" disabled={Boolean(checkin)} /></label>
            <button type="button" disabled={carregando || Boolean(checkin) || !cidade.trim()} onClick={() => void buscarPontos()} className={`${ESTILOS.botaoSecundario} h-12 w-full sm:w-auto`}>
              {carregando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              {carregando ? "Buscando…" : "Buscar pontos verificados"}
            </button>
          </div>
          {pontos.length
            ? <label className="block min-w-0"><span className={ESTILOS.rotulo}>Ponto de coleta</span><select required className={ESTILOS.campo} value={pontoSelecionado} disabled={Boolean(checkin)} onChange={evento => { setPontoSelecionado(evento.target.value); setCategoriasSelecionadas([]); setFotos({}); }}><option value="">Selecione um ponto</option>{pontos.map(ponto => <option key={ponto.idPontoColeta} value={ponto.idPontoColeta}>{ponto.nomePontoColeta} · {ponto.enderecoPontoColeta} · aceita {ponto.categoriasAceitas.join(", ") || "categorias não informadas"}</option>)}</select></label>
            : <p className="flex items-start gap-2 text-sm leading-6 text-[#6c8879]"><Info className="mt-1 h-4 w-4 shrink-0 text-[#1d7953]" aria-hidden="true" />Busque os pontos da sua cidade ou toque em “Iniciar descarte” no cartão de um ponto acima.</p>}
          {pontoAtual ? <div className="flex items-start gap-3 rounded-2xl border border-[#cfe8d8] bg-white p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: TONS.verde.fundo, color: TONS.verde.cor }}><MapPinned className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 text-sm leading-6 text-[#5c7768]">
              <strong className="block break-words font-black text-[#17362a]">{pontoAtual.nomePontoColeta}</strong>
              <span className="block break-words">{pontoAtual.enderecoPontoColeta}, {pontoAtual.cidadePontoColeta}</span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">{pontoAtual.categoriasAceitas.length ? pontoAtual.categoriasAceitas.map(item => <Etiqueta key={item} tom="verde">{item}</Etiqueta>) : <span className="text-xs">Materiais aceitos não informados.</span>}</span>
            </div>
          </div> : null}
          {!checkin
            ? <button type="button" disabled={!pontoAtual || idProcessando === "checkin"} onClick={() => void iniciarCheckin()} className={`${ESTILOS.botaoPrincipal} h-12 w-full disabled:cursor-wait sm:w-auto`}>
              {idProcessando === "checkin" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
              {idProcessando === "checkin" ? "Aguardando o GPS (até 10 m)…" : "Estou no ponto: confirmar localização"}
            </button>
            : <div className="flex flex-col gap-3 rounded-2xl border border-[#cfe3d1] bg-[#f1f9ef] p-4 text-sm text-[#2f6a46] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <strong className="block font-black">Presença confirmada!</strong>
                  <span className="block leading-6">Distância: {checkin.distancia.toFixed(1)} m · precisão do GPS: {checkin.precisao.toFixed(1)} m · vale até {formatarData(checkin.expiraEm)}.</span>
                </div>
              </div>
              <button type="button" className={`${ESTILOS.botaoSecundario} w-full sm:w-auto`} onClick={() => { setCheckin(null); setCategoriasSelecionadas([]); setFotos({}); }}><X className="h-4 w-4" aria-hidden="true" /> Cancelar</button>
            </div>}
        </div>

        {checkin ? <form onSubmit={enviarEvidencias} className="space-y-4 rounded-[22px] border border-[#e1ebe2] bg-[#fafcf9] p-4 sm:p-5">
          <TituloEtapa numero={2} titulo="Envie uma foto de cada material" />
          <p className="text-sm leading-6 text-[#6c8879]">Cada material vira um registro e precisa da sua própria foto (até 5 por vez). Não mostre pessoas, documentos, placas ou outros dados pessoais.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Categorias aceitas pelo ponto">
            {categoriasAceitas.map(categoria => {
              const selecionada = categoriasSelecionadas.includes(categoria);
              return <button key={categoria} type="button" aria-pressed={selecionada} onClick={() => alternarCategoria(categoria)} disabled={!selecionada && categoriasSelecionadas.length >= 5} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-not-allowed disabled:opacity-50 ${selecionada ? "border-[#1d7953] bg-[#1d7953] text-white" : "border-[#d6e2d9] bg-white text-[#45614f] hover:border-[#afd2b3] hover:bg-[#f5faf4]"}`}>{selecionada ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}{categoria}</button>;
            })}
            {!categoriasAceitas.length ? <Aviso tipo="erro">Este ponto não tem categorias aceitas cadastradas; não é possível continuar.</Aviso> : null}
          </div>
          {categoriasSelecionadas.length ? <div className="grid gap-3 md:grid-cols-2">{categoriasSelecionadas.map(categoria => <label key={categoria} className={`block min-w-0 rounded-2xl border bg-white p-4 transition ${fotos[categoria] ? "border-[#cfe3d1]" : "border-dashed border-[#c9d9cd]"}`}>
            <span className="flex items-center gap-2 text-sm font-black text-[#17362a]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: fotos[categoria] ? TONS.verde.fundo : TONS.amarelo.fundo, color: fotos[categoria] ? TONS.verde.cor : TONS.amarelo.cor }}>{fotos[categoria] ? <CircleCheck className="h-4 w-4" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}</span>
              <span className="min-w-0 break-words">Foto — {categoria}</span>
            </span>
            <input required type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={evento => void selecionarFoto(categoria, evento.target.files?.[0])} className="mt-3 block w-full min-w-0 text-xs text-[#5c7768] file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#e6f5ec] file:px-3.5 file:text-sm file:font-bold file:text-[#1d6b43] hover:file:bg-[#d6eedf]" />
            {fotos[categoria] ? <span className="mt-2 block break-words text-xs font-semibold text-[#2f6a46]">Pronta: {fotos[categoria].nomeArquivo} · {(fotos[categoria].bytes.byteLength / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KiB</span> : <span className="mt-2 block text-xs text-[#6c8879]">Tire uma foto nítida do material já separado.</span>}
          </label>)}</div> : null}
          <label className="block"><span className={ESTILOS.rotulo}>Observação <span className="font-semibold text-[#8aa094]">(opcional)</span></span><textarea maxLength={500} className={`${ESTILOS.areaTexto} resize-y`} value={relato} onChange={evento => setRelato(evento.target.value)} placeholder="Descreva brevemente o material (sem dados pessoais)." /></label>
          <div className="space-y-1.5">
            <BarraProgresso percentual={(totalFotosBytes / TAMANHO_MAXIMO_LOTE) * 100} tom={totalFotosBytes > TAMANHO_MAXIMO_LOTE ? "vermelho" : "verde"} rotulo="Espaço usado pelas fotos" />
            <p className="text-xs leading-5 text-[#6c8879]">Fotos: {(totalFotosBytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} de 2.560 KiB. As fotos são otimizadas, sem dados de localização (EXIF), guardadas de forma privada e apagadas em até 90 dias após a revisão.</p>
          </div>
          <button type="submit" disabled={!categoriasSelecionadas.length || fotosPendentes.length > 0 || Boolean(idProcessando)} className={`${ESTILOS.botaoPrincipal} h-12 w-full disabled:cursor-wait sm:w-auto`}>
            {idProcessando === "enviar" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {idProcessando === "enviar" ? "Enviando fotos…" : "Concluir e enviar para revisão"}
          </button>
        </form> : null}

        <p className="flex items-start gap-2 text-xs leading-5 text-[#6c8879]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />A localização vem do navegador e pode ser imprecisa ou manipulada, então a checagem de 5 m não é prova contra fraude. Cada foto é analisada por uma pessoa e não confirma sozinha a entrega do material.</p>
      </div> : null}
    </Cartao>

    {podeLer ? <Cartao icone={Trophy} tom="amarelo" titulo="Meus registros" descricao="Acompanhe seus descartes e os pontos que você já ganhou.">
      {meusRegistros.length ? <ul className="space-y-3">{meusRegistros.map(registro => {
        const status = estiloStatusRegistro(registro.status);
        return <li key={registro.idRegistro} className="rounded-2xl border border-[#e7eee6] bg-[#fafcf9] p-4 transition hover:border-[#cfe8d8]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: TONS.verde.fundo, color: TONS.verde.cor }}><Recycle className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <strong className="block break-words text-sm font-black text-[#17362a]">{registro.categoriaMaterial} · {registro.nomePontoColeta}</strong>
                <p className="mt-0.5 break-words text-xs leading-5 text-[#6c8879]">{registro.cidadePontoColeta} · {formatarData(registro.dataRegistro)}{registro.relato ? ` · ${registro.relato}` : ""}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:shrink-0 sm:justify-end">
              <Etiqueta tom={status.tom} icone={status.icone}>{status.rotulo}</Etiqueta>
              {registro.status === "aprovado" ? <Etiqueta tom="amarelo" icone={Award}>+{registro.pontosConcedidos} pts</Etiqueta> : null}
            </div>
          </div>
          <div className="mt-2 pl-0 sm:pl-[52px]">
            {registro.status === "pendente" ? <p className="text-xs leading-5 text-[#8a5d06]">Aguardando revisão. Os pontos entram depois da aprovação.</p> : null}
            {registro.evidenciaDisponivel ? <FotoRegistro idRegistro={registro.idRegistro} /> : registro.temCheckin ? <p className="mt-1 text-xs leading-5 text-[#6c8879]">A foto já foi apagada, conforme o prazo de guarda.</p> : <p className="mt-1 text-xs leading-5 text-[#8a5d06]">Registro antigo, enviado antes da exigência de check-in e foto.</p>}
          </div>
        </li>;
      })}</ul> : <EstadoVazio icone={Recycle} titulo="Nenhum descarte registrado ainda" descricao="Escolha um ponto de coleta acima e faça seu primeiro registro." />}
    </Cartao> : null}

    {podeRevisar ? <Cartao
      icone={ShieldCheck}
      tom="azul"
      titulo="Revisar descartes"
      descricao="Confira a foto e o check-in antes de aprovar."
      acoes={<select aria-label="Filtrar registros por situação" className={`${ESTILOS.campo} w-full sm:w-48`} value={filtroStatus} onChange={evento => setFiltroStatus(evento.target.value)}><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="rejeitado">Rejeitados</option><option value="todos">Todos</option></select>}
    >
      {fila.length ? <ul className="space-y-3">{fila.map(registro => {
        const status = estiloStatusRegistro(registro.status);
        return <li key={registro.idRegistro} className="rounded-2xl border border-[#e7eee6] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <strong className="block break-words text-sm font-black text-[#17362a]">{registro.categoriaMaterial} · {registro.nomePontoColeta}</strong>
              <p className="mt-0.5 break-words text-xs leading-5 text-[#6c8879]">{registro.cidadePontoColeta} · participante {registro.identificadorParticipante} · {formatarData(registro.dataRegistro)}</p>
            </div>
            <div className="sm:shrink-0"><Etiqueta tom={status.tom} icone={status.icone}>{status.rotulo}</Etiqueta></div>
          </div>
          <p className="mt-3 break-words rounded-xl bg-[#f7faf7] px-3.5 py-2.5 text-sm leading-6 text-[#45614f]">{registro.relato || "Sem observação."}</p>
          {registro.temCheckin ? <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-[#6c8879]"><Crosshair className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Check-in a {registro.distanciaCheckinMetros.toFixed(1)} m do ponto · precisão informada {registro.precisaoCheckinMetros.toFixed(1)} m.</p> : <p className="mt-2 text-xs font-bold text-[#8a5d06]">Registro antigo, sem check-in.</p>}
          {registro.evidenciaDisponivel ? <FotoRegistro idRegistro={registro.idRegistro} /> : <p className="mt-2 text-xs text-[#8a5d06]">Sem foto disponível.</p>}
          {registro.status === "pendente" ? <div className="mt-4 flex flex-col gap-2 border-t border-[#edf2ed] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            {registro.evidenciaDisponivel && registro.temCheckin
              ? <button type="button" disabled={Boolean(idProcessando)} onClick={() => void decidir(registro.idRegistro, "aprovado")} className={`${ESTILOS.botaoPrincipal} w-full disabled:cursor-wait sm:w-auto`}>{idProcessando === registro.idRegistro ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}{idProcessando === registro.idRegistro ? "Salvando…" : "Aprovar · conceder 20 pts"}</button>
              : <p className="text-xs font-semibold leading-5 text-[#8a5d06] sm:flex-1">Este registro antigo não pode gerar pontos sem check-in e foto. Rejeite e oriente a pessoa a enviar de novo.</p>}
            <button type="button" disabled={Boolean(idProcessando)} onClick={() => void decidir(registro.idRegistro, "rejeitado")} className={`${ESTILOS.botaoPerigo} w-full sm:w-auto`}><X className="h-4 w-4" aria-hidden="true" /> Rejeitar</button>
          </div> : registro.status === "aprovado" ? <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#1d6b43]"><Award className="h-4 w-4" aria-hidden="true" />{registro.pontosConcedidos} pontos concedidos · revisado em {formatarData(registro.dataRevisao)}</p> : null}
        </li>;
      })}</ul> : <EstadoVazio icone={ShieldCheck} tom="azul" titulo="Nada por aqui" descricao="Nenhum registro encontrado com este filtro." />}
    </Cartao> : null}
  </section>;
}

function PassoGuia({ numero, icone: Icone, tom, titulo, texto }: { numero: number; icone: LucideIcon; tom: TomPagina; titulo: string; texto: string }) {
  const t = TONS[tom];
  return <li className="flex items-start gap-3 rounded-2xl border bg-white p-4" style={{ borderColor: t.borda }}>
    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: t.fundo, color: t.cor }}>
      <Icone className="h-5 w-5" aria-hidden="true" />
      <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-[11px] font-black text-white" style={{ backgroundColor: t.cor }}>{numero}</span>
    </span>
    <div className="min-w-0">
      <strong className="block text-sm font-black text-[#17362a]">{titulo}</strong>
      <p className="mt-0.5 text-xs leading-5 text-[#6c8879]">{texto}</p>
    </div>
  </li>;
}

function TituloEtapa({ numero, titulo }: { numero: number; titulo: string }) {
  return <h3 className="flex items-center gap-2.5 text-base font-black leading-tight text-[#17362a]">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1d7953] text-sm font-black text-white">{numero}</span>
    {titulo}
  </h3>;
}

function estiloStatusRegistro(status: string): { tom: TomPagina; icone: LucideIcon; rotulo: string } {
  if (status === "aprovado") return { tom: "verde", icone: CircleCheck, rotulo: "Aprovado" };
  if (status === "rejeitado") return { tom: "vermelho", icone: CircleX, rotulo: "Rejeitado" };
  if (status === "pendente") return { tom: "amarelo", icone: Clock3, rotulo: "Em revisão" };
  return { tom: "cinza", icone: Info, rotulo: status };
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

  return <div className="mt-2">
    <button type="button" onClick={() => void carregarFoto()} disabled={carregando} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-[#1d7953] transition hover:bg-[#eef5ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-wait disabled:opacity-60 -ml-2">
      {carregando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
      {carregando ? "Carregando foto…" : url ? "Foto da evidência" : "Ver foto da evidência"}
    </button>
    {erro ? <p role="alert" className="mt-1 text-xs text-[#a8493e]">{erro}</p> : null}
    {url ? <img src={url} alt="Evidência fotográfica privada do material descartado" loading="lazy" className="mt-2 max-h-64 max-w-full rounded-2xl border border-[#e1ebe2] object-contain" /> : null}
  </div>;
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
