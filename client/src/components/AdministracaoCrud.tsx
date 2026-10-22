import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileClock,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Abas, Aviso, CabecalhoPagina, ESTILOS, EstadoVazio, Etiqueta, TONS, type TomPagina } from "@/components/pagina/Pagina";
import {
  alterarStatusUsuarioAdministrativo,
  arquivarPapelAdministrativo,
  atualizarPapelAdministrativo,
  criarPapelAdministrativo,
  definirPapeisUsuarioAdministrativo,
  definirPermissoesPapelAdministrativo,
  listarAuditoria,
  listarPermissoesAdministrativas,
  listarPapeisAdministrativos,
  listarUsuariosAdministrativos,
  obterResumoAdministrativo,
  revogarSessoesUsuarioAdministrativo,
  restaurarPapelAdministrativo,
} from "@/lib/api";

type Aba = "usuarios" | "papeis" | "auditoria";
type Resumo = Awaited<ReturnType<typeof obterResumoAdministrativo>>;
type Usuario = Awaited<ReturnType<typeof listarUsuariosAdministrativos>>["usuarios"][number];
type Papel = Awaited<ReturnType<typeof listarPapeisAdministrativos>>["papeis"][number];
type Permissao = Awaited<ReturnType<typeof listarPermissoesAdministrativas>>["permissoes"][number];
type RegistroAuditoria = Awaited<ReturnType<typeof listarAuditoria>>["registros"][number];

const LIMITE = 20;
const PERMISSAO_EXCLUSIVA = "administracao:gerenciar_acessos";
const abas: { id: Aba; titulo: string; icone: typeof Users }[] = [
  { id: "usuarios", titulo: "Usuários", icone: Users },
  { id: "papeis", titulo: "Papéis e permissões", icone: KeyRound },
  { id: "auditoria", titulo: "Auditoria", icone: FileClock },
];

