import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Recycle,
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
  nome: string;
  email?: string | null;
  iniciais: string;
  paginaAtiva: string;
  onMudarPagina: (pagina: string) => void;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

export default function AppShell({
  papel,
  permissoes,
  nome,
  email,
  iniciais,
  paginaAtiva,
  onMudarPagina,
  onLogout,
  children,
}: AppShellProps) {
  const [aberto, setAberto] = useState(false);
  const perfil = PERFIS_ACESSO[papel] ?? PERFIS_ACESSO.usuario;
  const navegacao = obterNavegacaoPermitidaPorPermissoes(permissoes);
  const itemAtivo = navegacao.find(item => item.id === paginaAtiva) ?? navegacao[0];

  function selecionarPagina(id: string) {
    onMudarPagina(id);
    setAberto(false);
  }

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-[#17362a]">
      {aberto ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#10281e]/35 backdrop-blur-[1px] lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
        />
      ) : null}

      <aside className={`app-sidebar ${aberto ? "app-sidebar--open" : ""}`} aria-label="Navegação principal">
        <div className="flex items-center justify-between gap-3 px-5 pb-6 pt-6">
          <button type="button" onClick={() => selecionarPagina("inicio")} className="flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#187854] text-white shadow-[0_12px_26px_-14px_rgba(24,120,84,.9)]">
              <Recycle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-[15px] font-black tracking-tight text-[#17362a]">Lixo Certo</strong>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#799185]">Painel integrado</span>
            </span>
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl text-[#648074] hover:bg-[#edf3ed] lg:hidden" onClick={() => setAberto(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 mb-5 rounded-2xl border border-[#dbe8df] bg-[#f5faf4] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#6d8a7b]">Acesso autenticado</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <strong className="block truncate text-sm font-black text-[#244637]">{perfil.rotulo}</strong>
              <span className="mt-1 block truncate text-xs font-semibold text-[#5c816d]">{permissoes.length} permissões ativas</span>
            </div>
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#39835b]" aria-label="Sessão protegida" />
          </div>
        </div>

        <nav className="flex-1 px-3 pb-5" aria-label="Áreas disponíveis">
          <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8aa094]">Seu espaço</p>
          <div className="space-y-1">
            {navegacao.map(item => {
              const Icone = icones[item.icone] ?? LayoutDashboard;
              const ativo = item.id === paginaAtiva;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selecionarPagina(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${ativo ? "bg-[#dff2d9] text-[#176543] shadow-[0_7px_18px_-14px_rgba(23,101,67,.7)]" : "text-[#5e796b] hover:bg-[#f0f5f0] hover:text-[#1f5e43]"}`}
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
            <button type="button" onClick={() => void onLogout()} className="rounded-lg p-1 text-[#b5d2bd] hover:bg-white/10" aria-label="Sair da conta">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="sticky top-0 z-30 flex h-[73px] items-center justify-between border-b border-[#e1e9e2] bg-[#f6f7f4]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-[#dce7dd] bg-white text-[#285e47] lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold text-[#758f80] sm:block">Lixo Certo / {perfil.rotulo}</p>
              <h1 className="truncate text-base font-black tracking-tight text-[#17362a]">{itemAtivo?.rotulo ?? "Visão geral"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#cce6cf] bg-[#ebf7e8] px-3 py-1.5 text-xs font-black text-[#28714c] md:inline-flex">{perfil.rotulo}</span>
            <button type="button" className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#dce7dd] bg-white text-[#537568]" aria-label="Notificações">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e6aa39]" />
            </button>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17362a] text-xs font-black text-white">{iniciais}</span>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-7 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
