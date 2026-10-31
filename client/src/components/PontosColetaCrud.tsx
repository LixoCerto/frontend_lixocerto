import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  Crosshair,
  ExternalLink,
  Filter,
  Globe,
  Info,
  LoaderCircle,
  MapPinned,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Recycle,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Aviso, CabecalhoPagina, Carregando, ESTILOS, EstadoVazio, Estatistica, Etiqueta, TONS, type TomPagina } from "@/components/pagina/Pagina";
import { distanciaEmKm } from "@/lib/geo";
import { registrarAcaoOnboarding } from "@/lib/onboarding";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { interpretarResultadoMutacao } from "@/lib/resultado-mutacao";
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
  origemInformacao: string;
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
  origemInformacao: "",
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
  const [moderandoId, setModerandoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [localizandoBusca, setLocalizandoBusca] = useState(false);
  const idConsultaCep = useRef(0);

  const carregar = useCallback(
    async (reportarFalha = true): Promise<boolean> => {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await listarPontosColeta(
          filtrosAplicados.localizacao ? "" : filtrosAplicados.cidade,
          filtrosAplicados.categoria,
          filtrosAplicados.localizacao
            ? {
                ...filtrosAplicados.localizacao,
                raioMetros: filtrosAplicados.raioKm * 1000,
              }
            : undefined,
        );
        const pontosCarregados = resposta.pontosColeta.map(ponto => ({
          ...ponto,
          cepPontoColeta: formatarCep(ponto.cepPontoColeta),
          distanciaKm: filtrosAplicados.localizacao
            ? distanciaEmKm(filtrosAplicados.localizacao, {
                latitude: ponto.latitudePontoColeta,
                longitude: ponto.longitudePontoColeta,
              }) ?? undefined
            : undefined,
        }));
        if (filtrosAplicados.localizacao)
          pontosCarregados.sort(
            (a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity)
          );
        setPontos(pontosCarregados);
        return true;
      } catch {
        if (reportarFalha)
          setErro("Não foi possível carregar os pontos de coleta.");
        return false;
      } finally {
        setCarregando(false);
      }
    },
    [filtrosAplicados]
  );

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function atualizar<K extends keyof Dados>(campo: K, valor: Dados[K]) {
    setDados(atual => ({ ...atual, [campo]: valor }));
  }

  function buscarPertoDeMim() {
    if (!navigator.geolocation) {
      setErro("Este navegador não oferece busca por localização. Você ainda pode buscar por cidade.");
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
          ? "A localização não foi autorizada. Você ainda pode buscar por cidade."
          : "Não foi possível obter sua localização. Você ainda pode buscar por cidade.");
        setLocalizandoBusca(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  function aplicarFiltros() {
    const cidade = cidadeBusca.trim();
    if (!localizacaoBusca && cidade.length < 2) {
      setMensagem(null);
      setErro("Informe uma cidade com pelo menos dois caracteres para buscar.");
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

  function publicarResultadoMutacao(
    resposta: { operacaoAceita: boolean; mensagemResultado: string },
    listaAtualizada: boolean
  ) {
    const resultado = interpretarResultadoMutacao(resposta, listaAtualizada);
    if (resultado.tipo === "sucesso") {
      setErro(null);
      setMensagem(resultado.mensagem);
      return;
    }
    setMensagem(null);
    setErro(resultado.mensagem);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);
    const latitude = dados.latitudePontoColeta;
    const longitude = dados.longitudePontoColeta;
    const coordenadasInvalidas = !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      || (latitude === 0 && longitude === 0);
    if (!dados.nomePontoColeta.trim() || !dados.enderecoPontoColeta.trim() || !dados.cidadePontoColeta.trim() || coordenadasInvalidas) {
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
      if (!resposta.operacaoAceita) {
        publicarResultadoMutacao(resposta, false);
        return;
      }
      setAberto(false);
      const listaAtualizada = await carregar(false);
      publicarResultadoMutacao(resposta, listaAtualizada);
    } catch {
      setErro("Não foi possível salvar o ponto. Verifique suas permissões e os dados informados.");
    }
  }

  async function remover(id: string) {
    if (!window.confirm("Excluir este ponto de coleta?")) return;
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await excluirPontoColeta(id);
      if (!resposta.operacaoAceita) {
        publicarResultadoMutacao(resposta, false);
        return;
      }
      const listaAtualizada = await carregar(false);
      publicarResultadoMutacao(resposta, listaAtualizada);
    } catch {
      setErro("Não foi possível excluir o ponto.");
    }
  }

  async function moderar(id: string, status: string) {
    const acao = status === "verificado" ? "aprovar" : "rejeitar";
    if (!window.confirm(`Confirmar ${acao} este ponto de coleta?`)) return;
    setErro(null);
    setMensagem(null);
    setModerandoId(id);
    try {
      const resposta = await alterarStatusPontoColeta(id, status);
      if (!resposta.operacaoAceita) {
        publicarResultadoMutacao(resposta, false);
        return;
      }
      const listaAtualizada = await carregar(false);
      publicarResultadoMutacao(resposta, listaAtualizada);
    } catch {
      setErro("Não foi possível alterar o status do ponto.");
    } finally {
      setModerandoId(null);
    }
  }

  const totalVerificados = pontos.filter(ponto => ponto.statusVerificacao === "verificado").length;
  const classeLink = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#d6e2d9] bg-white px-3 text-sm font-bold text-[#1d7953] transition hover:border-[#afd2b3] hover:bg-[#f5faf4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]";
  const classeAcao = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]";

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        icone={MapPinned}
        tom="verde"
        titulo="Pontos de coleta"
        descricao="Encontre o lugar certo para cada material, veja o horário e trace a rota até lá."
        acoes={podeEscrever ? (
          <button type="button" onClick={abrirNovo} className={`${ESTILOS.botaoPrincipal} w-full sm:w-auto`}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Novo ponto
          </button>
        ) : null}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Estatistica icone={MapPinned} tom="verde" valor={carregando ? "…" : pontos.length} rotulo="Pontos encontrados" />
          <Estatistica icone={ShieldCheck} tom="azul" valor={carregando ? "…" : totalVerificados} rotulo="Verificados" />
          <Estatistica
            icone={filtrosAplicados.localizacao ? Navigation : Building2}
            tom="amarelo"
            valor={<span className="block truncate">{filtrosAplicados.localizacao ? `${filtrosAplicados.raioKm} km` : filtrosAplicados.cidade || "Todas"}</span>}
            rotulo={filtrosAplicados.localizacao ? "Perto de você" : "Cidade da busca"}
          />
        </div>
      </CabecalhoPagina>

      {erro ? <Aviso tipo="erro" focar>{erro}</Aviso> : null}
      {mensagem ? <Aviso tipo="sucesso" focar>{mensagem}</Aviso> : null}

      <form data-onboarding-action="pesquisar_pontos" onSubmit={event => { event.preventDefault(); aplicarFiltros(); }} className={ESTILOS.cartao}>
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: TONS.verde.fundo, color: TONS.verde.cor }}>
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-black leading-tight tracking-tight text-[#17362a]">Onde você quer descartar?</h3>
            <p className="mt-0.5 text-sm leading-6 text-[#4b6657]">Digite a cidade e escolha o material. Se preferir, use sua localização.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className={ESTILOS.rotulo}>Cidade</span>
            <span className="relative block">
              <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa094]" aria-hidden="true" />
              <input
                value={cidadeBusca}
                onChange={event => { setCidadeBusca(event.target.value); setLocalizacaoBusca(null); }}
                placeholder="Ex.: João Pessoa"
                autoComplete="address-level2"
                className={`${ESTILOS.campo} pl-10`}
              />
            </span>
          </label>
          <label className="block min-w-0">
            <span className={ESTILOS.rotulo}>Material</span>
            <span className="relative block">
              <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8aa094]" aria-hidden="true" />
              <select value={categoria} onChange={event => setCategoria(event.target.value)} className={`${ESTILOS.campo} pl-10`}>
                <option value="">Todos os materiais</option>
                {materiais.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </span>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button type="submit" disabled={carregando} className={`${ESTILOS.botaoPrincipal} w-full disabled:cursor-wait sm:w-auto`}>
            {carregando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            {carregando ? "Buscando…" : "Buscar"}
          </button>
          {permiteLocalizacaoBusca ? <button type="button" onClick={buscarPertoDeMim} disabled={localizandoBusca} className={`${ESTILOS.botaoSecundario} w-full disabled:cursor-wait sm:w-auto`}>
            {localizandoBusca ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
            {localizandoBusca ? "Localizando…" : "Perto de mim"}
          </button> : null}
          {filtrosAplicados.localizacao ? <>
            <label className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#d6e2d9] bg-[#f5f9f5] px-3.5 text-sm font-bold text-[#2c4a3c] sm:justify-start">
              <span className="inline-flex items-center gap-1.5"><Navigation className="h-4 w-4 text-[#1d7953]" aria-hidden="true" /> Distância</span>
              <select aria-label="Raio da busca por proximidade" value={raioKm} onChange={event => { const novoRaio = Number(event.target.value); setRaioKm(novoRaio); setFiltrosAplicados(atual => ({ ...atual, raioKm: novoRaio })); }} className="min-h-9 rounded-lg bg-white px-2 font-black text-[#17362a] outline-none focus-visible:ring-2 focus-visible:ring-[#1d7953]">
                {[5, 10, 25, 50].map(valor => <option key={valor} value={valor}>{valor} km</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { setLocalizacaoBusca(null); setFiltrosAplicados({ cidade: cidadeBusca.trim(), categoria, localizacao: null, raioKm }); setMensagem("Busca por localização encerrada. Pesquise por cidade ou use a localização novamente."); }} className={`${classeAcao} w-full text-[#5f7a6b] hover:bg-[#eef4ef] hover:text-[#17362a] sm:w-auto`}>
              <X className="h-4 w-4" aria-hidden="true" /> Limpar localização
            </button>
          </> : null}
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#f5f9f5] px-3.5 py-2.5 text-xs leading-5 text-[#5c7768]" role="status" aria-live="polite">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d7953]" aria-hidden="true" />
          <span>
            {filtrosAplicados.localizacao
              ? `Mostrando pontos a até ${filtrosAplicados.raioKm} km, do mais perto ao mais longe. Sua localização é usada só nesta busca e não fica salva.`
              : "Digite uma cidade ou toque em “Perto de mim”. Sua localização só é usada se você autorizar."}
          </span>
        </p>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {pontos.map(ponto => {
          const status = estiloStatus(ponto.statusVerificacao);
          const verificado = ponto.statusVerificacao === "verificado";
          const temAcoes = (podeRegistrar && verificado) || podeEscrever || (podeAprovar && !verificado);
          return (
            <article key={ponto.idPontoColeta} className="flex min-w-0 flex-col rounded-[24px] border border-[#e1ebe2] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#cfe8d8] hover:shadow-[0_18px_36px_-28px_rgba(23,54,42,.55)] sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: TONS.verde.fundo, color: TONS.verde.cor }}>
                  <MapPinned className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-base font-black leading-tight text-[#17362a] sm:text-lg">{ponto.nomePontoColeta}</h3>
                  <p className="mt-1 break-words text-sm leading-6 text-[#5c7768]">
                    {ponto.enderecoPontoColeta} · {ponto.cidadePontoColeta}/{ponto.estadoPontoColeta}
                    {ponto.cepPontoColeta ? <span className="text-[#5c7768]"> · CEP {formatarCep(ponto.cepPontoColeta)}</span> : null}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Etiqueta tom={status.tom} icone={status.icone}>{rotulosStatus[ponto.statusVerificacao] ?? "Status não informado"}</Etiqueta>
                {typeof ponto.distanciaKm === "number" ? <Etiqueta tom="azul" icone={Navigation}>{ponto.distanciaKm < 1 ? `${Math.round(ponto.distanciaKm * 1000)} m` : `${ponto.distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`} de você</Etiqueta> : null}
              </div>

              {verificado ? <p className="mt-2 text-xs leading-5 text-[#4b6657]">O selo “Verificado” indica revisão do cadastro; não garante que a coordenada tenha sido aferida em campo.</p> : null}
              {ponto.origemInformacao.trim() ? <p role="note" className="mt-3 flex items-start gap-2 rounded-xl border border-[#ead9a8] bg-[#fff9e9] px-3 py-2.5 text-xs leading-5 text-[#5e4a17]"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><strong className="font-bold">Fonte e precisão:</strong> {ponto.origemInformacao}</span></p> : null}

              <div className="mt-4">
                <p className="mb-2 text-xs font-bold text-[#4b6657]">Recebe</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Materiais aceitos">
                  {ponto.categoriasAceitas.length
                    ? ponto.categoriasAceitas.map(item => <span key={item} className="inline-flex items-center gap-1 rounded-full border border-[#cfe8d8] bg-[#f3faf5] px-2.5 py-1 text-xs font-bold text-[#1d6b43]"><Recycle className="h-3 w-3" aria-hidden="true" />{item}</span>)
                    : <span className="text-xs text-[#4b6657]">Materiais aceitos não informados</span>}
                </div>
              </div>

              {ponto.horarioFuncionamento || ponto.telefoneContato || (ponto.urlInformacoes && /^https?:\/\//i.test(ponto.urlInformacoes)) || ponto.dataVerificacao || podeEscrever || podeAprovar ? (
                <details className="group mt-4 rounded-2xl bg-[#f7faf7] p-3.5">
                  <summary className="cursor-pointer list-none text-sm font-bold text-[#45614f] marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Informações do local <span className="ml-1 text-xs font-semibold text-[#4b6657] group-open:hidden">(mostrar)</span><span className="ml-1 hidden text-xs font-semibold text-[#4b6657] group-open:inline">(ocultar)</span></summary>
                  <ul className="mt-2 space-y-2 text-sm text-[#45614f]">
                  {ponto.horarioFuncionamento ? <li className="flex items-start gap-2.5"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#1d7953]" aria-hidden="true" /><span className="min-w-0 break-words"><strong className="font-bold text-[#17362a]">Atendimento:</strong> {ponto.horarioFuncionamento}</span></li> : null}
                  {ponto.telefoneContato ? <li className="flex items-start gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#1d7953]" aria-hidden="true" /><span><strong className="font-bold text-[#17362a]">Telefone:</strong> <a className="font-bold text-[#1d7953] underline" href={`tel:${ponto.telefoneContato.replace(/[^+\d]/g, "")}`}>{ponto.telefoneContato}</a></span></li> : null}
                  {ponto.urlInformacoes && /^https?:\/\//i.test(ponto.urlInformacoes) ? <li className="flex items-start gap-2.5"><Globe className="mt-0.5 h-4 w-4 shrink-0 text-[#1d7953]" aria-hidden="true" /><a className="inline-flex items-center gap-1 font-bold text-[#1d7953] underline" href={ponto.urlInformacoes} target="_blank" rel="noopener noreferrer">Informações do local <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></li> : null}
                  {ponto.dataVerificacao ? <li className="flex items-start gap-2.5 text-xs text-[#4b6657]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Última validação: {Number.isNaN(Date.parse(ponto.dataVerificacao)) ? "data não informada" : new Date(ponto.dataVerificacao).toLocaleDateString("pt-BR")}</span></li> : null}
                  {(podeEscrever || podeAprovar) ? <li className="flex items-start gap-2.5 text-xs text-[#4b6657]"><Crosshair className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="tabular-nums">{ponto.latitudePontoColeta.toFixed(5)}, {ponto.longitudePontoColeta.toFixed(5)}</span></li> : null}
                  </ul>
                </details>
              ) : null}

              <div className="mt-auto pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <a target="_blank" rel="noreferrer" aria-label={`Ver no mapa: ${ponto.nomePontoColeta} (abre em nova aba)`} href={`https://www.openstreetmap.org/?mlat=${ponto.latitudePontoColeta}&mlon=${ponto.longitudePontoColeta}#map=17/${ponto.latitudePontoColeta}/${ponto.longitudePontoColeta}`} className={classeLink}>
                    <MapPinned className="h-4 w-4" aria-hidden="true" /> Ver no mapa
                  </a>
                  <a target="_blank" rel="noopener noreferrer" aria-label={`Como chegar: ${ponto.nomePontoColeta} (abre em nova aba)`} href={`https://www.google.com/maps/dir/?api=1&destination=${ponto.latitudePontoColeta},${ponto.longitudePontoColeta}`} className={classeLink}>
                    <Navigation className="h-4 w-4" aria-hidden="true" /> Como chegar
                  </a>
                </div>
                {temAcoes ? (
                  <div className="mt-3 flex flex-col gap-2 border-t border-[#edf2ed] pt-3 sm:flex-row sm:flex-wrap">
                    {podeRegistrar && verificado ? <button type="button" onClick={() => onIniciarDescarte({ idPontoColeta: ponto.idPontoColeta, nomePontoColeta: ponto.nomePontoColeta, cidadePontoColeta: ponto.cidadePontoColeta })} className={`${ESTILOS.botaoPrincipal} w-full sm:w-auto`}><Recycle className="h-4 w-4" aria-hidden="true" /> Iniciar descarte</button> : null}
                    {(podeEscrever || (podeAprovar && !verificado)) ? (
                      <div className="flex flex-wrap gap-2">
                        {podeEscrever ? <>
                          <button type="button" onClick={() => abrirEdicao(ponto)} className={`${classeAcao} flex-1 bg-[#eef5ed] text-[#285e47] hover:bg-[#e2efe1] sm:flex-none`}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar</button>
                          <button type="button" onClick={() => void remover(ponto.idPontoColeta)} className={`${classeAcao} flex-1 bg-[#fff1ef] text-[#a8493e] hover:bg-[#fde4e0] sm:flex-none`}><Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir</button>
                        </> : null}
                        {podeAprovar && !verificado ? <>
                          <button type="button" disabled={moderandoId === ponto.idPontoColeta} aria-busy={moderandoId === ponto.idPontoColeta} onClick={() => void moderar(ponto.idPontoColeta, "verificado")} className={`${classeAcao} flex-1 bg-[#e6f5ec] text-[#1d6b43] hover:bg-[#d6eedf] disabled:cursor-wait disabled:opacity-60 sm:flex-none`}><Check className="h-4 w-4" aria-hidden="true" /> Aprovar</button>
                          <button type="button" disabled={moderandoId === ponto.idPontoColeta} aria-busy={moderandoId === ponto.idPontoColeta} onClick={() => void moderar(ponto.idPontoColeta, "rejeitado")} className={`${classeAcao} flex-1 bg-[#fff1ef] text-[#a8493e] hover:bg-[#fde4e0] disabled:cursor-wait disabled:opacity-60 sm:flex-none`}><X className="h-4 w-4" aria-hidden="true" /> Rejeitar</button>
                        </> : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
        {carregando ? <div className="md:col-span-2"><Carregando texto="Buscando pontos de coleta…" /></div> : null}
        {!carregando && pontos.length === 0 ? <div className="md:col-span-2">
          <EstadoVazio
            icone={MapPinned}
            titulo={filtrosAplicados.localizacao ? `Nenhum ponto encontrado em até ${filtrosAplicados.raioKm} km.` : `Nenhum ponto encontrado${filtrosAplicados.cidade ? ` em ${filtrosAplicados.cidade}` : ""}.`}
            descricao={filtrosAplicados.localizacao ? "Tente aumentar a distância ou buscar pelo nome da cidade." : "Confira o nome da cidade, escolha “Todos os materiais” ou use a busca “Perto de mim”."}
            acao={filtrosAplicados.localizacao && filtrosAplicados.raioKm < 50 ? <button type="button" onClick={() => { const novoRaio = filtrosAplicados.raioKm === 5 ? 10 : filtrosAplicados.raioKm === 10 ? 25 : 50; setRaioKm(novoRaio); setFiltrosAplicados(atual => ({ ...atual, raioKm: novoRaio })); }} className={ESTILOS.botaoSecundario}><Navigation className="h-4 w-4" aria-hidden="true" /> Ampliar distância</button> : undefined}
          />
        </div> : null}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        {aberto ? (
          <DialogContent showCloseButton={false} className="max-h-[92vh] w-full max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-[28px] border-0 bg-white p-0 shadow-2xl sm:max-w-2xl">
          <form onSubmit={event => void salvar(event)} className="p-5 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white" style={{ backgroundColor: TONS.verde.cor }}>
                  {editando ? <Pencil className="h-5 w-5" aria-hidden="true" /> : <MapPinned className="h-6 w-6" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-left text-xl font-black leading-tight tracking-tight text-[#17362a] sm:text-2xl">{editando ? "Editar ponto" : "Novo ponto de coleta"}</DialogTitle>
                  <DialogDescription className="mt-1 text-left text-sm leading-6 text-[#4b6657]">Preencha endereço, localização e materiais aceitos. Campos com * são obrigatórios.</DialogDescription>
                </div>
              </div>
              <button type="button" onClick={() => setAberto(false)} className={ESTILOS.botaoIcone} aria-label="Fechar formulário"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>

            {erro ? <div className="mt-5"><Aviso tipo="erro" focar>{erro}</Aviso></div> : null}
            {mensagem ? <div className="mt-5"><Aviso tipo="sucesso" focar>{mensagem}</Aviso></div> : null}

            <SecaoFormulario icone={Building2} titulo="Sobre o local">
              <label className="block sm:col-span-2">
                <span className={ESTILOS.rotulo}>Nome do ponto *</span>
                <input required value={dados.nomePontoColeta} onChange={event => atualizar("nomePontoColeta", event.target.value)} placeholder="Ex.: Ecoponto do Bairro" className={ESTILOS.campo} />
              </label>
            </SecaoFormulario>

            <SecaoFormulario icone={MapPinned} titulo="Endereço">
              <div className="sm:col-span-2">
                <label htmlFor="ponto-cep" className={ESTILOS.rotulo}>CEP</label>
                <div className="flex gap-2">
                  <input
                    id="ponto-cep"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={9}
                    placeholder="00000-000"
                    value={dados.cepPontoColeta}
                    onChange={event => alterarCep(event.target.value)}
                    className={`${ESTILOS.campo} min-w-0 flex-1`}
                  />
                  <button type="button" onClick={() => void buscarCep()} disabled={consultandoCep} className={`${ESTILOS.botaoSecundario} h-12 shrink-0 px-3.5 sm:px-4`} aria-label="Buscar endereço pelo CEP">
                    {consultandoCep ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                    <span className="hidden sm:inline">{consultandoCep ? "Buscando" : "Buscar CEP"}</span>
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[#4b6657]">Ao digitar os 8 números, o endereço é preenchido sozinho (ViaCEP).</p>
              </div>
              <label className="block sm:col-span-2">
                <span className={ESTILOS.rotulo}>Endereço *</span>
                <input required value={dados.enderecoPontoColeta} onChange={event => atualizar("enderecoPontoColeta", event.target.value)} placeholder="Rua, número e bairro" className={ESTILOS.campo} />
              </label>
              <label className="block">
                <span className={ESTILOS.rotulo}>Cidade *</span>
                <input required value={dados.cidadePontoColeta} onChange={event => atualizar("cidadePontoColeta", event.target.value)} className={ESTILOS.campo} />
              </label>
              <label className="block">
                <span className={ESTILOS.rotulo}>Estado (UF) *</span>
                <input required maxLength={2} value={dados.estadoPontoColeta} onChange={event => atualizar("estadoPontoColeta", event.target.value.toUpperCase())} placeholder="PB" className={`${ESTILOS.campo} uppercase`} />
              </label>
            </SecaoFormulario>

            <SecaoFormulario icone={Crosshair} titulo="Posição no mapa *" descricao="Use sua localização quando estiver no local ou digite as coordenadas.">
              <div className="sm:col-span-2">
                <button type="button" onClick={localizar} disabled={localizando} className={`${ESTILOS.botaoSecundario} w-full border-[#cfe8d8] bg-[#f3faf5] text-[#1d6b43] sm:w-auto`}>
                  {localizando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
                  {localizando ? "Localizando e buscando endereço…" : "Usar minha localização atual"}
                </button>
                <p className="mt-2 text-xs leading-5 text-[#4b6657]">
                  Com sua localização, sugerimos o endereço e o CEP — confira, pois pode ser aproximado. Dados do mapa: <a className="font-bold text-[#1d7953] underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>.
                </p>
              </div>
              <label className="block">
                <span className={ESTILOS.rotulo}>Latitude</span>
                <input type="number" min={-90} max={90} step="any" value={dados.latitudePontoColeta || ""} onChange={event => atualizar("latitudePontoColeta", Number(event.target.value))} placeholder="-7.11532" className={`${ESTILOS.campo} tabular-nums`} />
              </label>
              <label className="block">
                <span className={ESTILOS.rotulo}>Longitude</span>
                <input type="number" min={-180} max={180} step="any" value={dados.longitudePontoColeta || ""} onChange={event => atualizar("longitudePontoColeta", Number(event.target.value))} placeholder="-34.86100" className={`${ESTILOS.campo} tabular-nums`} />
              </label>
              <label className="block sm:col-span-2">
                <span className={ESTILOS.rotulo}>Origem e precisão da localização</span>
                <textarea maxLength={1000} rows={3} value={dados.origemInformacao} onChange={event => atualizar("origemInformacao", event.target.value)} placeholder="Ex.: fonte oficial para o endereço; pin cartográfico não aferido em campo." className={ESTILOS.areaTexto} />
                <span className="mt-1.5 block text-xs leading-5 text-[#4b6657]">Informe a fonte e se o ponto foi aferido no local. Essa informação ficará visível para quem consultar o ponto.</span>
              </label>
            </SecaoFormulario>

            <SecaoFormulario icone={Phone} titulo="Atendimento e contato" descricao="Opcional. Informe só o que foi confirmado com o local.">
              <label className="block sm:col-span-2">
                <span className={ESTILOS.rotulo}>Horário de atendimento</span>
                <textarea maxLength={500} rows={2} value={dados.horarioFuncionamento} onChange={event => atualizar("horarioFuncionamento", event.target.value)} placeholder="Ex.: seg. a sex., 8h às 17h" className={ESTILOS.areaTexto} />
                <span className="mt-1.5 block text-xs text-[#4b6657]">Horários podem mudar; preencha apenas quando tiver certeza.</span>
              </label>
              <label className="block">
                <span className={ESTILOS.rotulo}>Telefone</span>
                <input type="tel" maxLength={40} autoComplete="tel" value={dados.telefoneContato} onChange={event => atualizar("telefoneContato", event.target.value)} placeholder="(00) 00000-0000" className={ESTILOS.campo} />
              </label>
              <label className="block">
                <span className={ESTILOS.rotulo}>Site oficial</span>
                <input type="url" maxLength={2048} value={dados.urlInformacoes} onChange={event => atualizar("urlInformacoes", event.target.value)} placeholder="https://..." className={ESTILOS.campo} />
              </label>
            </SecaoFormulario>

            <SecaoFormulario icone={Recycle} titulo="Materiais aceitos" descricao="Toque para marcar o que este ponto recebe.">
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {materiais.map(item => {
                  const selecionado = dados.categoriasAceitas.includes(item);
                  return (
                    <button type="button" key={item} aria-pressed={selecionado} onClick={() => alternarCategoria(item)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] ${selecionado ? "border-[#1d7953] bg-[#1d7953] text-white" : "border-[#d6e2d9] bg-white text-[#45614f] hover:border-[#afd2b3] hover:bg-[#f5faf4]"}`}>
                      {selecionado ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                      {item}
                    </button>
                  );
                })}
              </div>
            </SecaoFormulario>

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-[#edf2ed] pt-5 sm:flex-row sm:justify-end sm:gap-3">
              <button type="button" onClick={() => setAberto(false)} className={`${ESTILOS.botaoSecundario} w-full sm:w-auto`}>Cancelar</button>
              <button type="submit" className={`${ESTILOS.botaoPrincipal} w-full sm:w-auto`}><Save className="h-4 w-4" aria-hidden="true" /> Salvar ponto</button>
            </div>
          </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function estiloStatus(status: string): { tom: TomPagina; icone: LucideIcon } {
  if (status === "verificado") return { tom: "verde", icone: CircleCheck };
  if (status === "pendente") return { tom: "amarelo", icone: Clock3 };
  if (status === "rejeitado") return { tom: "vermelho", icone: CircleX };
  if (status === "expirado") return { tom: "amarelo", icone: Info };
  return { tom: "cinza", icone: Info };
}

function SecaoFormulario({ icone: Icone, titulo, descricao, children }: { icone: LucideIcon; titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <fieldset className="mt-6 min-w-0">
      <legend className="flex items-center gap-2 text-sm font-black text-[#17362a]">
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ backgroundColor: TONS.verde.fundo, color: TONS.verde.cor }}>
          <Icone className="h-4 w-4" aria-hidden="true" />
        </span>
        {titulo}
      </legend>
      {descricao ? <p className="mt-1 text-xs leading-5 text-[#4b6657]">{descricao}</p> : null}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
