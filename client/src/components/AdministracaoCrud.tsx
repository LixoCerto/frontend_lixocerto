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
  Users,
  X,
} from "lucide-react";
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

function Indicador({ titulo, valor, detalhe, icone: Icone }: { titulo: string; valor: number; detalhe: string; icone: typeof Users }) {
  return (
    <article className="rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-28px_rgba(19,62,43,.65)]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold text-[#7c9386]">{titulo}</p><strong className="mt-2 block text-2xl font-black text-[#17362a]">{valor.toLocaleString("pt-BR")}</strong></div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f5e7] text-[#23734d]"><Icone className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#6c8879]">{detalhe}</p>
    </article>
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
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-3xl"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3d9664]">Governança</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#17362a] sm:text-3xl">Administração da plataforma</h2><p className="mt-2 text-sm leading-6 text-[#668073]">Contas, papéis, matriz de permissões e trilha de auditoria. Mudanças de acesso são registradas e revogam sessões quando necessário.</p></div>
        <button type="button" onClick={() => void recarregarTudo()} disabled={carregando} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce8de] bg-white px-4 py-2.5 text-sm font-black text-[#315c47] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar</button>
      </header>

      {erro ? <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{erro}</div> : null}
      {mensagem ? <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><Check className="mt-0.5 h-4 w-4 shrink-0" />{mensagem}</div> : null}

      {podeConsultarResumo ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Indicador titulo="Usuários ativos" valor={resumo?.quantidadeUsuarios ?? 0} detalhe="Contas com acesso ativo" icone={Users} />
        <Indicador titulo="Papéis ativos" valor={resumo?.quantidadePapeis ?? 0} detalhe="Papel administrador protegido" icone={ShieldCheck} />
        <Indicador titulo="Conteúdos publicados" valor={resumo?.quantidadeMateriaisPublicados ?? 0} detalhe={`${(resumo?.quantidadeMateriais ?? 0).toLocaleString("pt-BR")} materiais no catálogo`} icone={Check} />
        <Indicador titulo="Pontos pendentes" valor={resumo?.quantidadePontosPendentes ?? 0} detalhe="Aguardam revisão administrativa" icone={CircleAlert} />
        <Indicador titulo="Eventos auditáveis" valor={resumo?.quantidadeEventosAuditoria ?? 0} detalhe="Registros disponíveis para consulta" icone={FileClock} />
        <Indicador titulo="Avaliações consentidas" valor={resumo?.quantidadeAvaliacoes ?? 0} detalhe="Sessões autorizadas para análise agregada" icone={ShieldCheck} />
      </section> : null}

      {abasDisponiveis.length ? <div className="flex flex-wrap gap-2 border-b border-[#e1ebe2] pb-3" role="tablist" aria-label="Seções administrativas">
        {abasDisponiveis.map(({ id, titulo, icone: Icone }) => <button key={id} type="button" role="tab" aria-selected={abaAtual === id} onClick={() => { setAba(id); setErro(null); setMensagem(null); }} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${abaAtual === id ? "bg-[#1d7953] text-white" : "bg-white text-[#5d796a] hover:bg-[#edf3ed]"}`}><Icone className="h-4 w-4" />{titulo}</button>)}
      </div> : null}

      {podeGerenciarAcessos && abaAtual === "usuarios" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#e0eae1] bg-white p-4 sm:flex-row">
            <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-[#d9e6db] px-3 py-2.5"><Search className="h-4 w-4 text-[#638775]" /><input value={buscaUsuario} onChange={event => { setBuscaUsuario(event.target.value); setPaginaUsuarios(0); }} placeholder="Buscar nome ou e-mail" className="w-full bg-transparent text-sm outline-none" /></label>
            <select value={statusUsuario} onChange={event => { setStatusUsuario(event.target.value); setPaginaUsuarios(0); }} className="rounded-xl border border-[#d9e6db] bg-white px-3 py-2.5 text-sm font-semibold"><option value="todos">Todos os status</option><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option><option value="anonimizado">Anonimizado</option></select>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#e0eae1] bg-white">
            <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#f5faf4] text-[11px] uppercase tracking-wide text-[#688574]"><tr><th className="px-4 py-3">Conta</th><th className="px-4 py-3">Status e verificação</th><th className="px-4 py-3">Papéis</th><th className="px-4 py-3">Criada</th><th className="px-4 py-3">Último acesso</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-[#edf2ed]">{usuarios.map(usuario => <tr key={usuario.idUsuario} className="align-top"><td className="px-4 py-4"><strong className="block text-[#244637]">{usuario.nomeUsuario}</strong><span className="mt-1 block text-xs text-[#71897b]">{usuario.emailUsuario}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${usuario.statusUsuario === "ativo" ? "bg-emerald-100 text-emerald-800" : usuario.statusUsuario === "bloqueado" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{usuario.statusUsuario}</span><span className="mt-2 block text-xs text-[#71897b]">{usuario.emailVerificado ? "E-mail verificado" : "E-mail pendente"}</span></td><td className="px-4 py-4"><div className="flex max-w-56 flex-wrap gap-1">{usuario.papeis.map(papel => <span key={papel.idPapel} className="rounded-lg bg-[#eef5ed] px-2 py-1 text-[10px] font-bold text-[#55715d]">{papel.nomePapel}</span>)}</div></td><td className="whitespace-nowrap px-4 py-4 text-xs text-[#71897b]">{dataLocal(usuario.dataCriacao)}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-[#71897b]">{dataLocal(usuario.dataUltimoAcesso)}</td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" disabled={salvando || usuario.statusUsuario === "anonimizado"} onClick={() => void alterarStatusUsuario(usuario)} title={usuario.statusUsuario === "ativo" ? "Bloquear conta" : "Reativar conta"} className="rounded-lg border border-[#e0eae1] p-2 text-[#55715d] hover:bg-[#f5faf4] disabled:opacity-40">{usuario.statusUsuario === "ativo" ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</button><button type="button" disabled={salvando || usuario.idUsuario === ""} onClick={() => editarPapeisUsuario(usuario)} title="Gerenciar papéis" className="rounded-lg border border-[#e0eae1] p-2 text-[#55715d] hover:bg-[#f5faf4] disabled:opacity-40"><KeyRound className="h-4 w-4" /></button><button type="button" disabled={salvando} onClick={() => void revogarSessoes(usuario)} title="Revogar sessões" className="rounded-lg border border-[#e0eae1] p-2 text-[#55715d] hover:bg-[#f5faf4] disabled:opacity-40"><LockKeyhole className="h-4 w-4" /></button></div></td></tr>)}
              {!carregando && usuarios.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm font-semibold text-[#71897b]">Nenhuma conta corresponde aos filtros.</td></tr> : null}
            </tbody></table></div>
            <div className="flex flex-col gap-3 border-t border-[#edf2ed] px-4 py-3 text-xs font-semibold text-[#71897b] sm:flex-row sm:items-center sm:justify-between"><span>{inicioUsuarios}–{fimUsuarios} de {totalUsuarios.toLocaleString("pt-BR")} usuários</span><div className="flex items-center gap-2"><button type="button" disabled={paginaUsuarios === 0 || carregando} onClick={() => setPaginaUsuarios(p => Math.max(0, p - 1))} className="rounded-lg border border-[#dce8de] p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {paginaUsuarios + 1}</span><button type="button" disabled={fimUsuarios >= totalUsuarios || carregando} onClick={() => setPaginaUsuarios(p => p + 1)} className="rounded-lg border border-[#dce8de] p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
          </div>
          {papelUsuario ? <form onSubmit={event => void salvarPapeisUsuario(event)} className="rounded-2xl border border-[#cfe3d3] bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#244637]">Papéis de {papelUsuario.nomeUsuario}</h3><p className="mt-1 text-xs text-[#71897b]">Salvar revoga as sessões da conta. Alterações do próprio administrador são bloqueadas pela API.</p></div><button type="button" onClick={() => setPapelUsuario(null)} className="rounded-lg p-2 text-[#71897b] hover:bg-[#f3f7f2]" aria-label="Fechar"><X className="h-4 w-4" /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{papeisAtivos.map(papel => <label key={papel.idPapel} className="flex items-start gap-3 rounded-xl border border-[#e4ece4] p-3 text-sm"><input type="checkbox" checked={idsPapeisUsuario.includes(papel.idPapel)} onChange={() => setIdsPapeisUsuario(ids => ids.includes(papel.idPapel) ? ids.filter(id => id !== papel.idPapel) : [...ids, papel.idPapel])} className="mt-1 accent-[#1d7953]" /><span><strong className="block text-[#315c47]">{papel.nomePapel}</strong><span className="text-xs text-[#71897b]">{papel.descricaoPapel}</span></span></label>)}</div><div className="mt-4 flex justify-end"><button type="submit" disabled={salvando || idsPapeisUsuario.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> Salvar papéis</button></div></form> : null}
        </section>
      ) : null}

      {podeGerenciarAcessos && abaAtual === "papeis" ? (
        <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-[#244637]">Papéis da plataforma</h3><p className="mt-1 text-xs text-[#71897b]">Papéis base não podem ser renomeados ou arquivados; apenas o papel administrador tem matriz imutável.</p></div><button type="button" onClick={() => { limparEditorPapel(); setMensagem(null); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#1d7953] px-3 py-2 text-xs font-black text-white"><Plus className="h-4 w-4" /> Novo papel</button></div>
            {papeis.map(papel => { const administrador = papel.nomePapel === "administrador"; return <article key={papel.idPapel} className={`rounded-2xl border bg-white p-4 ${papelSelecionado?.idPapel === papel.idPapel ? "border-[#68a87a] ring-2 ring-[#dcefdc]" : "border-[#e1ebe2]"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-black text-[#244637]">{papel.nomePapel}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${papel.statusPapel === "ativo" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{papel.statusPapel}</span>{papel.papelSistema ? <span className="rounded-full bg-[#edf3ed] px-2 py-0.5 text-[10px] font-black text-[#55715d]">Base</span> : null}{administrador ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">Protegido</span> : null}</div><p className="mt-2 text-xs leading-5 text-[#71897b]">{papel.descricaoPapel}</p><p className="mt-2 text-[11px] font-bold text-[#6d8a7b]">{papel.quantidadeUsuarios} usuário(s) · {papel.codigosPermissoes.length} permissão(ões)</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => editarPapel(papel)} title={administrador ? "Visualizar matriz protegida" : "Editar papel e matriz"} className="rounded-lg border border-[#e0eae1] p-2 text-[#55715d] hover:bg-[#f5faf4]"><KeyRound className="h-4 w-4" /></button>{!papel.papelSistema ? <button type="button" disabled={salvando} onClick={() => void alterarEstadoPapel(papel)} title={papel.statusPapel === "ativo" ? "Arquivar papel" : "Restaurar papel"} className="rounded-lg border border-[#e0eae1] p-2 text-[#55715d] hover:bg-[#f5faf4] disabled:opacity-40">{papel.statusPapel === "ativo" ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}</button> : null}</div></div></article>; })}
          </section>

          <form onSubmit={event => void salvarPapel(event)} className="rounded-2xl border border-[#e1ebe2] bg-white p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#3d9664]">Matriz de acesso</p><h3 className="mt-1 text-lg font-black text-[#244637]">{papelSelecionado ? `Editar ${papelSelecionado.nomePapel}` : "Criar papel"}</h3></div>{papelSelecionado ? <button type="button" onClick={limparEditorPapel} className="rounded-lg p-2 text-[#71897b] hover:bg-[#f3f7f2]" aria-label="Limpar editor"><X className="h-4 w-4" /></button> : null}</div>
            <label className="mt-4 block text-xs font-black text-[#55715d]">Identificador do papel<input required minLength={3} maxLength={60} pattern="[a-z][a-z0-9_]{2,59}" value={nomePapel} onChange={event => setNomePapel(event.target.value.toLowerCase())} disabled={Boolean(papelSelecionado?.papelSistema)} placeholder="ex.: moderador_local" className="mt-1.5 w-full rounded-xl border border-[#d9e6db] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#4e9b68] disabled:bg-[#f3f7f2]" /></label>
            <label className="mt-3 block text-xs font-black text-[#55715d]">Descrição<textarea required minLength={3} maxLength={1000} rows={2} value={descricaoPapel} onChange={event => setDescricaoPapel(event.target.value)} disabled={Boolean(papelSelecionado?.papelSistema)} placeholder="Responsabilidades e escopo deste papel" className="mt-1.5 w-full rounded-xl border border-[#d9e6db] px-3 py-2.5 text-sm font-medium outline-none focus:border-[#4e9b68] disabled:bg-[#f3f7f2]" /></label>
            {papelSelecionado?.nomePapel === "administrador" ? <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />A matriz do papel administrador é protegida e inclui a permissão exclusiva de gestão de acessos.</div> : null}
            <div className="mt-4"><div className="flex items-center justify-between"><h4 className="text-xs font-black uppercase tracking-wide text-[#55715d]">Permissões disponíveis</h4><span className="text-[10px] font-bold text-[#7c9386]">{idsPermissoes.length} selecionada(s)</span></div><div className="mt-2 max-h-[440px] space-y-2 overflow-y-auto pr-1">{permissoesAtivas.map(permissao => { const exclusiva = permissao.codigoPermissao === PERMISSAO_EXCLUSIVA; const administrador = papelSelecionado?.nomePapel === "administrador"; const marcada = idsPermissoes.includes(permissao.idPermissao); return <label key={permissao.idPermissao} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${exclusiva ? "border-amber-100 bg-amber-50/70" : "border-[#e8eee8] bg-[#fbfdfb]"}`}><input type="checkbox" checked={marcada} disabled={administrador || exclusiva} onChange={() => alternarPermissao(permissao.idPermissao)} className="mt-1 accent-[#1d7953]" /><span className="min-w-0"><strong className="block text-[#315c47]">{permissao.nomePermissao}</strong><span className="block text-[11px] font-bold text-[#71897b]">{permissao.codigoPermissao}</span><span className="mt-1 block text-xs leading-5 text-[#7a9183]">{permissao.descricaoPermissao}</span>{exclusiva ? <span className="mt-1 block text-[10px] font-black text-amber-900">Exclusiva do papel administrador</span> : null}</span></label>; })}</div></div>
            {papelSelecionado?.papelSistema && papelSelecionado.nomePapel !== "administrador" ? <p className="mt-3 text-[11px] leading-5 text-[#71897b]">Este papel base não pode ser renomeado nem arquivado. A matriz pode ser ajustada; a ação exige justificativa e encerra as sessões dos usuários afetados.</p> : null}
            {!papelSelecionado?.papelSistema ? <p className="mt-3 text-[11px] leading-5 text-[#71897b]">Identificadores: 3–60 caracteres, minúsculas, números e _. A permissão administrativa exclusiva não pode ser atribuída a papéis customizados.</p> : null}
            <div className="mt-5 flex justify-end"><button type="submit" disabled={salvando || !nomePapel.trim() || !descricaoPapel.trim() || papelSelecionado?.nomePapel === "administrador"} className="inline-flex items-center gap-2 rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{salvando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{papelSelecionado ? "Salvar alterações" : "Criar papel"}</button></div>
          </form>
        </div>
      ) : null}

      {podeConsultarAuditoria && abaAtual === "auditoria" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#e0eae1] bg-white p-4 sm:flex-row sm:items-center"><div className="flex-1"><h3 className="font-black text-[#244637]">Trilha de auditoria</h3><p className="mt-1 text-xs text-[#71897b]">Consulta somente leitura; detalhes sensíveis são redigidos no servidor.</p></div><label className="flex min-w-64 items-center gap-2 rounded-xl border border-[#d9e6db] px-3 py-2.5"><Search className="h-4 w-4 text-[#638775]" /><input value={filtroEvento} onChange={event => { setFiltroEvento(event.target.value); setPaginaAuditoria(0); }} placeholder="Filtrar por tipo de evento" className="w-full bg-transparent text-sm outline-none" /></label></div>
          <div className="overflow-hidden rounded-2xl border border-[#e0eae1] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f5faf4] text-[11px] uppercase tracking-wide text-[#688574]"><tr><th className="px-4 py-3">Evento</th><th className="px-4 py-3">Recurso</th><th className="px-4 py-3">Ator</th><th className="px-4 py-3">Correlação</th><th className="px-4 py-3">Data</th></tr></thead><tbody className="divide-y divide-[#edf2ed]">{registros.map(registro => <tr key={registro.idRegistroAuditoria}><td className="px-4 py-4"><strong className="text-[#315c47]">{registro.tipoEvento}</strong></td><td className="px-4 py-4"><span className="block text-xs font-bold text-[#55715d]">{registro.recursoEvento || "—"}</span><span className="mt-1 block max-w-40 truncate text-[10px] text-[#82968a]">{registro.idRecurso || ""}</span></td><td className="px-4 py-4 text-xs text-[#71897b]">{registro.idUsuario || "Sistema"}</td><td className="max-w-48 truncate px-4 py-4 font-mono text-[10px] text-[#82968a]" title={registro.idCorrelacao}>{registro.idCorrelacao || "—"}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-[#71897b]">{dataLocal(registro.dataCriacao)}</td></tr>)}
            {!carregando && registros.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm font-semibold text-[#71897b]">Nenhum evento encontrado.</td></tr> : null}
          </tbody></table></div><div className="flex flex-col gap-3 border-t border-[#edf2ed] px-4 py-3 text-xs font-semibold text-[#71897b] sm:flex-row sm:items-center sm:justify-between"><span>{inicioAuditoria}–{fimAuditoria} de {totalAuditoria.toLocaleString("pt-BR")} eventos</span><div className="flex items-center gap-2"><button type="button" disabled={paginaAuditoria === 0 || carregando} onClick={() => setPaginaAuditoria(p => Math.max(0, p - 1))} className="rounded-lg border border-[#dce8de] p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {paginaAuditoria + 1}</span><button type="button" disabled={fimAuditoria >= totalAuditoria || carregando} onClick={() => setPaginaAuditoria(p => p + 1)} className="rounded-lg border border-[#dce8de] p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div></div>
        </section>
      ) : null}

      {carregando ? <p className="flex items-center gap-2 text-xs font-semibold text-[#71897b]"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando dados administrativos…</p> : null}
      {salvando ? <div className="sr-only" aria-live="polite">Salvando alteração administrativa.</div> : null}
    </div>
  );
}
