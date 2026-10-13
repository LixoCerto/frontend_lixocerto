import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  Crosshair,
  ExternalLink,
  Clock3,
  LoaderCircle,
  MapPinned,
  Pencil,
  Plus,
  Recycle,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { distanciaEmKm } from "@/lib/geo";
import { registrarAcaoOnboarding } from "@/lib/onboarding";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  alterarStatusPontoColeta,
  atualizarPontoColeta,
  buscarEnderecoPorCoordenadas,
  criarPontoColeta,
  excluirPontoColeta,
  listarPontosColeta,
} from "@/lib/api";
import { buscarCepViaCep, cepCompleto, formatarCep, montarEnderecoCep, normalizarCep } from "@/lib/cep";

type Ponto = {
  idPontoColeta: string;
  nomePontoColeta: string;
  enderecoPontoColeta: string;
  cepPontoColeta: string;
  cidadePontoColeta: string;
  estadoPontoColeta: string;
  latitudePontoColeta: number;
  longitudePontoColeta: number;
  distanciaKm?: number;
  statusVerificacao: string;
  categoriasAceitas: string[];
  horarioFuncionamento: string;
  telefoneContato: string;
  urlInformacoes: string;
  dataVerificacao: string;
};
type FiltroPontos = {
  cidade: string;
  categoria: string;
  localizacao: { latitude: number; longitude: number } | null;
  raioKm: number;
};
type Dados = Omit<Ponto, "idPontoColeta" | "statusVerificacao" | "dataVerificacao">;

const vazio: Dados = {
  nomePontoColeta: "",
  enderecoPontoColeta: "",
  cepPontoColeta: "",
  cidadePontoColeta: "João Pessoa",
  estadoPontoColeta: "PB",
  latitudePontoColeta: 0,
  longitudePontoColeta: 0,
  categoriasAceitas: [],
  horarioFuncionamento: "",
  telefoneContato: "",
  urlInformacoes: "",
};
const materiais = ["Recicláveis", "Eletroeletrônicos", "Orgânicos", "Óleo de cozinha", "Pilhas e baterias"];
const rotulosStatus: Record<string, string> = {
  verificado: "Verificado",
  pendente: "Aguardando validação",
  rejeitado: "Não aprovado",
  expirado: "Precisa de atualização",
};

