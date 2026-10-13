import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardCheck,
  LayoutDashboard,
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
        <div className="flex items-center justify-between gap-3 px-5 pb-6 pt-6">
          <button type="button" disabled={Boolean(areaObrigatoria && areaObrigatoria !== "inicio")} aria-disabled={Boolean(areaObrigatoria && areaObrigatoria !== "inicio")} title={areaObrigatoria && areaObrigatoria !== "inicio" ? "Conclua a etapa guiada para liberar esta área" : undefined} onClick={() => selecionarPagina("inicio")} className="flex items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e9f5e7] shadow-[0_12px_26px_-14px_rgba(24,120,84,.35)]">
              <img src="/favicon-32.png?v=4" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            </span>
            <span>
              <strong className="block text-[15px] font-black tracking-tight text-[#17362a]">Lixo Certo</strong>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#799185]">Painel integrado</span>
            </span>
          </button>
          <button ref={botaoFecharMenuRef} type="button" className="grid h-9 w-9 place-items-center rounded-xl text-[#648074] hover:bg-[#edf3ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] lg:hidden" onClick={fecharMenu} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 mb-5 rounded-2xl border border-[#dbe8df] bg-[#f5faf4] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#6d8a7b]">Seu perfil</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm font-black text-[#244637]">{perfil.rotulo}</strong>
              <span className="mt-1 block truncate text-xs font-semibold text-[#5c816d]">Áreas disponíveis no menu</span>
            </div>
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#39835b]" aria-label="Sessão protegida" />
          </div>
        </div>

        <nav className="app-sidebar__nav flex-1 px-3 pb-5" aria-label="Áreas disponíveis">
          <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8aa094]">Seu espaço</p>
          <div className="space-y-1">
            {navegacao.map(item => {
              const Icone = icones[item.icone] ?? LayoutDashboard;
              const ativo = item.id === paginaAtiva;
              const bloqueada = Boolean(areaObrigatoria && item.id !== areaObrigatoria);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={bloqueada}
                  onClick={() => selecionarPagina(item.id)}
                  aria-current={ativo ? "page" : undefined}
                  aria-disabled={bloqueada}
                  title={bloqueada ? "Conclua a etapa guiada para liberar esta área" : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-not-allowed disabled:opacity-40 ${ativo ? "bg-[#dff2d9] text-[#176543] shadow-[0_7px_18px_-14px_rgba(23,101,67,.7)]" : "text-[#5e796b] hover:bg-[#f0f5f0] hover:text-[#1f5e43]"}`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${ativo ? "bg-[#1b7a56] text-white" : "bg-[#edf3ec] text-[#648778] group-hover:bg-[#deecdf]"}`}>
                    <Icone className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{item.rotulo}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium opacity-75">{item.descricao}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[#e0ebe2] px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[#17362a] p-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d6efad] text-sm font-black text-[#17362a]">{iniciais}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{nome}</strong>
              <span className="block truncate text-[11px] text-[#b5d2bd]">{email || perfil.rotulo}</span>
            </span>
            <button type="button" onClick={() => void onLogout()} className="rounded-lg p-1 text-[#b5d2bd] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Sair da conta">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="sticky top-0 z-30 flex h-[73px] items-center justify-between border-b border-[#e1e9e2] bg-[#f6f7f4]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button ref={botaoMenuRef} type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce7dd] bg-white text-[#285e47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu de navegação" aria-expanded={aberto} aria-controls="navegacao-principal">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold text-[#758f80] sm:block">Lixo Certo / {perfil.rotulo}</p>
              <h1 id="app-page-title" tabIndex={-1} aria-live="polite" aria-atomic="true" className="truncate text-base font-black tracking-tight text-[#17362a] focus:outline-none">{itemAtivo?.rotulo ?? "Visão geral"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <OnboardingTour usuarioId={usuarioId} navegacao={navegacao} permissoes={permissoes} onAbrirArea={abrirAreaGuiada} onAreaObrigatoriaChange={onAreaObrigatoriaChange} />
            <span className="hidden rounded-full border border-[#cce6cf] bg-[#ebf7e8] px-3 py-1.5 text-xs font-black text-[#28714c] md:inline-flex">{perfil.rotulo}</span>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17362a] text-xs font-black text-white">{iniciais}</span>
          </div>
        </header>
        <main id="conteudo-principal" tabIndex={-1} className="px-4 py-6 focus:outline-none sm:px-7 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
