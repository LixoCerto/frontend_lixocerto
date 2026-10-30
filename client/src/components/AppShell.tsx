import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPinned,
  Menu,
  ShieldCheck,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import {
  PERFIS_ACESSO,
  obterNavegacaoPermitidaPorPermissoes,
  type CodigoPermissao,
  type PapelAcesso,
} from "@shared/permissoes";
import OnboardingTour from "@/components/OnboardingTour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const icones: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  MapPinned,
  CircleHelp,
  Trophy,
  ChartNoAxesCombined,
  ClipboardCheck,
  ShieldCheck,
  UserRound,
};

const GRUPOS_MENU: { titulo: string; ids: string[] }[] = [
  { titulo: "Aprender e agir", ids: ["inicio", "materiais", "pontos", "questionarios", "desafios"] },
  { titulo: "Contribuir", ids: ["pesquisa"] },
  { titulo: "Gestão", ids: ["revisao", "administracao"] },
];

const CORES_MENU: Record<string, string> = {
  inicio: "#d6efad",
  materiais: "#7cc4f5",
  pontos: "#8fdcae",
  questionarios: "#f5d36b",
  desafios: "#f59a8a",
  pesquisa: "#c3b5f5",
  revisao: "#7cc4f5",
  administracao: "#8fdcae",
  perfil: "#d6efad",
};

interface AppShellProps {
  papel: PapelAcesso;
  permissoes: readonly CodigoPermissao[];
  usuarioId: string;
  areaObrigatoria: string | null;
  onAreaObrigatoriaChange: (area: string | null) => void;
  nome: string;
  email?: string | null;
  iniciais: string;
  paginaAtiva: string;
  onMudarPagina: (pagina: string) => void;
  onAbrirAreaOnboarding: (area: string) => void;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

export default function AppShell({
  papel,
  permissoes,
  usuarioId,
  areaObrigatoria,
  onAreaObrigatoriaChange,
  nome,
  email,
  iniciais,
  paginaAtiva,
  onMudarPagina,
  onAbrirAreaOnboarding,
  onLogout,
  children,
}: AppShellProps) {
  const [aberto, setAberto] = useState(false);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);
  const botaoFecharMenuRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const perfil = PERFIS_ACESSO[papel] ?? PERFIS_ACESSO.usuario;
  const navegacao = obterNavegacaoPermitidaPorPermissoes(permissoes);
  const itemAtivo = navegacao.find(item => item.id === paginaAtiva) ?? navegacao[0];
  const navegacaoMenu = navegacao.filter(item => item.id !== "perfil");
  const podeVerPerfil = navegacao.some(item => item.id === "perfil");
  const perfilBloqueado = Boolean(areaObrigatoria && areaObrigatoria !== "perfil");

  function selecionarPagina(id: string) {
    if (areaObrigatoria && id !== areaObrigatoria) return;
    onMudarPagina(id);
    setAberto(false);
    window.requestAnimationFrame(() => document.getElementById("app-page-title")?.focus());
  }

  function abrirAreaGuiada(id: string) {
    onAbrirAreaOnboarding(id);
    setAberto(false);
  }

  function fecharMenu() {
    setAberto(false);
    window.requestAnimationFrame(() => botaoMenuRef.current?.focus());
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [paginaAtiva]);