export default function PontosColetaCrud({
  podeEscrever,
  podeAprovar,
  podeRegistrar,
  permiteLocalizacaoBusca = true,
  categoriaInicial = "",
  onIniciarDescarte,
}: {
  podeEscrever: boolean;
  podeAprovar: boolean;
  podeRegistrar: boolean;
  permiteLocalizacaoBusca?: boolean;
  categoriaInicial?: string;
  onIniciarDescarte: (ponto: Pick<Ponto, "idPontoColeta" | "nomePontoColeta" | "cidadePontoColeta">) => void;
}) {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [dados, setDados] = useState<Dados>(vazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [cidadeBusca, setCidadeBusca] = useState("João Pessoa");
  const [localizacaoBusca, setLocalizacaoBusca] = useState<{ latitude: number; longitude: number } | null>(null);
  const [raioKm, setRaioKm] = useState(10);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltroPontos>({
    cidade: "João Pessoa",
    categoria: categoriaInicial,
    localizacao: null,
    raioKm: 10,
  });
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [localizandoBusca, setLocalizandoBusca] = useState(false);
  const idConsultaCep = useRef(0);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await listarPontosColeta(
        filtrosAplicados.localizacao ? "" : filtrosAplicados.cidade,
        filtrosAplicados.categoria,
        filtrosAplicados.localizacao ? { ...filtrosAplicados.localizacao, raioMetros: filtrosAplicados.raioKm * 1000 } : undefined,
      );
      const pontosCarregados = resposta.pontosColeta.map(ponto => ({
        ...ponto,
        cepPontoColeta: formatarCep(ponto.cepPontoColeta),
        distanciaKm: filtrosAplicados.localizacao ? distanciaEmKm(filtrosAplicados.localizacao, { latitude: ponto.latitudePontoColeta, longitude: ponto.longitudePontoColeta }) ?? undefined : undefined,
      }));
      if (filtrosAplicados.localizacao) pontosCarregados.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
      setPontos(pontosCarregados);
    } catch {
      setErro("Não foi possível carregar os pontos de coleta.");
    } finally {
      setCarregando(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function atualizar<K extends keyof Dados>(campo: K, valor: Dados[K]) {
    setDados(atual => ({ ...atual, [campo]: valor }));
  }

  function buscarPertoDeMim() {
    if (!navigator.geolocation) {
      setErro("Este navegador não oferece busca por localização. Você ainda pode pesquisar por cidade.");
      return;
    }
    setErro(null);
    setMensagem(null);
    setLocalizandoBusca(true);
    navigator.geolocation.getCurrentPosition(
      posicao => {
        const coordenadas = {
          latitude: Number(posicao.coords.latitude.toFixed(7)),
          longitude: Number(posicao.coords.longitude.toFixed(7)),
        };
        setLocalizacaoBusca(coordenadas);
        setCidadeBusca("");
        setFiltrosAplicados({ cidade: "", categoria, localizacao: coordenadas, raioKm });
        setMensagem("Localização recebida. Os pontos serão filtrados pelo raio escolhido e ordenados pelos mais próximos.");
        setLocalizandoBusca(false);
      },
      erroLocalizacao => {
        setErro(erroLocalizacao.code === 1
          ? "A localização não foi autorizada. Você ainda pode pesquisar por cidade."
          : "Não foi possível obter sua localização. Você ainda pode pesquisar por cidade.");
        setLocalizandoBusca(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  function aplicarFiltros() {
    const cidade = cidadeBusca.trim();
    if (!localizacaoBusca && cidade.length < 2) {
      setMensagem(null);
      setErro("Informe uma cidade com pelo menos dois caracteres para pesquisar.");
      return;
    }
    setErro(null);
    setMensagem(null);
    setFiltrosAplicados({
      cidade: localizacaoBusca ? "" : cidade,
      categoria,
      localizacao: localizacaoBusca,
      raioKm,
    });
    if (!localizacaoBusca) registrarAcaoOnboarding("pesquisar_pontos");
  }

  async function buscarCep(valor = dados.cepPontoColeta) {
    const cep = normalizarCep(valor);
    if (cep.length !== 8) {
      setErro("Informe um CEP completo com oito dígitos.");
      return;
    }

    const idAtual = ++idConsultaCep.current;
    setConsultandoCep(true);
    setErro(null);
    setMensagem(null);
    try {
      const endereco = await buscarCepViaCep(cep);
      if (idAtual !== idConsultaCep.current) return;
      if (!endereco) {
        setErro("CEP não encontrado. Confira os números ou preencha o endereço manualmente.");
        return;
      }
      setDados(atual => {
        if (normalizarCep(atual.cepPontoColeta) !== cep) return atual;
        return {
          ...atual,
          cepPontoColeta: formatarCep(endereco.cep || cep),
          enderecoPontoColeta: montarEnderecoCep(endereco) || atual.enderecoPontoColeta,
          cidadePontoColeta: endereco.localidade || atual.cidadePontoColeta,
          estadoPontoColeta: endereco.uf || atual.estadoPontoColeta,
        };
      });
      setMensagem("Endereço preenchido pelo ViaCEP. Confira os dados antes de salvar.");
    } catch {
      if (idAtual === idConsultaCep.current) {
        setErro("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.");
      }
    } finally {
      if (idAtual === idConsultaCep.current) setConsultandoCep(false);
    }
  }

  function alterarCep(valor: string) {
    const cepAnterior = normalizarCep(dados.cepPontoColeta);
    const cepFormatado = formatarCep(valor);
    atualizar("cepPontoColeta", cepFormatado);
    if (normalizarCep(cepFormatado).length === 8 && cepAnterior.length < 8) {
      void buscarCep(cepFormatado);
    }
  }

  function localizar() {
    if (!navigator.geolocation) {
      setErro("Este navegador não oferece geolocalização.");
      return;
    }
    setErro(null);
    setMensagem(null);
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async posicao => {
        const latitude = Number(posicao.coords.latitude.toFixed(7));
        const longitude = Number(posicao.coords.longitude.toFixed(7));
        setDados(atual => ({ ...atual, latitudePontoColeta: latitude, longitudePontoColeta: longitude }));

        try {
          const reverso = await buscarEnderecoPorCoordenadas(latitude, longitude);
          if (!reverso.encontrado) {
            setMensagem("Coordenadas capturadas. O serviço gratuito não encontrou endereço/CEP para este local; você ainda pode preencher os campos manualmente.");
            return;
          }

          const cepReverso = normalizarCep(reverso.cepPontoColeta);
          let dadosCep = null;
          if (cepReverso.length === 8) {
            try {
              dadosCep = await buscarCepViaCep(cepReverso);
            } catch {
              // Mantém os dados parciais fornecidos pela geocodificação reversa.
            }
          }

          setDados(atual => ({
            ...atual,
            latitudePontoColeta: latitude,
            longitudePontoColeta: longitude,
            cepPontoColeta: cepReverso.length === 8 ? formatarCep(cepReverso) : "",
            enderecoPontoColeta: reverso.enderecoPontoColeta || (dadosCep ? montarEnderecoCep(dadosCep) : "") || atual.enderecoPontoColeta,
            cidadePontoColeta: dadosCep?.localidade || reverso.cidadePontoColeta || atual.cidadePontoColeta,
            estadoPontoColeta: dadosCep?.uf || reverso.estadoPontoColeta || atual.estadoPontoColeta,
          }));
          setMensagem("Localização e endereço sugeridos preenchidos. Confira o CEP e o endereço antes de salvar; a sugestão pode ser aproximada.");
        } catch {
          setMensagem("Coordenadas capturadas, mas não foi possível consultar o endereço agora. Preencha CEP/endereço manualmente.");
        } finally {
          setLocalizando(false);
        }
      },
      () => {
        setErro("Não foi possível obter sua localização. Permita o acesso e tente novamente.");
        setLocalizando(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function abrirNovo() {
    setEditando(null);
    setDados(vazio);
    setAberto(true);
    setMensagem(null);
    setErro(null);
  }

  function abrirEdicao(ponto: Ponto) {
    setEditando(ponto.idPontoColeta);
    setDados({ ...ponto, cepPontoColeta: formatarCep(ponto.cepPontoColeta) });
    setAberto(true);
    setMensagem(null);
    setErro(null);
  }

  function alternarCategoria(valor: string) {
    atualizar(
      "categoriasAceitas",
      dados.categoriasAceitas.includes(valor)
        ? dados.categoriasAceitas.filter(item => item !== valor)
        : [...dados.categoriasAceitas, valor],
    );
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);
    if (!dados.nomePontoColeta.trim() || !dados.enderecoPontoColeta.trim() || !dados.cidadePontoColeta.trim() || dados.latitudePontoColeta === 0 || dados.longitudePontoColeta === 0) {
      setErro("Preencha os dados obrigatórios e capture uma localização válida.");
      return;
    }
    if (dados.cepPontoColeta && !cepCompleto(dados.cepPontoColeta)) {
      setErro("O CEP deve conter oito dígitos.");
      return;
    }
    try {
      const resposta = editando
        ? await atualizarPontoColeta(editando, dados)
        : await criarPontoColeta(dados);
      setMensagem(resposta.mensagemResultado);
      setAberto(false);
      await carregar();
    } catch {
      setErro("Não foi possível salvar o ponto. Verifique suas permissões e os dados informados.");
    }
  }

  async function remover(id: string) {
    if (!window.confirm("Excluir este ponto de coleta?")) return;
    try {
      const resposta = await excluirPontoColeta(id);
      setMensagem(resposta.mensagemResultado);
      await carregar();
    } catch {
      setErro("Não foi possível excluir o ponto.");
    }
  }

  async function moderar(id: string, status: string) {
    try {
      const resposta = await alterarStatusPontoColeta(id, status);
      setMensagem(resposta.mensagemResultado);
      await carregar();
    } catch {
      setErro("Não foi possível alterar o status do ponto.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3d9664]">Território</p>
          <h2 className="mt-2 text-2xl font-black text-[#17362a] sm:text-3xl">Pontos de coleta</h2>
          <p className="mt-2 text-sm leading-6 text-[#668073]">Cadastre, encontre e valide locais com coordenadas obtidas pelo navegador.</p>
        </div>
        {podeEscrever ? (
          <button type="button" onClick={abrirNovo} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white">
            <Plus className="h-4 w-4" /> Novo ponto
          </button>
        ) : null}
      </div>

      {erro ? <div role="alert" className="rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold text-[#a8493e]">{erro}</div> : null}
      {mensagem ? <div role="status" className="rounded-2xl border border-[#cfe3d1] bg-[#f2faf0] p-4 text-sm font-semibold text-[#356b4a]">{mensagem}</div> : null}

      <form data-onboarding-action="pesquisar_pontos" onSubmit={event => { event.preventDefault(); aplicarFiltros(); }} className="rounded-2xl border border-[#e0eae1] bg-white p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[#5f7b6c]">Buscar por cidade</span>
            <input
              value={cidadeBusca}
              onChange={event => { setCidadeBusca(event.target.value); setLocalizacaoBusca(null); }}
              placeholder="Ex.: João Pessoa"
              autoComplete="address-level2"
              className="min-h-11 w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#4e9b68]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[#5f7b6c]">Material aceito</span>
            <select value={categoria} onChange={event => setCategoria(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#4e9b68]">
              <option value="">Todas as categorias</option>
              {materiais.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="submit" disabled={carregando} className="min-h-11 rounded-xl border border-[#cfe3d1] px-4 py-3 text-sm font-black text-[#1d7953] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">
            {carregando ? "Buscando…" : "Pesquisar"}
          </button>
          {permiteLocalizacaoBusca ? <button type="button" onClick={buscarPertoDeMim} disabled={localizandoBusca} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-4 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">
            {localizandoBusca ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
            {localizandoBusca ? "Localizando…" : "Perto de mim"}
          </button> : null}
          {filtrosAplicados.localizacao ? <>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d9e6db] px-3 text-sm font-semibold text-[#5d796a]">
              <span>Raio</span>
              <select aria-label="Raio da busca por proximidade" value={raioKm} onChange={event => { const novoRaio = Number(event.target.value); setRaioKm(novoRaio); setFiltrosAplicados(atual => ({ ...atual, raioKm: novoRaio })); }} className="bg-transparent py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#4e9b68]">
                {[5, 10, 25, 50].map(valor => <option key={valor} value={valor}>{valor} km</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { setLocalizacaoBusca(null); setFiltrosAplicados({ cidade: cidadeBusca.trim(), categoria, localizacao: null, raioKm }); setMensagem("Busca por localização encerrada. Pesquise por cidade ou use a localização novamente."); }} className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-[#5d796a] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Limpar localização</button>
          </> : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-[#71897b]" role="status" aria-live="polite">
          {filtrosAplicados.localizacao
            ? `Resultados da busca aplicada: até ${filtrosAplicados.raioKm} km, do mais próximo ao mais distante. A localização é usada só nesta busca e não é salva no perfil.`
            : "Resultados da busca aplicada. Digite uma cidade ou use “Perto de mim”; a localização só é compartilhada se você autorizar."}
        </p>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {pontos.map(ponto => (
          <article key={ponto.idPontoColeta} className="rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9f5e7] text-[#2a7951]"><MapPinned className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-black text-[#17362a]">{ponto.nomePontoColeta}</h3>
                  <p className="mt-1 text-sm text-[#698273]">
                    {ponto.cepPontoColeta ? `CEP ${formatarCep(ponto.cepPontoColeta)} · ` : ""}
                    {ponto.enderecoPontoColeta} · {ponto.cidadePontoColeta}/{ponto.estadoPontoColeta}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${ponto.statusVerificacao === "verificado" ? "bg-[#e5f5e6] text-[#28744d]" : "bg-[#fff2d9] text-[#94620e]"}`}>{rotulosStatus[ponto.statusVerificacao] ?? "Status não informado"}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Materiais aceitos">
              {ponto.categoriasAceitas.length ? ponto.categoriasAceitas.map(item => <span key={item} className="rounded-lg bg-[#f0f5f0] px-2 py-1 text-xs font-bold text-[#5b7969]">{item}</span>) : <span className="text-xs text-[#71897b]">Materiais aceitos não informados</span>}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-[#5d796a] sm:grid-cols-2">
              {ponto.horarioFuncionamento ? <p className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong>Atendimento:</strong> {ponto.horarioFuncionamento}</span></p> : null}
              {ponto.telefoneContato ? <p><strong>Telefone:</strong> <a className="font-bold underline" href={`tel:${ponto.telefoneContato.replace(/[^+\d]/g, "")}`}>{ponto.telefoneContato}</a></p> : null}
              {ponto.urlInformacoes && /^https?:\/\//i.test(ponto.urlInformacoes) ? <p><a className="inline-flex min-h-9 items-center gap-1 font-bold text-[#1d7953] underline" href={ponto.urlInformacoes} target="_blank" rel="noopener noreferrer">Informações do local <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></p> : null}
              {ponto.dataVerificacao ? <p className="text-xs sm:col-span-2">Última validação: {Number.isNaN(Date.parse(ponto.dataVerificacao)) ? "data não informada" : new Date(ponto.dataVerificacao).toLocaleDateString("pt-BR")}</p> : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6c8879]">
              {typeof ponto.distanciaKm === "number" ? <span className="font-black text-[#337a51]">{ponto.distanciaKm < 1 ? `${Math.round(ponto.distanciaKm * 1000)} m` : `${ponto.distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`} de você</span> : null}
              {(podeEscrever || podeAprovar) ? <span>{ponto.latitudePontoColeta.toFixed(5)}, {ponto.longitudePontoColeta.toFixed(5)}</span> : null}
              <a target="_blank" rel="noreferrer" aria-label={`Abrir mapa para ${ponto.nomePontoColeta} em nova aba`} href={`https://www.openstreetmap.org/?mlat=${ponto.latitudePontoColeta}&mlon=${ponto.longitudePontoColeta}#map=17/${ponto.latitudePontoColeta}/${ponto.longitudePontoColeta}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg font-black text-[#1d7953] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Abrir mapa
              </a>
              <a target="_blank" rel="noopener noreferrer" aria-label={`Traçar rota até ${ponto.nomePontoColeta} em nova aba`} href={`https://www.google.com/maps/dir/?api=1&destination=${ponto.latitudePontoColeta},${ponto.longitudePontoColeta}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg font-black text-[#1d7953] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">
                Traçar rota <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf2ed] pt-4">
              {podeRegistrar && ponto.statusVerificacao === "verificado" ? <button type="button" onClick={() => onIniciarDescarte({ idPontoColeta: ponto.idPontoColeta, nomePontoColeta: ponto.nomePontoColeta, cidadePontoColeta: ponto.cidadePontoColeta })} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#1d7953] px-3 py-2 text-xs font-black text-white hover:bg-[#176342] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]"><Recycle className="h-3.5 w-3.5" aria-hidden="true" /> Iniciar descarte</button> : null}
              {podeEscrever ? <>
                <button type="button" onClick={() => abrirEdicao(ponto)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef5ed] px-3 py-2 text-xs font-black text-[#337a51]"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                <button type="button" onClick={() => void remover(ponto.idPontoColeta)} className="inline-flex items-center gap-1 rounded-lg bg-[#fff1ef] px-3 py-2 text-xs font-black text-[#a8493e]"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
              </> : null}
              {podeAprovar && ponto.statusVerificacao !== "verificado" ? <>
                <button type="button" onClick={() => void moderar(ponto.idPontoColeta, "verificado")} className="inline-flex items-center gap-1 rounded-lg bg-[#e5f5e6] px-3 py-2 text-xs font-black text-[#28744d]"><Check className="h-3.5 w-3.5" /> Aprovar</button>
                <button type="button" onClick={() => void moderar(ponto.idPontoColeta, "rejeitado")} className="inline-flex items-center gap-1 rounded-lg bg-[#fff1ef] px-3 py-2 text-xs font-black text-[#a8493e]"><X className="h-3.5 w-3.5" /> Rejeitar</button>
              </> : null}
            </div>
          </article>
        ))}
        {carregando ? <p className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#708a7b] md:col-span-2" role="status" aria-live="polite">Buscando pontos de coleta…</p> : null}
        {!carregando && pontos.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center md:col-span-2" role="status">
          <p className="text-sm font-semibold text-[#708a7b]">{filtrosAplicados.localizacao ? `Nenhum ponto encontrado em até ${filtrosAplicados.raioKm} km.` : `Nenhum ponto encontrado${filtrosAplicados.cidade ? ` em ${filtrosAplicados.cidade}` : ""}.`}</p>
          <p className="mt-2 text-xs text-[#819589]">{filtrosAplicados.localizacao ? "Tente ampliar o raio ou buscar por cidade." : "Confira o nome da cidade, remova o filtro de material ou use a busca por proximidade."}</p>
          {filtrosAplicados.localizacao && filtrosAplicados.raioKm < 50 ? <button type="button" onClick={() => { const novoRaio = filtrosAplicados.raioKm === 5 ? 10 : filtrosAplicados.raioKm === 10 ? 25 : 50; setRaioKm(novoRaio); setFiltrosAplicados(atual => ({ ...atual, raioKm: novoRaio })); }} className="mt-4 min-h-10 rounded-xl border border-[#cfe3d1] px-4 py-2 text-sm font-black text-[#1d7953] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Ampliar raio</button> : null}
        </div> : null}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        {aberto ? (
          <DialogContent showCloseButton={false} className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] border-0 bg-white p-0 shadow-2xl sm:max-w-2xl">
          <form onSubmit={event => void salvar(event)} className="p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3d9664]">CRUD seguro</p>
                <DialogTitle className="mt-1 text-left text-2xl font-black text-[#17362a]">{editando ? "Editar ponto" : "Novo ponto de coleta"}</DialogTitle>
                <DialogDescription className="sr-only">Preencha endereço, localização e materiais aceitos para cadastrar um ponto de coleta.</DialogDescription>
              </div>
              <button type="button" onClick={() => setAberto(false)} className="rounded-xl p-2 text-[#648074] hover:bg-[#edf3ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1d7953]" aria-label="Fechar formulário"><X aria-hidden="true" /></button>
            </div>

            {erro ? <div role="alert" className="mt-5 rounded-xl border border-[#f0c1bd] bg-[#fff4f0] p-3 text-sm font-bold text-[#a8493e]">{erro}</div> : null}
            {mensagem ? <div role="status" className="mt-5 rounded-xl border border-[#cfe3d1] bg-[#f2faf0] p-3 text-sm font-semibold text-[#356b4a]">{mensagem}</div> : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Nome</span>
                <input required value={dados.nomePontoColeta} onChange={event => atualizar("nomePontoColeta", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
              </label>

              <div className="sm:col-span-2">
                <label htmlFor="ponto-cep" className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">CEP</label>
                <div className="flex gap-2">
                  <input
                    id="ponto-cep"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={9}
                    placeholder="00000-000"
                    value={dados.cepPontoColeta}
                    onChange={event => alterarCep(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-[#d9e6db] px-4 py-3 text-sm outline-none focus:border-[#4e9b68]"
                  />
                  <button type="button" onClick={() => void buscarCep()} disabled={consultandoCep} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#cfe3d1] px-3 py-3 text-sm font-black text-[#1d7953] disabled:opacity-60" aria-label="Buscar endereço pelo CEP">
                    {consultandoCep ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="hidden sm:inline">{consultandoCep ? "Buscando" : "Buscar CEP"}</span>
                  </button>
                </div>
                <p className="mt-1 text-xs text-[#71897b]">Ao completar oito dígitos, o endereço é consultado no ViaCEP.</p>
              </div>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Endereço</span>
                <input required value={dados.enderecoPontoColeta} onChange={event => atualizar("enderecoPontoColeta", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Cidade</span>
                <input required value={dados.cidadePontoColeta} onChange={event => atualizar("cidadePontoColeta", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">UF</span>
                <input required maxLength={2} value={dados.estadoPontoColeta} onChange={event => atualizar("estadoPontoColeta", event.target.value.toUpperCase())} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm uppercase" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Latitude</span>
                <input type="number" step="any" value={dados.latitudePontoColeta || ""} onChange={event => atualizar("latitudePontoColeta", Number(event.target.value))} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Longitude</span>
                <input type="number" step="any" value={dados.longitudePontoColeta || ""} onChange={event => atualizar("longitudePontoColeta", Number(event.target.value))} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Horário de atendimento</span>
                <textarea maxLength={500} rows={2} value={dados.horarioFuncionamento} onChange={event => atualizar("horarioFuncionamento", event.target.value)} placeholder="Ex.: seg. a sex., 8h às 17h; confirme com o local" className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
                <span className="mt-1 block text-xs text-[#71897b]">Informe somente quando confirmado; horários podem mudar.</span>
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Telefone de contato</span>
                <input type="tel" maxLength={40} autoComplete="tel" value={dados.telefoneContato} onChange={event => atualizar("telefoneContato", event.target.value)} placeholder="(00) 00000-0000" className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Site ou informações oficiais</span>
                <input type="url" maxLength={2048} value={dados.urlInformacoes} onChange={event => atualizar("urlInformacoes", event.target.value)} placeholder="https://..." className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" />
              </label>
            </div>

            <button type="button" onClick={localizar} disabled={localizando} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#e6f1d0] px-4 py-3 text-sm font-black text-[#2d7a50] disabled:opacity-60">
              {localizando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              {localizando ? "Localizando e consultando endereço…" : "Usar minha localização atual"}
            </button>
            <p className="mt-2 text-xs leading-5 text-[#71897b]">
              Ao usar a localização, as coordenadas serão consultadas para sugerir endereço/CEP; a sugestão pode ser aproximada. Serviço e atribuição: <a className="font-bold text-[#1d7953] underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-xs font-black uppercase text-[#5f7b6c]">Materiais aceitos</p>
              <div className="flex flex-wrap gap-2">
                {materiais.map(item => (
                  <button type="button" key={item} onClick={() => alternarCategoria(item)} className={`rounded-full px-3 py-2 text-xs font-black ${dados.categoriasAceitas.includes(item) ? "bg-[#1d7953] text-white" : "bg-[#edf3ed] text-[#5d796a]"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setAberto(false)} className="rounded-xl border border-[#cfe3d1] px-4 py-3 text-sm font-black text-[#5d796a]">Cancelar</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#17362a] px-5 py-3 text-sm font-black text-white"><Save className="h-4 w-4" /> Salvar</button>
            </div>
          </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
