import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
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
  type TarefaOnboarding,
} from "@/lib/onboarding";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const retanguloAlvo = useRetanguloAlvo(acaoAlvo);

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
    alvo.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    const controle = alvo.matches("input, button, select, textarea")
      ? alvo
      : alvo.querySelector<HTMLElement>('input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    controle?.focus({ preventScroll: true });
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
    const conteudo = document.getElementById("conteudo-principal");
    if (conteudo) {
      conteudo.classList.add("onboarding-revelar");
      window.setTimeout(() => conteudo.classList.remove("onboarding-revelar"), 1400);
    }
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

  function iconeDaArea(area: string): LucideIcon {
    return icones[navegacao.find(item => item.id === area)?.icone ?? ""] ?? CircleHelp;
  }

  const Icone = tarefaAtual
    ? iconeDaArea(tarefaAtual.area)
    : fase === "ajuda" && passoAjuda
      ? iconeDaArea(passoAjuda.area)
      : fase === "conclusao" ? Trophy : LayoutDashboard;

  const cartaoNoTopo = retanguloAlvo
    ? retanguloAlvo.top + retanguloAlvo.height / 2 > window.innerHeight / 2
    : false;

  const trilha = (
    <TrilhaMissoes
      tarefas={tarefas}
      concluidas={acoesConcluidas}
      indiceAtual={fase === "boas-vindas" ? -1 : indice}
      iconeDaArea={iconeDaArea}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={abrirAjuda}
        aria-label={obrigatorio ? "Ver instruções da missão atual" : "Abrir passo a passo de ajuda"}
        title={obrigatorio ? "Missão atual" : "Passo a passo"}
        className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-[#dce7dd] bg-white px-2.5 text-sm font-bold text-[#285e47] transition hover:border-[#afd2b3] hover:bg-[#f5faf4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] sm:px-3"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{obrigatorio ? "Missões" : "Ajuda"}</span>
      </button>

      {fase === "aguardando" && tarefaAtual ? createPortal(
        <>
          <FocoOnboarding retangulo={retanguloAlvo} />
          <section
            aria-label="Missão em andamento"
            className={`onboarding-cartao fixed left-1/2 z-[70] w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-white p-4 text-[#17362a] shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)] sm:p-5 ${cartaoNoTopo ? "top-3 sm:top-5" : "bottom-3 sm:bottom-5"}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#1d7953] text-white"><Icone className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#1d7953]">Missão {indice + 1} de {tarefas.length}</p>
                  <PontosProgresso total={tarefas.length} concluidas={quantidadeConcluida} />
                </div>
                <h2 className="mt-0.5 text-base font-black leading-snug">{tarefaAtual.titulo}</h2>
                <p className="mt-1 text-sm leading-6 text-[#5c7768]">{tarefaAtual.instrucao}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf2ed] pt-3">
              <span className="text-xs font-semibold text-[#6f897a]">O campo iluminado é onde você deve agir.</span>
              <button type="button" onClick={abrirAjuda} className="min-h-9 shrink-0 rounded-lg bg-[#eaf5e6] px-3 text-xs font-black text-[#256c48] hover:bg-[#dff0d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">Ver detalhes</button>
            </div>
          </section>
        </>,
        document.body,
      ) : null}

      <Dialog open={dialogAberto} onOpenChange={alterarAbertura}>
        <DialogContent
          showCloseButton={!obrigatorio}
          overlayClassName={obrigatorio ? "onboarding-fundo" : "bg-[#0c2118]/50 backdrop-blur-sm"}
          onEscapeKeyDown={evento => { if (obrigatorio) evento.preventDefault(); }}
          onPointerDownOutside={evento => { if (obrigatorio) evento.preventDefault(); }}
          className="max-h-[92dvh] gap-0 overflow-y-auto overflow-x-hidden border-0 bg-white p-0 text-[#17362a] shadow-[0_32px_90px_-30px_rgba(0,0,0,.6)] sm:max-w-[30rem] sm:rounded-[28px] max-sm:top-auto max-sm:bottom-0 max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-[28px] max-sm:data-[state=open]:slide-in-from-bottom-10 max-sm:data-[state=open]:zoom-in-100"
        >
          {fase === "boas-vindas" ? (
            <>
              <FaixaOnboarding>
                <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#d6efad] ring-1 ring-white/15">Primeiro acesso</p>
                <DialogTitle className="mt-3 text-[1.65rem] font-black leading-tight tracking-tight text-white">Boas-vindas ao Lixo Certo!</DialogTitle>
                <DialogDescription className="mt-2 text-[15px] leading-6 text-[#c3d8c9]">Complete {tarefas.length} missões rápidas para desbloquear a plataforma.</DialogDescription>
                <div className="mt-5">{trilha}</div>
              </FaixaOnboarding>
              <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-7">
                <ol className="space-y-2.5">
                  {tarefas.map((tarefa, posicao) => {
                    const IconeTarefa = iconeDaArea(tarefa.area);
                    return (
                      <li key={tarefa.acao} className="flex items-center gap-3 rounded-xl bg-[#f3f8f1] px-3.5 py-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#1d7953] shadow-sm"><IconeTarefa className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1 text-sm font-bold">{tarefa.titulo}</span>
                        <span className="text-xs font-bold text-[#7a9485]">{posicao + 1}</span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#6f897a]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#3c8a5b]" aria-hidden="true" />As missões usam só buscas: nada de GPS, cadastro de descarte ou respostas em seu nome.</p>
                <button type="button" onClick={() => setFase("instrucao")} className={CLASSE_BOTAO_PRINCIPAL}>Começar missões <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </>
          ) : null}

          {fase === "instrucao" && tarefaAtual ? (
            <>
              <FaixaOnboarding>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#d6efad]" aria-live="polite">Missão {indice + 1} de {tarefas.length}</p>
                  <span className="text-xs font-bold tabular-nums text-[#a9c7b3]" role="progressbar" aria-label="Progresso das missões" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual} aria-valuetext={`${quantidadeConcluida} de ${tarefas.length} missões concluídas`}>{percentual}% concluído</span>
                </div>
                <div className="mt-4">{trilha}</div>
              </FaixaOnboarding>
              <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-7">
                {quantidadeConcluida > 0 ? (
                  <p className="onboarding-conquista mb-4 inline-flex items-center gap-2 rounded-full bg-[#eaf6e3] px-3 py-1.5 text-xs font-bold text-[#1d7953]"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Missão anterior concluída. Muito bem!</p>
                ) : null}
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e6f2de] text-[#1d7953]"><Icone className="h-6 w-6" aria-hidden="true" /></span>
                  <div>
                    <DialogTitle className="text-xl font-black leading-tight tracking-tight text-[#17362a]">{tarefaAtual.titulo}</DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-6 text-[#5c7768]">{tarefaAtual.descricao}</DialogDescription>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-[#dfe9df] bg-[#fafcf9] p-4">
                  <p className="text-sm font-black text-[#2c4a3c]">Como fazer</p>
                  <p className="mt-1 text-sm leading-6 text-[#5c7768]">{tarefaAtual.instrucao}</p>
                </div>
                <button type="button" onClick={acaoPendente === tarefaAtual.acao ? voltarParaAcao : iniciarAcao} className={CLASSE_BOTAO_PRINCIPAL}>
                  {acaoPendente === tarefaAtual.acao ? "Voltar para a missão" : "Ir para a missão"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <p className="mt-3 text-center text-xs font-semibold text-[#7a9485]">O restante da plataforma é liberado ao final das missões.</p>
              </div>
            </>
          ) : null}

          {fase === "conclusao" ? (
            <>
              <FaixaOnboarding>
                <Confetes />
                <div className="relative flex flex-col items-center text-center">
                  <span className="onboarding-trofeu grid h-16 w-16 place-items-center rounded-2xl bg-[#b8e07a] text-[#17362a] shadow-[0_12px_30px_-10px_rgba(184,224,122,.8)]"><Trophy className="h-8 w-8" aria-hidden="true" /></span>
                  <p className="mt-4 text-sm font-bold text-[#d6efad]">{tarefas.length} de {tarefas.length} missões concluídas</p>
                  <DialogTitle className="mt-1 text-[1.75rem] font-black leading-tight tracking-tight text-white">Plataforma desbloqueada!</DialogTitle>
                  <div className="mt-5 w-full">{trilha}</div>
                </div>
              </FaixaOnboarding>
              <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-7">
                <DialogDescription className="text-center text-[15px] leading-6 text-[#5c7768]">Parabéns! Agora você tem acesso a tudo isso:</DialogDescription>
                <ul className="mt-4 flex flex-wrap justify-center gap-2">
                  {navegacao.map((item, posicao) => {
                    const IconeArea = iconeDaArea(item.id);
                    return (
                      <li key={item.id} className="onboarding-area-liberada inline-flex items-center gap-1.5 rounded-full border border-[#d6e7d4] bg-[#f3f8f1] px-3 py-1.5 text-xs font-bold text-[#285e47]" style={{ animationDelay: `${200 + posicao * 70}ms` }}>
                        <IconeArea className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.id === "inicio" ? "Visão geral" : item.rotulo}
                      </li>
                    );
                  })}
                </ul>
                <button type="button" onClick={concluirFluxoObrigatorio} className={CLASSE_BOTAO_PRINCIPAL}>Explorar a plataforma <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </>
          ) : null}

          {fase === "ajuda" && passoAjuda ? (
            <>
              <div className="flex items-center gap-3 bg-[#eef6ea] px-5 py-5 pr-12 sm:px-7">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#1d7953] shadow-sm"><Icone className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <p className="text-xs font-bold text-[#347a54]">Ajuda · área {indiceAjuda + 1} de {passosAjuda.length}</p>
                  <DialogTitle className="text-xl font-black leading-tight tracking-tight text-[#17362a]">{passoAjuda.titulo}</DialogTitle>
                </div>
              </div>
              <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
                <DialogDescription className="text-[15px] leading-6 text-[#5c7768]">{passoAjuda.descricao}</DialogDescription>
                <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
                  {passosAjuda.map((passo, posicao) => (
                    <span key={passo.area} className={`h-1.5 rounded-full transition-all ${posicao === indiceAjuda ? "w-6 bg-[#1d7953]" : "w-1.5 bg-[#d3e2d6]"}`} />
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-[auto_1fr_auto]">
                  <button type="button" disabled={indiceAjuda === 0} onClick={() => setIndiceAjuda(valor => Math.max(0, valor - 1))} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#dce7dd] bg-white px-3 text-sm font-bold text-[#426550] disabled:cursor-not-allowed disabled:opacity-45"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Anterior</button>
                  <button type="button" onClick={navegarAjudaParaArea} className="order-last col-span-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#eaf5e6] px-3 text-sm font-black text-[#256c48] hover:bg-[#dff0d8] sm:order-none sm:col-span-1">Abrir esta área</button>
                  <button type="button" disabled={indiceAjuda >= passosAjuda.length - 1} onClick={() => setIndiceAjuda(valor => Math.min(passosAjuda.length - 1, valor + 1))} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#1d7953] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">Próxima<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

const CLASSE_BOTAO_PRINCIPAL =
  "mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-5 text-[15px] font-black text-white shadow-[0_10px_24px_-12px_rgba(29,121,83,.8)] transition hover:bg-[#17362a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]";

function FaixaOnboarding({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(119,190,120,.3),transparent_45%),linear-gradient(160deg,#1b4332,#12291f)] px-5 pb-6 pt-6 sm:px-7 sm:pt-7">
      <span className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-white/25 sm:hidden" aria-hidden="true" />
      {children}
    </div>
  );
}

function TrilhaMissoes({
  tarefas,
  concluidas,
  indiceAtual,
  iconeDaArea,
}: {
  tarefas: readonly TarefaOnboarding[];
  concluidas: readonly AcaoOnboarding[];
  indiceAtual: number;
  iconeDaArea: (area: string) => LucideIcon;
}) {
  return (
    <ol className="flex items-center" aria-label="Trilha de missões">
      {tarefas.map((tarefa, posicao) => {
        const feita = concluidas.includes(tarefa.acao);
        const atual = posicao === indiceAtual && !feita;
        const IconeTarefa = iconeDaArea(tarefa.area);
        return (
          <li key={tarefa.acao} className="flex flex-1 items-center last:flex-none" aria-label={`${tarefa.titulo}: ${feita ? "concluída" : atual ? "em andamento" : "pendente"}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-2 transition-all duration-500 ${feita ? "bg-[#b8e07a] text-[#17362a] ring-[#b8e07a]" : atual ? "onboarding-missao-atual bg-white text-[#1d7953] ring-white" : "bg-white/10 text-white/55 ring-white/20"}`}>
              {feita ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : <IconeTarefa className="h-5 w-5" aria-hidden="true" />}
            </span>
            {posicao < tarefas.length - 1 ? (
              <span className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <span className={`block h-full rounded-full bg-[#b8e07a] transition-all duration-700 ${feita ? "w-full" : "w-0"}`} />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function PontosProgresso({ total, concluidas }: { total: number; concluidas: number }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, posicao) => (
        <span key={posicao} className={`h-1.5 w-5 rounded-full ${posicao < concluidas ? "bg-[#1d7953]" : posicao === concluidas ? "bg-[#9fd08a]" : "bg-[#dfe9e1]"}`} />
      ))}
    </span>
  );
}

const CORES_CONFETE = ["#2f6fb0", "#d0493e", "#2f9a5f", "#e0a52a", "#8a5a34", "#b8e07a"];

function Confetes() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: 18 }, (_, posicao) => (
        <span
          key={posicao}
          className="onboarding-confete absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${(posicao * 53) % 100}%`,
            backgroundColor: CORES_CONFETE[posicao % CORES_CONFETE.length],
            animationDelay: `${(posicao % 6) * 120}ms`,
            animationDuration: `${1600 + (posicao % 5) * 250}ms`,
          }}
        />
      ))}
    </div>
  );
}

