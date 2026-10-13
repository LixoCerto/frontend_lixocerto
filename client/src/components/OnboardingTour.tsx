import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardCheck,
  LayoutDashboard,
  MapPinned,
  ShieldCheck,
  Trophy,
  UserRound,
} from "lucide-react";
import type { CodigoPermissao, ItemNavegacao } from "@shared/permissoes";
import {
  acaoOnboardingFoiConcluida,
  concluirOnboarding,
  EVENTO_ACAO_ONBOARDING,
  marcarAcaoOnboardingConcluida,
  obterPassosOnboarding,
  obterTarefasObrigatoriasOnboarding,
  onboardingFoiConcluido,
  type AcaoOnboarding,
  type ArmazenamentoOnboarding,
} from "@/lib/onboarding";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface OnboardingTourProps {
  usuarioId: string;
  navegacao: readonly ItemNavegacao[];
  permissoes: readonly CodigoPermissao[];
  onAbrirArea: (area: string) => void;
  onAreaObrigatoriaChange: (area: string | null) => void;
}

type Fase = "fechado" | "boas-vindas" | "instrucao" | "aguardando" | "conclusao" | "ajuda";

function obterArmazenamentoSeguro(): ArmazenamentoOnboarding {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined };
  }
}

export default function OnboardingTour({
  usuarioId,
  navegacao,
  permissoes,
  onAbrirArea,
  onAreaObrigatoriaChange,
}: OnboardingTourProps) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [obrigatorio, setObrigatorio] = useState(false);
  const [fase, setFase] = useState<Fase>("fechado");
  const [indice, setIndice] = useState(0);
  const [indiceAjuda, setIndiceAjuda] = useState(0);
  const [acaoPendente, setAcaoPendente] = useState<AcaoOnboarding | null>(null);
  const [acoesConcluidas, setAcoesConcluidas] = useState<AcaoOnboarding[]>([]);

  const idsNavegacao = navegacao.map(item => item.id).join("|");
  const tarefas = useMemo(
    () => obterTarefasObrigatoriasOnboarding(navegacao),
    [idsNavegacao],
  );
  const passosAjuda = useMemo(
    () => obterPassosOnboarding(navegacao, permissoes),
    [idsNavegacao, permissoes.join("|")],
  );
  const tarefaAtual = tarefas[indice];
  const passoAjuda = passosAjuda[indiceAjuda];
  const quantidadeConcluida = acoesConcluidas.length;
  const percentual = tarefas.length
    ? Math.round((quantidadeConcluida / tarefas.length) * 100)
    : 100;
  const numeroPasso = fase === "boas-vindas"
    ? 0
    : fase === "conclusao"
      ? tarefas.length
      : Math.min(indice + 1, tarefas.length);
  const acaoAlvo = fase === "aguardando" ? acaoPendente : null;

  useEffect(() => {
    if (!usuarioId) return;

    const armazenamento = obterArmazenamentoSeguro();
    const finalizado = onboardingFoiConcluido(armazenamento, usuarioId);

    if (finalizado) {
      setObrigatorio(false);
      setAcoesConcluidas(tarefas.map(tarefa => tarefa.acao));
      setFase("fechado");
      setDialogAberto(false);
      onAreaObrigatoriaChange(null);
      return;
    }

    setObrigatorio(true);
    const concluidas = tarefas
      .filter(tarefa => acaoOnboardingFoiConcluida(armazenamento, usuarioId, tarefa.acao))
      .map(tarefa => tarefa.acao);
    setAcoesConcluidas(concluidas);

    const primeiraPendente = tarefas.findIndex(tarefa => !concluidas.includes(tarefa.acao));
    if (primeiraPendente < 0) {
      setIndice(tarefas.length);
      setAcaoPendente(null);
      setFase("conclusao");
      setDialogAberto(true);
      onAreaObrigatoriaChange(null);
      return;
    }

    setIndice(primeiraPendente);
    const tarefa = tarefas[primeiraPendente];
    onAreaObrigatoriaChange(tarefa.area);
    onAbrirArea(tarefa.area);
    setFase(concluidas.length === 0 ? "boas-vindas" : "instrucao");
    setDialogAberto(true);
  }, [usuarioId, idsNavegacao]);

  useEffect(() => {
    if (!obrigatorio || !acaoPendente) return;

    function receberAcao(evento: Event) {
      const acao = (evento as CustomEvent<{ acao?: AcaoOnboarding }>).detail?.acao;
      if (acao !== acaoPendente) return;

      marcarAcaoOnboardingConcluida(obterArmazenamentoSeguro(), usuarioId, acaoPendente);
      const concluidas = Array.from(new Set([...acoesConcluidas, acaoPendente]));
      setAcoesConcluidas(concluidas);
      setAcaoPendente(null);

      const proximaPendente = tarefas.findIndex(tarefa => !concluidas.includes(tarefa.acao));
      if (proximaPendente >= 0) {
        const proxima = tarefas[proximaPendente];
        setIndice(proximaPendente);
        onAreaObrigatoriaChange(proxima.area);
        onAbrirArea(proxima.area);
        setFase("instrucao");
      } else {
        setIndice(tarefas.length);
        onAreaObrigatoriaChange(null);
        setFase("conclusao");
      }
      setDialogAberto(true);
    }

    window.addEventListener(EVENTO_ACAO_ONBOARDING, receberAcao);
    return () => window.removeEventListener(EVENTO_ACAO_ONBOARDING, receberAcao);
  }, [obrigatorio, acaoPendente, usuarioId, acoesConcluidas, tarefas, onAbrirArea, onAreaObrigatoriaChange]);

  useEffect(() => {
    if (!acaoAlvo) return;
    const alvo = document.querySelector<HTMLElement>(`[data-onboarding-action="${acaoAlvo}"]`);
    if (!alvo) return;
    alvo.classList.add("onboarding-action-target");
    alvo.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    const controle = alvo.matches("input, button, select, textarea")
      ? alvo
      : alvo.querySelector<HTMLElement>('input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    controle?.focus({ preventScroll: true });
    return () => alvo.classList.remove("onboarding-action-target");
  }, [acaoAlvo, idsNavegacao]);

  function iniciarAcao() {
    if (!tarefaAtual) return;
    setAcaoPendente(tarefaAtual.acao);
    setFase("aguardando");
    setDialogAberto(false);
    onAreaObrigatoriaChange(tarefaAtual.area);
    onAbrirArea(tarefaAtual.area);
  }

  function voltarParaAcao() {
    setFase("aguardando");
    setDialogAberto(false);
  }

  function concluirFluxoObrigatorio() {
    concluirOnboarding(obterArmazenamentoSeguro(), usuarioId);
    setObrigatorio(false);
    setAcaoPendente(null);
    setFase("fechado");
    setDialogAberto(false);
    onAreaObrigatoriaChange(null);
  }

  function abrirAjuda() {
    if (obrigatorio) {
      if (fase === "aguardando") setFase("instrucao");
      setDialogAberto(true);
      return;
    }
    setIndiceAjuda(0);
    setFase("ajuda");
    setDialogAberto(true);
  }

  function alterarAbertura(aberta: boolean) {
    if (aberta) {
      setDialogAberto(true);
      return;
    }
    if (obrigatorio) return;
    setDialogAberto(false);
    setFase("fechado");
  }

  function navegarAjudaParaArea() {
    if (!passoAjuda) return;
    onAbrirArea(passoAjuda.area);
    setDialogAberto(false);
    setFase("fechado");
  }

  const Icone = tarefaAtual
    ? (icones[navegacao.find(item => item.id === tarefaAtual.area)?.icone ?? ""] ?? CircleHelp)
    : fase === "ajuda" && passoAjuda
      ? (icones[navegacao.find(item => item.id === passoAjuda.area)?.icone ?? ""] ?? CircleHelp)
      : fase === "conclusao" ? ShieldCheck : LayoutDashboard;

  return (
    <>
      <button
        type="button"
        onClick={abrirAjuda}
        aria-label={obrigatorio ? "Ver instruções da etapa obrigatória" : "Abrir passo a passo de ajuda"}
        title={obrigatorio ? "Etapa obrigatória" : "Passo a passo"}
        className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-[#dce7dd] bg-white px-2.5 text-sm font-bold text-[#285e47] transition hover:border-[#afd2b3] hover:bg-[#f5faf4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] sm:px-3"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{obrigatorio ? "Etapa guiada" : "Ajuda"}</span>
      </button>

      {fase === "aguardando" && tarefaAtual ? (
        <section className="fixed inset-x-4 bottom-4 z-[45] mx-auto max-w-xl rounded-2xl border border-[#cfe3d1] bg-white p-4 text-[#17362a] shadow-[0_22px_65px_-28px_rgba(17,57,37,.55)] sm:left-auto sm:right-6 sm:mx-0 sm:w-[min(28rem,calc(100vw-3rem))]" aria-label="Etapa obrigatória do onboarding">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6f2de] text-[#24734d]"><Icone className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#347a54]">Etapa obrigatória · {indice + 1} de {tarefas.length}</p>
              <h2 className="mt-1 text-sm font-black">{tarefaAtual.titulo}</h2>
              <p className="mt-1 text-xs leading-5 text-[#617d6d]">{tarefaAtual.instrucao}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf2ed] pt-3">
            <span className="text-[11px] font-semibold text-[#738a7b]">Conclua a ação na tela para liberar a próxima etapa.</span>
            <button type="button" onClick={abrirAjuda} className="min-h-9 shrink-0 rounded-lg bg-[#eaf5e6] px-3 py-1.5 text-xs font-black text-[#256c48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Instruções</button>
          </div>
        </section>
      ) : null}

      <Dialog open={dialogAberto} onOpenChange={alterarAbertura}>
        <DialogContent
          showCloseButton={!obrigatorio}
          onEscapeKeyDown={evento => { if (obrigatorio) evento.preventDefault(); }}
          onPointerDownOutside={evento => { if (obrigatorio) evento.preventDefault(); }}
          className="max-h-[min(88dvh,48rem)] max-w-xl overflow-y-auto rounded-[24px] border-[#dfe9e1] bg-[#fbfdfb] p-5 text-[#17362a] shadow-[0_32px_90px_-42px_rgba(13,48,31,.65)] sm:p-7"
        >
          {fase === "boas-vindas" ? (
            <>
              <DialogHeader className="text-left">
                <div className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f2de] text-[#24734d]"><LayoutDashboard className="h-6 w-6" aria-hidden="true" /></div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#347a54]">Primeiro acesso · 3 ações rápidas</p>
                <DialogTitle className="text-2xl font-black tracking-tight text-[#17362a]">Vamos começar pelo básico</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-[#617d6d]">O passo a passo vai acompanhar você na tela. Pesquise um material, faça uma nova busca no Guia com outro termo e pesquise pontos por cidade. Cada ação libera a próxima e, ao concluir, o painel fica disponível.</DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-[#dfe9df] bg-white p-4 text-sm leading-6 text-[#6b8375]">
                <p><strong className="text-[#315d45]">Sem cadastros ou respostas enviados:</strong> este roteiro usa apenas buscas e filtros. Não solicita GPS, não registra descarte e não responde quiz em seu nome.</p>
              </div>
              <DialogFooter className="sm:justify-end">
                <button type="button" onClick={() => setFase("instrucao")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-5 py-2.5 text-sm font-black text-white hover:bg-[#176543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Iniciar passo a passo <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </DialogFooter>
            </>
          ) : null}

          {fase === "instrucao" && tarefaAtual ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#347a54]" aria-live="polite">Ação {indice + 1} de {tarefas.length}</p><span className="text-xs font-bold tabular-nums text-[#6f897a]">{percentual}%</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5eee5]" role="progressbar" aria-label="Progresso do passo a passo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual} aria-valuetext={`${quantidadeConcluida} de ${tarefas.length} ações concluídas`}><div className="h-full rounded-full bg-[#318354] transition-[width] duration-300" style={{ width: `${percentual}%` }} /></div>
                </div>
              </div>
              <DialogHeader className="mt-2 text-left">
                <div className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f2de] text-[#24734d]"><Icone className="h-6 w-6" aria-hidden="true" /></div>
                <DialogTitle className="text-2xl font-black tracking-tight text-[#17362a]">{tarefaAtual.titulo}</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-[#617d6d]">{tarefaAtual.descricao}</DialogDescription>
              </DialogHeader>
              <div className="rounded-2xl border border-[#dfe9df] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#587765]">Sua ação nesta etapa</p>
                <p className="mt-1.5 text-sm leading-6 text-[#6b8375]">{tarefaAtual.instrucao}</p>
              </div>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-[#71887a]">As demais áreas ficam bloqueadas até terminar.</span>
                {acaoPendente === tarefaAtual.acao ? (
                  <button type="button" onClick={voltarParaAcao} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-5 py-2.5 text-sm font-black text-white hover:bg-[#176543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Voltar à ação <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                ) : (
                  <button type="button" onClick={iniciarAcao} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-5 py-2.5 text-sm font-black text-white hover:bg-[#176543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Fazer esta ação <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                )}
              </DialogFooter>
            </>
          ) : null}

          {fase === "conclusao" ? (
            <>
              <DialogHeader className="text-left">
                <div className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f2de] text-[#24734d]"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#347a54]">{tarefas.length} de {tarefas.length} ações concluídas</p>
                <DialogTitle className="text-2xl font-black tracking-tight text-[#17362a]">Pronto para usar o Lixo Certo</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-[#617d6d]">Você concluiu as ações iniciais. Agora todas as áreas liberadas para seu perfil podem ser acessadas pelo menu.</DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-end">
                <button type="button" onClick={concluirFluxoObrigatorio} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-5 py-2.5 text-sm font-black text-white hover:bg-[#176543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Concluir e acessar o painel <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </DialogFooter>
            </>
          ) : null}

          {fase === "ajuda" && passoAjuda ? (
            <>
              <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#347a54]">Ajuda · área {indiceAjuda + 1} de {passosAjuda.length}</p><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f2de] text-[#24734d]"><Icone className="h-5 w-5" aria-hidden="true" /></span></div>
              <DialogHeader className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight text-[#17362a]">{passoAjuda.titulo}</DialogTitle>
                <DialogDescription className="text-sm leading-6 text-[#617d6d]">{passoAjuda.descricao}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => { setDialogAberto(false); setFase("fechado"); }} className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-[#6e8578] hover:bg-[#eef4ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Fechar ajuda</button>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" disabled={indiceAjuda === 0} onClick={() => setIndiceAjuda(valor => Math.max(0, valor - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-[#dce7dd] bg-white px-3 py-2 text-sm font-bold text-[#426550] disabled:cursor-not-allowed disabled:opacity-45"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Anterior</button>
                  <button type="button" onClick={navegarAjudaParaArea} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#eaf5e6] px-3 py-2 text-sm font-black text-[#256c48]">Abrir área</button>
                  <button type="button" disabled={indiceAjuda >= passosAjuda.length - 1} onClick={() => setIndiceAjuda(valor => Math.min(passosAjuda.length - 1, valor + 1))} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#1d7953] px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">Próxima<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