  useEffect(() => {
    if (!aberto) return;
    botaoFecharMenuRef.current?.focus();

    function tratarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fecharMenu();
        return;
      }
      if (evento.key !== "Tab" || !sidebarRef.current) return;

      const elementos = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(elemento => elemento.offsetParent !== null);
      if (!elementos.length) return;
      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    window.addEventListener("keydown", tratarTeclado);
    return () => window.removeEventListener("keydown", tratarTeclado);
  }, [aberto]);

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-[#17362a]">
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>
      {aberto ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#10281e]/35 backdrop-blur-[1px] lg:hidden"
          aria-label="Fechar menu"
          onClick={fecharMenu}
        />
      ) : null}

      <aside
        id="navegacao-principal"
        ref={sidebarRef}
        role={aberto ? "dialog" : "complementary"}
        aria-modal={aberto || undefined}
        aria-label={aberto ? "Menu de navegação" : "Navegação principal"}
        className={`app-sidebar ${aberto ? "app-sidebar--open" : ""}`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
          <button type="button" disabled={Boolean(areaObrigatoria && areaObrigatoria !== "inicio")} aria-disabled={Boolean(areaObrigatoria && areaObrigatoria !== "inicio")} title={areaObrigatoria && areaObrigatoria !== "inicio" ? "Conclua a etapa guiada para liberar esta área" : undefined} onClick={() => selecionarPagina("inicio")} className="flex items-center gap-3 rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6efad] disabled:cursor-not-allowed disabled:opacity-50">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d6efad] shadow-[0_10px_24px_-12px_rgba(184,224,122,.8)]">
              <img src="/favicon-32.png?v=4" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            </span>
            <span>
              <strong className="block text-base font-black tracking-tight text-white">Lixo Certo</strong>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#cfe5d6]">
                <ShieldCheck className="h-3 w-3 text-[#b8e07a]" aria-hidden="true" />
                {perfil.rotulo}
              </span>
            </span>
          </button>
          <button ref={botaoFecharMenuRef} type="button" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6efad] lg:hidden" onClick={fecharMenu} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {areaObrigatoria ? (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-[#b8e07a]/30 bg-[#b8e07a]/10 px-3 py-2 text-[11px] font-semibold leading-4 text-[#d6efad]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Termine o passo a passo para liberar todo o menu.
          </div>
        ) : null}

        <nav className="app-sidebar__nav flex-1 px-3 pb-4" aria-label="Áreas disponíveis">
          {GRUPOS_MENU.map(grupo => {
            const itens = navegacaoMenu.filter(item => grupo.ids.includes(item.id));
            if (!itens.length) return null;
            return (
              <div key={grupo.titulo} className="mt-3 first:mt-1">
                <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#7fa08e]">{grupo.titulo}</p>
                <ul className="space-y-0.5">
                  {itens.map(item => {
                    const Icone = icones[item.icone] ?? LayoutDashboard;
                    const ativo = item.id === paginaAtiva;
                    const bloqueada = Boolean(areaObrigatoria && item.id !== areaObrigatoria);
                    const cor = CORES_MENU[item.id] ?? "#8fdcae";
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          disabled={bloqueada}
                          onClick={() => selecionarPagina(item.id)}
                          aria-current={ativo ? "page" : undefined}
                          aria-disabled={bloqueada}
                          title={bloqueada ? "Conclua a etapa guiada para liberar esta área" : item.descricao}
                          className={`group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6efad] disabled:cursor-not-allowed disabled:opacity-35 ${ativo ? "bg-white text-[#17362a] shadow-[0_10px_24px_-14px_rgba(0,0,0,.6)]" : "text-[#d3e4d9] hover:bg-white/[0.07] hover:text-white"}`}
                        >
                          {ativo ? <span className="absolute -left-3 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-full bg-[#b8e07a]" aria-hidden="true" /> : null}
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition group-hover:scale-105"
                            style={ativo ? { backgroundColor: "#17362a", color: cor } : { backgroundColor: `${cor}22`, color: cor }}
                          >
                            <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{item.rotulo}</span>
                            <span className={`block truncate text-[11px] font-medium ${ativo ? "text-[#5c7a6a]" : "text-[#8eab9b]"}`}>{item.descricao}</span>
                          </span>
                          {bloqueada ? <Lock className="h-3.5 w-3.5 shrink-0 text-[#8eab9b]" aria-hidden="true" /> : null}
                          {ativo ? <ChevronRight className="h-4 w-4 shrink-0 text-[#1d7953]" aria-hidden="true" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="app-main">
        <header className="sticky top-0 z-30 flex h-[73px] items-center justify-between border-b border-[#e1e9e2] bg-[#f6f7f4]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button ref={botaoMenuRef} type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce7dd] bg-white text-[#285e47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu de navegação" aria-expanded={aberto} aria-controls="navegacao-principal">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold text-[#4b6657] sm:block">Lixo Certo / {perfil.rotulo}</p>
              <h1 id="app-page-title" tabIndex={-1} aria-live="polite" aria-atomic="true" className="truncate text-base font-black tracking-tight text-[#17362a] focus:outline-none">{itemAtivo?.rotulo ?? "Visão geral"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <OnboardingTour usuarioId={usuarioId} navegacao={navegacao} permissoes={permissoes} onAbrirArea={abrirAreaGuiada} onAreaObrigatoriaChange={onAreaObrigatoriaChange} />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button type="button" className="group flex items-center gap-2 rounded-2xl border border-[#dce7dd] bg-white py-1 pl-1 pr-2 shadow-[0_6px_18px_-14px_rgba(23,54,42,.5)] transition hover:border-[#b9d8c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] data-[state=open]:border-[#1d7953]">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#17362a] text-xs font-black text-[#d6efad]">{iniciais}</span>
                  <span className="hidden max-w-[160px] text-left md:block">
                    <strong className="block truncate text-xs font-black text-[#17362a]">{nome}</strong>
                    <span className="block truncate text-[10px] font-bold text-[#4b6657]">{perfil.rotulo}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#4b6657] transition group-data-[state=open]:rotate-180" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[#e1ebe2] bg-white p-2 text-[#17362a] shadow-[0_24px_60px_-24px_rgba(23,54,42,.45)]">
                <div className="flex items-center gap-3 rounded-xl bg-[#17362a] p-3 text-white">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d6efad] text-sm font-black text-[#17362a]">{iniciais}</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{nome}</strong>
                    <span className="block truncate text-[11px] text-[#b5d2bd]">{email || perfil.rotulo}</span>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#d6efad]">
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      {perfil.rotulo}
                    </span>
                  </span>
                </div>
                {podeVerPerfil ? (
                  <DropdownMenuItem
                    disabled={perfilBloqueado}
                    onSelect={() => selecionarPagina("perfil")}
                    className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#244637] focus:bg-[#eef6ee] focus:text-[#17362a] data-[disabled]:opacity-40"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7f4e4] text-[#1d7953]"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block">Perfil e sessões</span>
                      <span className="block text-[11px] font-medium text-[#4b6657]">{perfilBloqueado ? "Termine o passo a passo primeiro" : "Seus dados e aparelhos conectados"}</span>
                    </span>
                    {perfilBloqueado ? <Lock className="h-3.5 w-3.5 text-[#8aa094]" aria-hidden="true" /> : null}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator className="my-2 bg-[#e8efe9]" />
                <DropdownMenuItem
                  onSelect={() => void onLogout()}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#a8432f] focus:bg-[#fff1ed] focus:text-[#8c3322]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fde9e4] text-[#c0533c]"><LogOut className="h-4 w-4" aria-hidden="true" /></span>
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="conteudo-principal" tabIndex={-1} className="px-4 py-6 focus:outline-none sm:px-7 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