const MARGEM_FOCO = 10;

interface Retangulo {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Acompanha a posição do elemento da missão atual (ele pode mudar de lugar com rolagem, teclado virtual ou troca de página). */
function useRetanguloAlvo(acao: AcaoOnboarding | null): Retangulo | null {
  const [retangulo, setRetangulo] = useState<Retangulo | null>(null);

  useEffect(() => {
    if (!acao) {
      setRetangulo(null);
      return;
    }
    let quadro = 0;
    const medir = () => {
      const alvo = document.querySelector<HTMLElement>(`[data-onboarding-action="${acao}"]`);
      const caixa = alvo?.getBoundingClientRect();
      const proximo = caixa && caixa.width > 0 ? { top: caixa.top, left: caixa.left, width: caixa.width, height: caixa.height } : null;
      setRetangulo(atual => {
        if (!atual || !proximo) return atual === proximo ? atual : proximo;
        const igual = Math.abs(atual.top - proximo.top) < 0.5
          && Math.abs(atual.left - proximo.left) < 0.5
          && Math.abs(atual.width - proximo.width) < 0.5
          && Math.abs(atual.height - proximo.height) < 0.5;
        return igual ? atual : proximo;
      });
      quadro = window.requestAnimationFrame(medir);
    };
    medir();
    return () => window.cancelAnimationFrame(quadro);
  }, [acao]);

  return retangulo;
}

/** Escurece e desfoca toda a plataforma, deixando clicável apenas o recorte da missão atual. */
function FocoOnboarding({ retangulo }: { retangulo: Retangulo | null }) {
  if (!retangulo) return <div className="onboarding-foco-bloqueio fixed inset-0 z-[60]" aria-hidden="true" />;

  const largura = window.innerWidth;
  const altura = window.innerHeight;
  const topo = Math.min(altura, Math.max(0, retangulo.top - MARGEM_FOCO));
  const esquerda = Math.min(largura, Math.max(0, retangulo.left - MARGEM_FOCO));
  const direita = Math.max(0, Math.min(largura, retangulo.left + retangulo.width + MARGEM_FOCO));
  const base = Math.max(0, Math.min(altura, retangulo.top + retangulo.height + MARGEM_FOCO));

  return (
    <div aria-hidden="true">
      <div className="onboarding-foco-bloqueio fixed inset-x-0 top-0 z-[60]" style={{ height: topo }} />
      <div className="onboarding-foco-bloqueio fixed inset-x-0 bottom-0 z-[60]" style={{ top: base }} />
      <div className="onboarding-foco-bloqueio fixed left-0 z-[60]" style={{ top: topo, width: esquerda, height: base - topo }} />
      <div className="onboarding-foco-bloqueio fixed right-0 z-[60]" style={{ top: topo, left: direita, height: base - topo }} />
      <div
        className="onboarding-foco-anel pointer-events-none fixed z-[60] rounded-2xl"
        style={{
          top: retangulo.top - MARGEM_FOCO,
          left: retangulo.left - MARGEM_FOCO,
          width: retangulo.width + MARGEM_FOCO * 2,
          height: retangulo.height + MARGEM_FOCO * 2,
        }}
      />
    </div>
  );
}