function dataLocal(valor: string): string {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function motivoAdministrativo(acao: string): string | null {
  const motivo = window.prompt(`Justificativa obrigatória para ${acao} (mínimo 5 caracteres):`);
  if (motivo === null) return null;
  if (motivo.trim().length < 5) {
    window.alert("A justificativa precisa ter pelo menos 5 caracteres.");
    return null;
  }
  return motivo.trim();
}

const ROTULO_STATUS: Record<string, { texto: string; tom: TomPagina }> = {
  ativo: { texto: "Ativo", tom: "verde" },
  bloqueado: { texto: "Bloqueado", tom: "vermelho" },
  anonimizado: { texto: "Anonimizado", tom: "cinza" },
  arquivado: { texto: "Arquivado", tom: "cinza" },
};

function StatusEtiqueta({ status }: { status: string }) {
  const info = ROTULO_STATUS[status] ?? { texto: status, tom: "cinza" as TomPagina };
  return <Etiqueta tom={info.tom}>{info.texto}</Etiqueta>;
}

function Indicador({ titulo, valor, detalhe, icone: Icone, tom = "verde" }: { titulo: string; valor: number | null; detalhe: string; icone: typeof Users; tom?: TomPagina }) {
  const t = TONS[tom];
  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-2xl border bg-white p-3.5 sm:p-4" style={{ borderColor: t.borda }}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: t.fundo, color: t.cor }}>
          <Icone className="h-5 w-5" aria-hidden="true" />
        </span>
        <strong className="min-w-0 truncate text-xl font-black leading-tight tabular-nums text-[#17362a] sm:text-2xl">{valor === null ? "—" : valor.toLocaleString("pt-BR")}</strong>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-5 text-[#244637]">{titulo}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#6c8879]">{detalhe}</p>
      </div>
    </article>
  );
}

function BotaoAcao({ rotulo, icone: Icone, onClick, disabled, perigo = false }: { rotulo: string; icone: typeof Users; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={rotulo}
      aria-label={rotulo}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border bg-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-not-allowed disabled:opacity-40 ${perigo ? "border-[#f0c6c1] text-[#a8493e] hover:bg-[#fff5f3]" : "border-[#d6e2d9] text-[#285e47] hover:border-[#afd2b3] hover:bg-[#f5faf4]"}`}
    >
      <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}

function Paginacao({ inicio, fim, total, unidade, pagina, podeVoltar, podeAvancar, onVoltar, onAvancar }: { inicio: number; fim: number; total: number; unidade: string; pagina: number; podeVoltar: boolean; podeAvancar: boolean; onVoltar: () => void; onAvancar: () => void }) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#edf2ed] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="text-sm font-semibold text-[#5c7768]">
        Mostrando <strong className="text-[#17362a]">{inicio}–{fim}</strong> de <strong className="text-[#17362a]">{total.toLocaleString("pt-BR")}</strong> {unidade}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!podeVoltar} onClick={onVoltar} className={`${ESTILOS.botaoSecundario} flex-1 sm:flex-none`}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
        </button>
        <span className="min-w-20 text-center text-sm font-bold text-[#17362a]">Página {pagina}</span>
        <button type="button" disabled={!podeAvancar} onClick={onAvancar} className={`${ESTILOS.botaoSecundario} flex-1 sm:flex-none`}>
          Próxima <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function CampoBusca({ valor, onChange, placeholder, rotulo }: { valor: string; onChange: (valor: string) => void; placeholder: string; rotulo: string }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{rotulo}</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6c8879]" aria-hidden="true" />
      <input value={valor} onChange={event => onChange(event.target.value)} placeholder={placeholder} className={`${ESTILOS.campo} pl-11`} />
    </label>
  );
}

export default function AdministracaoCrud({ podeConsultarResumo, podeGerenciarAcessos, podeConsultarAuditoria }: { podeConsultarResumo: boolean; podeGerenciarAcessos: boolean; podeConsultarAuditoria: boolean }) {
  const [aba, setAba] = useState<Aba>(podeGerenciarAcessos ? "usuarios" : "auditoria");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [totalAuditoria, setTotalAuditoria] = useState(0);
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [statusUsuario, setStatusUsuario] = useState("todos");
  const [filtroEvento, setFiltroEvento] = useState("");
  const [paginaUsuarios, setPaginaUsuarios] = useState(0);
  const [paginaAuditoria, setPaginaAuditoria] = useState(0);
  const [papelSelecionado, setPapelSelecionado] = useState<Papel | null>(null);
  const [nomePapel, setNomePapel] = useState("");
  const [descricaoPapel, setDescricaoPapel] = useState("");
  const [idsPermissoes, setIdsPermissoes] = useState<string[]>([]);
  const [papelUsuario, setPapelUsuario] = useState<Usuario | null>(null);
  const [idsPapeisUsuario, setIdsPapeisUsuario] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const abasDisponiveis = useMemo(() => abas.filter(item => item.id === "auditoria" ? podeConsultarAuditoria : podeGerenciarAcessos), [podeConsultarAuditoria, podeGerenciarAcessos]);
  const abaAtual = abasDisponiveis.some(item => item.id === aba) ? aba : abasDisponiveis[0]?.id ?? "usuarios";
  const papeisAtivos = useMemo(() => papeis.filter(papel => papel.statusPapel === "ativo"), [papeis]);
  const permissoesAtivas = useMemo(() => permissoes.filter(permissao => permissao.statusPermissao === "ativo"), [permissoes]);
  const detalheResumo = (detalhe: string) => resumo ? detalhe : carregando ? "Consultando dados reais do banco…" : "Métrica indisponível no momento.";

  const carregarResumo = useCallback(async () => {
    if (!podeConsultarResumo) return;
    const resposta = await obterResumoAdministrativo();
    setResumo(resposta);
  }, [podeConsultarResumo]);

  const carregarUsuarios = useCallback(async () => {
    if (!podeGerenciarAcessos) return;
    const resposta = await listarUsuariosAdministrativos(buscaUsuario.trim(), statusUsuario, paginaUsuarios * LIMITE, LIMITE);
    setUsuarios(resposta.usuarios);
    setTotalUsuarios(resposta.total);
  }, [buscaUsuario, paginaUsuarios, podeGerenciarAcessos, statusUsuario]);

  const carregarPapeis = useCallback(async () => {
    if (!podeGerenciarAcessos) return;
    const [respostaPapeis, respostaPermissoes] = await Promise.all([
      listarPapeisAdministrativos(true),
      listarPermissoesAdministrativas(),
    ]);
    setPapeis(respostaPapeis.papeis);
    setPermissoes(respostaPermissoes.permissoes);
  }, [podeGerenciarAcessos]);

  const carregarAuditoria = useCallback(async () => {
    if (!podeConsultarAuditoria) return;
    const resposta = await listarAuditoria(filtroEvento.trim(), LIMITE, paginaAuditoria * LIMITE);
    setRegistros(resposta.registros);
    setTotalAuditoria(resposta.total);
  }, [filtroEvento, paginaAuditoria, podeConsultarAuditoria]);

  const recarregarTudo = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const consultas = [
        carregarResumo(),
        carregarUsuarios(),
        carregarPapeis(),
      ];
      if (abaAtual === "auditoria" && podeConsultarAuditoria) consultas.push(carregarAuditoria());
      await Promise.all(consultas);
    } catch {
      setErro("Não foi possível carregar os dados administrativos. Verifique a conexão e suas permissões.");
    } finally {
      setCarregando(false);
    }
  }, [abaAtual, carregarAuditoria, carregarPapeis, carregarResumo, carregarUsuarios, podeConsultarAuditoria]);

  useEffect(() => { void recarregarTudo(); }, [recarregarTudo]);

  function limparEditorPapel() {
    setPapelSelecionado(null);
    setNomePapel("");
    setDescricaoPapel("");
    setIdsPermissoes([]);
  }

  function editarPapel(papel: Papel) {
    setPapelSelecionado(papel);
    setNomePapel(papel.nomePapel);
    setDescricaoPapel(papel.descricaoPapel);
    setIdsPermissoes([...papel.idsPermissoes]);
    setErro(null);
    setMensagem(null);
  }

  function alternarPermissao(idPermissao: string) {
    setIdsPermissoes(atuais => atuais.includes(idPermissao) ? atuais.filter(id => id !== idPermissao) : [...atuais, idPermissao]);
  }

  async function salvarPapel(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    setSalvando(true);
    try {
      if (!papelSelecionado) {
        const motivo = motivoAdministrativo("criar um novo papel de acesso");
        if (!motivo) return;
        const resposta = await criarPapelAdministrativo(nomePapel.trim().toLowerCase(), descricaoPapel.trim(), idsPermissoes, motivo);
        if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "A criação do papel não foi aceita.");
        setMensagem("Papel criado com a matriz inicial de permissões.");
      } else {
        const protegido = papelSelecionado.nomePapel === "administrador";
        const motivo = !protegido ? motivoAdministrativo(`alterar a matriz do papel “${papelSelecionado.nomePapel}”`) : null;
        if (!protegido && !motivo) return;
        if (!protegido && !papelSelecionado.papelSistema) {
          const resposta = await atualizarPapelAdministrativo(papelSelecionado.idPapel, nomePapel.trim().toLowerCase(), descricaoPapel.trim(), idsPermissoes, motivo!);
          if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "Não foi possível atualizar o papel.");
        } else if (!protegido) {
          const resposta = await definirPermissoesPapelAdministrativo(papelSelecionado.idPapel, idsPermissoes, motivo!);
          if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "Não foi possível salvar a matriz.");
        }
        setMensagem(protegido ? "O papel administrador é protegido pelo sistema." : "Papel e matriz de permissões atualizados. As sessões associadas foram revogadas.");
      }
      limparEditorPapel();
      await Promise.all([carregarPapeis(), carregarResumo()]);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível salvar o papel.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarEstadoPapel(papel: Papel) {
    setErro(null);
    setMensagem(null);
    const arquivar = papel.statusPapel === "ativo";
    if (papel.papelSistema) {
      setErro("Os papéis base do sistema não podem ser arquivados.");
      return;
    }
    if (arquivar && !window.confirm(`Arquivar o papel “${papel.nomePapel}”? Ele só poderá ser arquivado quando não estiver atribuído a usuários.`)) return;
    const motivo = motivoAdministrativo(`${arquivar ? "arquivar" : "restaurar"} o papel “${papel.nomePapel}”`);
    if (!motivo) return;
    setSalvando(true);
    try {
      const resposta = arquivar ? await arquivarPapelAdministrativo(papel.idPapel, motivo) : await restaurarPapelAdministrativo(papel.idPapel, motivo);
      if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "A operação não foi aceita.");
      setMensagem(arquivar ? "Papel arquivado." : "Papel restaurado.");
      await Promise.all([carregarPapeis(), carregarResumo()]);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível alterar o estado do papel.");
    } finally {
      setSalvando(false);
    }
  }

  function editarPapeisUsuario(usuario: Usuario) {
    setPapelUsuario(usuario);
    setIdsPapeisUsuario(usuario.papeis.filter(papel => papel.statusPapel === "ativo").map(papel => papel.idPapel));
    setErro(null);
    setMensagem(null);
  }

  async function salvarPapeisUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!papelUsuario) return;
    const motivo = motivoAdministrativo(`alterar os papéis de ${papelUsuario.nomeUsuario}`);
    if (!motivo) return;
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await definirPapeisUsuarioAdministrativo(papelUsuario.idUsuario, idsPapeisUsuario, motivo);
      if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "Não foi possível alterar os papéis.");
      setMensagem("Papéis atualizados e sessões existentes revogadas. O usuário precisará entrar novamente.");
      setPapelUsuario(null);
      await carregarUsuarios();
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível salvar os papéis do usuário.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatusUsuario(usuario: Usuario) {
    if (usuario.idUsuario === "") return;
    const proximoStatus = usuario.statusUsuario === "ativo" ? "bloqueado" : "ativo";
    if (usuario.statusUsuario === "anonimizado") {
      setErro("Contas anonimizadas não podem ser reativadas por esta tela.");
      return;
    }
    const motivo = motivoAdministrativo(`${proximoStatus === "bloqueado" ? "bloquear" : "reativar"} ${usuario.emailUsuario}`);
    if (!motivo) return;
    if (!window.confirm(`${proximoStatus === "bloqueado" ? "Bloquear" : "Reativar"} a conta de ${usuario.nomeUsuario}?${proximoStatus === "bloqueado" ? " As sessões ativas serão encerradas." : ""}`)) return;
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await alterarStatusUsuarioAdministrativo(usuario.idUsuario, proximoStatus, motivo);
      if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "A operação não foi aceita.");
      setMensagem(proximoStatus === "bloqueado" ? "Conta bloqueada; sessões ativas encerradas." : "Conta reativada.");
      await Promise.all([carregarUsuarios(), carregarResumo()]);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível alterar o status da conta.");
    } finally {
      setSalvando(false);
    }
  }

  async function revogarSessoes(usuario: Usuario) {
    const motivo = motivoAdministrativo(`revogar as sessões de ${usuario.emailUsuario}`);
    if (!motivo) return;
    if (!window.confirm(`Encerrar todas as sessões ativas de ${usuario.nomeUsuario}?`)) return;
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await revogarSessoesUsuarioAdministrativo(usuario.idUsuario, motivo);
      setMensagem(`${resposta.quantidadeRevogada} sessão(ões) revogada(s).`);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível revogar as sessões.");
    } finally {
      setSalvando(false);
    }
  }

  const inicioUsuarios = totalUsuarios === 0 ? 0 : paginaUsuarios * LIMITE + 1;
  const fimUsuarios = Math.min(totalUsuarios, (paginaUsuarios + 1) * LIMITE);
  const inicioAuditoria = totalAuditoria === 0 ? 0 : paginaAuditoria * LIMITE + 1;
  const fimAuditoria = Math.min(totalAuditoria, (paginaAuditoria + 1) * LIMITE);

  if (!podeConsultarResumo && !podeGerenciarAcessos && !podeConsultarAuditoria) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <CabecalhoPagina
        icone={ShieldCheck}
        tom="verde"
        titulo="Administração"
        descricao="Gerencie contas, papéis de acesso e acompanhe o histórico de ações. Toda mudança de acesso fica registrada."
        acoes={<button type="button" onClick={() => void recarregarTudo()} disabled={carregando} className={ESTILOS.botaoSecundario}><RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} aria-hidden="true" /> Atualizar</button>}
      >
        {podeConsultarResumo ? <section aria-label="Resumo da plataforma" className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          <Indicador titulo="Usuários ativos" valor={resumo?.quantidadeUsuarios ?? null} detalhe={detalheResumo("Contas com acesso liberado")} icone={Users} tom="verde" />
          <Indicador titulo="Papéis ativos" valor={resumo?.quantidadePapeis ?? null} detalhe={detalheResumo("O papel administrador é protegido")} icone={ShieldCheck} tom="azul" />
          <Indicador titulo="Conteúdos publicados" valor={resumo?.quantidadeMateriaisPublicados ?? null} detalhe={resumo ? `${resumo.quantidadeMateriais.toLocaleString("pt-BR")} materiais no catálogo` : detalheResumo("")} icone={Check} tom="roxo" />
          <Indicador titulo="Pontos pendentes" valor={resumo?.quantidadePontosPendentes ?? null} detalhe={detalheResumo("Aguardam revisão")} icone={CircleAlert} tom="amarelo" />
          <Indicador titulo="Eventos registrados" valor={resumo?.quantidadeEventosAuditoria ?? null} detalhe={detalheResumo("Disponíveis na auditoria")} icone={FileClock} tom="marrom" />
          <Indicador titulo="Avaliações autorizadas" valor={resumo?.quantidadeAvaliacoes ?? null} detalhe={detalheResumo("Com consentimento para análise")} icone={ShieldCheck} tom="cinza" />
        </section> : null}
      </CabecalhoPagina>

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {mensagem ? <Aviso tipo="sucesso"><span className="flex items-start gap-2"><Check className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />{mensagem}</span></Aviso> : null}

      {abasDisponiveis.length ? (
        <Abas
          rotulo="Seções administrativas"
          abas={abasDisponiveis.map(({ id, titulo, icone }) => ({ id, rotulo: titulo, icone }))}
          ativa={abaAtual}
          onChange={id => { setAba(id); setErro(null); setMensagem(null); }}
        />
      ) : null}

      {podeGerenciarAcessos && abaAtual === "usuarios" ? (
        <section id={`painel-${abaAtual}`} className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[24px] border border-[#e1ebe2] bg-white p-4 sm:flex-row sm:p-5">
            <CampoBusca rotulo="Buscar usuário" valor={buscaUsuario} onChange={valor => { setBuscaUsuario(valor); setPaginaUsuarios(0); }} placeholder="Buscar por nome ou e-mail" />
            <label className="block sm:w-56">
              <span className="sr-only">Filtrar por situação da conta</span>
              <select value={statusUsuario} onChange={event => { setStatusUsuario(event.target.value); setPaginaUsuarios(0); }} className={`${ESTILOS.campo} font-semibold`}><option value="todos">Todas as situações</option><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option><option value="anonimizado">Anonimizado</option></select>
            </label>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#e1ebe2] bg-white">
            <ul className="divide-y divide-[#edf2ed] sm:hidden">
              {usuarios.map(usuario => (
                <li key={usuario.idUsuario} className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6f5ec] text-[#2f9a5f]"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                      <strong className="block break-words text-[15px] font-black text-[#17362a]">{usuario.nomeUsuario}</strong>
                      <span className="block break-all text-sm text-[#6c8879]">{usuario.emailUsuario}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusEtiqueta status={usuario.statusUsuario} />
                    <Etiqueta tom={usuario.emailVerificado ? "azul" : "amarelo"}>{usuario.emailVerificado ? "E-mail verificado" : "E-mail pendente"}</Etiqueta>
                    {usuario.papeis.map(papel => <Etiqueta key={papel.idPapel} tom="cinza" icone={KeyRound}>{papel.nomePapel}</Etiqueta>)}
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="font-semibold text-[#6c8879]">Criada em</dt><dd className="font-bold text-[#244637]">{dataLocal(usuario.dataCriacao)}</dd></div>
                    <div><dt className="font-semibold text-[#6c8879]">Último acesso</dt><dd className="font-bold text-[#244637]">{dataLocal(usuario.dataUltimoAcesso)}</dd></div>
                  </dl>
                  <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
                    <button type="button" disabled={salvando || usuario.statusUsuario === "anonimizado"} onClick={() => void alterarStatusUsuario(usuario)} className={usuario.statusUsuario === "ativo" ? ESTILOS.botaoPerigo : ESTILOS.botaoSecundario}>{usuario.statusUsuario === "ativo" ? <Ban className="h-4 w-4" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}{usuario.statusUsuario === "ativo" ? "Bloquear" : "Reativar"}</button>
                    <button type="button" disabled={salvando || usuario.idUsuario === ""} onClick={() => editarPapeisUsuario(usuario)} className={ESTILOS.botaoSecundario}><KeyRound className="h-4 w-4" aria-hidden="true" />Papéis</button>
                    <button type="button" disabled={salvando} onClick={() => void revogarSessoes(usuario)} className={ESTILOS.botaoSecundario}><LockKeyhole className="h-4 w-4" aria-hidden="true" />Desconectar</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className={ESTILOS.tabelaCabecalho}><tr><th className="px-4 py-3">Conta</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Papéis</th><th className="px-4 py-3">Criada em</th><th className="px-4 py-3">Último acesso</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-[#edf2ed]">
                  {usuarios.map(usuario => (
                    <tr key={usuario.idUsuario} className="align-top transition hover:bg-[#fafcf9]">
                      <td className="px-4 py-4"><strong className="block font-black text-[#17362a]">{usuario.nomeUsuario}</strong><span className="mt-0.5 block text-xs text-[#6c8879]">{usuario.emailUsuario}</span></td>
                      <td className="px-4 py-4"><StatusEtiqueta status={usuario.statusUsuario} /><span className="mt-2 block text-xs text-[#6c8879]">{usuario.emailVerificado ? "E-mail verificado" : "E-mail pendente"}</span></td>
                      <td className="px-4 py-4"><div className="flex max-w-56 flex-wrap gap-1">{usuario.papeis.map(papel => <Etiqueta key={papel.idPapel} tom="cinza">{papel.nomePapel}</Etiqueta>)}</div></td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-[#5c7768]">{dataLocal(usuario.dataCriacao)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-[#5c7768]">{dataLocal(usuario.dataUltimoAcesso)}</td>
                      <td className="px-4 py-4"><div className="flex justify-end gap-2">
                        <BotaoAcao rotulo={usuario.statusUsuario === "ativo" ? "Bloquear conta" : "Reativar conta"} icone={usuario.statusUsuario === "ativo" ? Ban : RotateCcw} perigo={usuario.statusUsuario === "ativo"} disabled={salvando || usuario.statusUsuario === "anonimizado"} onClick={() => void alterarStatusUsuario(usuario)} />
                        <BotaoAcao rotulo="Gerenciar papéis" icone={KeyRound} disabled={salvando || usuario.idUsuario === ""} onClick={() => editarPapeisUsuario(usuario)} />
                        <BotaoAcao rotulo="Desconectar de todos os aparelhos" icone={LockKeyhole} disabled={salvando} onClick={() => void revogarSessoes(usuario)} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!carregando && usuarios.length === 0 ? <div className="p-4"><EstadoVazio icone={Users} titulo="Nenhuma conta encontrada" descricao="Tente outro nome, e-mail ou situação." /></div> : null}
            <Paginacao inicio={inicioUsuarios} fim={fimUsuarios} total={totalUsuarios} unidade="usuários" pagina={paginaUsuarios + 1} podeVoltar={!(paginaUsuarios === 0 || carregando)} podeAvancar={!(fimUsuarios >= totalUsuarios || carregando)} onVoltar={() => setPaginaUsuarios(p => Math.max(0, p - 1))} onAvancar={() => setPaginaUsuarios(p => p + 1)} />
          </div>

          {papelUsuario ? (
            <form onSubmit={event => void salvarPapeisUsuario(event)} className="rounded-[24px] border border-[#cfe8d8] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6f5ec] text-[#2f9a5f]"><KeyRound className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0"><h3 className="break-words text-lg font-black leading-tight text-[#17362a]">Papéis de {papelUsuario.nomeUsuario}</h3><p className="mt-1 text-sm leading-6 text-[#6c8879]">Ao salvar, a pessoa precisará entrar de novo. Você não pode alterar os seus próprios papéis.</p></div>
                </div>
                <button type="button" onClick={() => setPapelUsuario(null)} className={ESTILOS.botaoIcone} aria-label="Fechar"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {papeisAtivos.map(papel => {
                  const marcado = idsPapeisUsuario.includes(papel.idPapel);
                  return <label key={papel.idPapel} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-sm transition ${marcado ? "border-[#9fd0b0] bg-[#f1f9ef]" : "border-[#e1ebe2] hover:bg-[#fafcf9]"}`}><input type="checkbox" checked={marcado} onChange={() => setIdsPapeisUsuario(ids => ids.includes(papel.idPapel) ? ids.filter(id => id !== papel.idPapel) : [...ids, papel.idPapel])} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1d7953]" /><span className="min-w-0"><strong className="block font-black text-[#17362a]">{papel.nomePapel}</strong><span className="text-xs leading-5 text-[#6c8879]">{papel.descricaoPapel}</span></span></label>;
                })}
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setPapelUsuario(null)} className={ESTILOS.botaoSecundario}>Cancelar</button>
                <button type="submit" disabled={salvando || idsPapeisUsuario.length === 0} className={ESTILOS.botaoPrincipal}><Save className="h-4 w-4" aria-hidden="true" /> Salvar papéis</button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {podeGerenciarAcessos && abaAtual === "papeis" ? (
        <div id={`painel-${abaAtual}`} className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <section className="space-y-3">
            <div className="flex flex-col gap-3 rounded-[24px] border border-[#e1ebe2] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0"><h3 className="text-lg font-black leading-tight text-[#17362a]">Papéis da plataforma</h3><p className="mt-1 text-sm leading-6 text-[#6c8879]">Papéis base não podem ser renomeados nem arquivados. O papel administrador não pode ser alterado.</p></div>
              <button type="button" onClick={() => { limparEditorPapel(); setMensagem(null); }} className={`${ESTILOS.botaoPrincipal} shrink-0`}><Plus className="h-4 w-4" aria-hidden="true" /> Novo papel</button>
            </div>
            {papeis.map(papel => {
              const administrador = papel.nomePapel === "administrador";
              const selecionado = papelSelecionado?.idPapel === papel.idPapel;
              return (
                <article key={papel.idPapel} className={`rounded-[22px] border bg-white p-4 transition ${selecionado ? "border-[#68a87a] ring-4 ring-[#1d7953]/10" : "border-[#e1ebe2]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5"><h4 className="mr-1 break-words font-black text-[#17362a]">{papel.nomePapel}</h4><StatusEtiqueta status={papel.statusPapel} />{papel.papelSistema ? <Etiqueta tom="azul">Base</Etiqueta> : null}{administrador ? <Etiqueta tom="amarelo" icone={LockKeyhole}>Protegido</Etiqueta> : null}</div>
                      <p className="mt-2 text-sm leading-6 text-[#5c7768]">{papel.descricaoPapel}</p>
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-[#6c8879]"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{papel.quantidadeUsuarios} usuário(s)</span><span className="inline-flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" aria-hidden="true" />{papel.codigosPermissoes.length} permissão(ões)</span></p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 min-[400px]:flex-row">
                      <BotaoAcao rotulo={administrador ? "Ver permissões (protegido)" : "Editar papel e permissões"} icone={KeyRound} onClick={() => editarPapel(papel)} />
                      {!papel.papelSistema ? <BotaoAcao rotulo={papel.statusPapel === "ativo" ? "Arquivar papel" : "Restaurar papel"} icone={papel.statusPapel === "ativo" ? Archive : RotateCcw} disabled={salvando} onClick={() => void alterarEstadoPapel(papel)} /> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <form onSubmit={event => void salvarPapel(event)} className="h-fit rounded-[24px] border border-[#e1ebe2] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f0fa] text-[#2f6fb0]">{papelSelecionado ? <KeyRound className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}</span>
                <div className="min-w-0"><h3 className="break-words text-lg font-black leading-tight text-[#17362a]">{papelSelecionado ? `Editar ${papelSelecionado.nomePapel}` : "Criar papel"}</h3><p className="mt-0.5 text-sm text-[#6c8879]">Escolha o que este papel pode fazer.</p></div>
              </div>
              {papelSelecionado ? <button type="button" onClick={limparEditorPapel} className={ESTILOS.botaoIcone} aria-label="Limpar editor"><X className="h-5 w-5" /></button> : null}
            </div>
            <label className="mt-5 block"><span className={ESTILOS.rotulo}>Nome do papel</span><input required minLength={3} maxLength={60} pattern="[a-z][a-z0-9_]{2,59}" value={nomePapel} onChange={event => setNomePapel(event.target.value.toLowerCase())} disabled={Boolean(papelSelecionado?.papelSistema)} placeholder="ex.: moderador_local" className={ESTILOS.campo} /></label>
            <label className="mt-4 block"><span className={ESTILOS.rotulo}>Descrição</span><textarea required minLength={3} maxLength={1000} rows={2} value={descricaoPapel} onChange={event => setDescricaoPapel(event.target.value)} disabled={Boolean(papelSelecionado?.papelSistema)} placeholder="O que as pessoas com este papel fazem?" className={`${ESTILOS.areaTexto} min-h-20 disabled:cursor-not-allowed disabled:bg-[#f4f7f4] disabled:text-[#8aa094]`} /></label>
            {papelSelecionado?.nomePapel === "administrador" ? <div className="mt-4"><Aviso tipo="atencao">O papel administrador é protegido e é o único que pode gerenciar acessos.</Aviso></div> : null}
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-black text-[#17362a]">Permissões</h4><Etiqueta tom="verde" icone={Check}>{idsPermissoes.length} selecionada(s)</Etiqueta></div>
              <div className="mt-3 max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {permissoesAtivas.map(permissao => {
                  const exclusiva = permissao.codigoPermissao === PERMISSAO_EXCLUSIVA;
                  const administrador = papelSelecionado?.nomePapel === "administrador";
                  const marcada = idsPermissoes.includes(permissao.idPermissao);
                  return (
                    <label key={permissao.idPermissao} className={`flex items-start gap-3 rounded-2xl border p-3.5 text-sm transition ${exclusiva ? "border-[#f3e2b4] bg-[#fff9e9]" : marcada ? "border-[#9fd0b0] bg-[#f1f9ef]" : "border-[#e1ebe2] bg-[#fbfdfb]"}`}>
                      <input type="checkbox" checked={marcada} disabled={administrador || exclusiva} onChange={() => alternarPermissao(permissao.idPermissao)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1d7953]" />
                      <span className="min-w-0">
                        <strong className="block font-black text-[#17362a]">{permissao.nomePermissao}</strong>
                        <span className="block break-all font-mono text-[11px] text-[#6c8879]">{permissao.codigoPermissao}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#5c7768]">{permissao.descricaoPermissao}</span>
                        {exclusiva ? <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#8a5d06]"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />Só o papel administrador tem esta permissão</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            {papelSelecionado?.papelSistema && papelSelecionado.nomePapel !== "administrador" ? <p className="mt-4 text-xs leading-5 text-[#6c8879]">Este papel base não pode ser renomeado nem arquivado, mas as permissões podem mudar. Será pedida uma justificativa e as pessoas afetadas precisarão entrar de novo.</p> : null}
            {!papelSelecionado?.papelSistema ? <p className="mt-4 text-xs leading-5 text-[#6c8879]">Nome: 3 a 60 caracteres, só letras minúsculas, números e _. A permissão de gerenciar acessos é exclusiva do administrador.</p> : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="submit" disabled={salvando || !nomePapel.trim() || !descricaoPapel.trim() || papelSelecionado?.nomePapel === "administrador"} className={ESTILOS.botaoPrincipal}>{salvando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{papelSelecionado ? "Salvar alterações" : "Criar papel"}</button></div>
          </form>
        </div>
      ) : null}

      {podeConsultarAuditoria && abaAtual === "auditoria" ? (
        <section id={`painel-${abaAtual}`} className="space-y-4">
          <div className="flex flex-col gap-4 rounded-[24px] border border-[#e1ebe2] bg-white p-4 sm:p-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5ece4] text-[#8a5a34]"><FileClock className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0"><h3 className="text-lg font-black leading-tight text-[#17362a]">Histórico de ações</h3><p className="mt-0.5 text-sm leading-6 text-[#6c8879]">Somente leitura. Dados sensíveis ficam ocultos.</p></div>
            </div>
            <div className="lg:w-80"><CampoBusca rotulo="Filtrar eventos" valor={filtroEvento} onChange={valor => { setFiltroEvento(valor); setPaginaAuditoria(0); }} placeholder="Filtrar por tipo de evento" /></div>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-[#e1ebe2] bg-white">
            <ul className="divide-y divide-[#edf2ed] sm:hidden">
              {registros.map(registro => (
                <li key={registro.idRegistroAuditoria} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3"><strong className="min-w-0 break-words font-black text-[#17362a]">{registro.tipoEvento}</strong><span className="shrink-0 text-xs font-semibold text-[#6c8879]">{dataLocal(registro.dataCriacao)}</span></div>
                  <dl className="grid gap-1.5 text-xs">
                    <div className="flex gap-2"><dt className="w-20 shrink-0 font-semibold text-[#6c8879]">Recurso</dt><dd className="min-w-0 break-all font-bold text-[#244637]">{registro.recursoEvento || "—"}{registro.idRecurso ? <span className="block font-normal text-[#82968a]">{registro.idRecurso}</span> : null}</dd></div>
                    <div className="flex gap-2"><dt className="w-20 shrink-0 font-semibold text-[#6c8879]">Feito por</dt><dd className="min-w-0 break-all text-[#244637]">{registro.idUsuario || "Sistema"}</dd></div>
                    <div className="flex gap-2"><dt className="w-20 shrink-0 font-semibold text-[#6c8879]">Correlação</dt><dd className="min-w-0 truncate font-mono text-[11px] text-[#82968a]" title={registro.idCorrelacao}>{registro.idCorrelacao || "—"}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className={ESTILOS.tabelaCabecalho}><tr><th className="px-4 py-3">Evento</th><th className="px-4 py-3">Recurso</th><th className="px-4 py-3">Feito por</th><th className="px-4 py-3">Correlação</th><th className="px-4 py-3">Data</th></tr></thead>
                <tbody className="divide-y divide-[#edf2ed]">
                  {registros.map(registro => (
                    <tr key={registro.idRegistroAuditoria} className="transition hover:bg-[#fafcf9]">
                      <td className="px-4 py-4"><strong className="font-black text-[#17362a]">{registro.tipoEvento}</strong></td>
                      <td className="px-4 py-4"><span className="block text-xs font-bold text-[#244637]">{registro.recursoEvento || "—"}</span><span className="mt-1 block max-w-40 truncate text-[11px] text-[#82968a]">{registro.idRecurso || ""}</span></td>
                      <td className="px-4 py-4 text-xs text-[#5c7768]">{registro.idUsuario || "Sistema"}</td>
                      <td className="max-w-48 truncate px-4 py-4 font-mono text-[11px] text-[#82968a]" title={registro.idCorrelacao}>{registro.idCorrelacao || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-[#5c7768]">{dataLocal(registro.dataCriacao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!carregando && registros.length === 0 ? <div className="p-4"><EstadoVazio icone={FileClock} tom="marrom" titulo="Nenhum evento encontrado" descricao="Tente outro tipo de evento." /></div> : null}
            <Paginacao inicio={inicioAuditoria} fim={fimAuditoria} total={totalAuditoria} unidade="eventos" pagina={paginaAuditoria + 1} podeVoltar={!(paginaAuditoria === 0 || carregando)} podeAvancar={!(fimAuditoria >= totalAuditoria || carregando)} onVoltar={() => setPaginaAuditoria(p => Math.max(0, p - 1))} onAvancar={() => setPaginaAuditoria(p => p + 1)} />
          </div>
        </section>
      ) : null}

      {carregando ? <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#6c8879]" role="status"><LoaderCircle className="h-4 w-4 animate-spin text-[#1d7953]" aria-hidden="true" />Carregando dados…</p> : null}
      {salvando ? <div className="sr-only" aria-live="polite">Salvando alteração administrativa.</div> : null}
    </div>
  );
}
