import type { LucideIcon } from "lucide-react";
import { Inbox, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

/**
 * Kit visual compartilhado pelas páginas internas do Lixo Certo.
 * Segue o mesmo estilo da Visão geral: cartões arredondados, cores da coleta seletiva,
 * textos curtos e alvos de toque grandes para pessoas de todas as idades.
 */

export type TomPagina = "verde" | "azul" | "amarelo" | "vermelho" | "marrom" | "roxo" | "cinza";

export const TONS: Record<TomPagina, { cor: string; fundo: string; borda: string; texto: string }> = {
  verde: { cor: "#2f9a5f", fundo: "#e6f5ec", borda: "#cfe8d8", texto: "#1d6b43" },
  azul: { cor: "#2f6fb0", fundo: "#e8f0fa", borda: "#cfdff2", texto: "#245a91" },
  amarelo: { cor: "#c98a12", fundo: "#fdf3dc", borda: "#f3e2b4", texto: "#8a5d06" },
  vermelho: { cor: "#d0493e", fundo: "#fbe9e7", borda: "#f3d0cb", texto: "#a3362d" },
  marrom: { cor: "#8a5a34", fundo: "#f5ece4", borda: "#e6d6c6", texto: "#6f4728" },
  roxo: { cor: "#6b5bb5", fundo: "#efedfa", borda: "#dcd7f2", texto: "#4f4291" },
  cinza: { cor: "#5f7a6b", fundo: "#eef3ef", borda: "#dfe8e1", texto: "#3f5c4c" },
};

/** Classes reutilizáveis para formulários e botões. */
export const ESTILOS = {
  cartao: "rounded-[24px] border border-[#e1ebe2] bg-white p-5 sm:p-6",
  rotulo: "mb-1.5 block text-sm font-bold text-[#2c4a3c]",
  campo:
    "h-12 w-full rounded-xl border border-[#d6e2d9] bg-white px-3.5 text-[15px] text-[#17362a] outline-none transition placeholder:text-[#a3b5aa] hover:border-[#b9cfc0] focus:border-[#1d7953] focus:ring-4 focus:ring-[#1d7953]/10 disabled:cursor-not-allowed disabled:bg-[#f4f7f4] disabled:text-[#8aa094]",
  areaTexto:
    "min-h-28 w-full rounded-xl border border-[#d6e2d9] bg-white px-3.5 py-3 text-[15px] leading-6 text-[#17362a] outline-none transition placeholder:text-[#a3b5aa] hover:border-[#b9cfc0] focus:border-[#1d7953] focus:ring-4 focus:ring-[#1d7953]/10",
  botaoPrincipal:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-5 text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(29,121,83,.9)] transition hover:bg-[#17362a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-not-allowed disabled:opacity-60",
  botaoSecundario:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d6e2d9] bg-white px-4 text-sm font-bold text-[#285e47] transition hover:border-[#afd2b3] hover:bg-[#f5faf4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-not-allowed disabled:opacity-60",
  botaoPerigo:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#f0c6c1] bg-white px-4 text-sm font-bold text-[#a8493e] transition hover:bg-[#fff5f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8493e] disabled:cursor-not-allowed disabled:opacity-60",
  botaoIcone:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[#5f7a6b] transition hover:bg-[#eef4ef] hover:text-[#17362a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-not-allowed disabled:opacity-50",
  tabela: "w-full min-w-[640px] text-left text-sm",
  tabelaCabecalho: "bg-[#f5f9f5] text-xs font-bold text-[#5f7a6b]",
} as const;

interface CabecalhoPaginaProps {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  tom?: TomPagina;
  /** Botões ou ações exibidos à direita (abaixo, no celular). */
  acoes?: ReactNode;
  /** Conteúdo extra abaixo do texto, como estatísticas rápidas. */
  children?: ReactNode;
}

/** Faixa de abertura de cada página: ícone colorido, título curto e uma frase explicando o que fazer ali. */
export function CabecalhoPagina({ icone: Icone, titulo, descricao, tom = "verde", acoes, children }: CabecalhoPaginaProps) {
  const t = TONS[tom];
  return (
    <section
      className="relative overflow-hidden rounded-[28px] border bg-white px-5 py-5 sm:px-7 sm:py-6"
      style={{ borderColor: t.borda, backgroundImage: `radial-gradient(circle at 100% 0%, ${t.fundo} 0, transparent 55%)` }}
    >
      <Icone className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rotate-12 opacity-[0.07]" style={{ color: t.cor }} aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-[0_10px_22px_-12px_rgba(0,0,0,.45)]" style={{ backgroundColor: t.cor }}>
            <Icone className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[1.6rem] font-black leading-tight tracking-[-0.03em] text-[#17362a] sm:text-[1.85rem]">{titulo}</h2>
            <p className="mt-1 max-w-2xl text-[15px] leading-6 text-[#5c7768]">{descricao}</p>
          </div>
        </div>
        {acoes ? <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">{acoes}</div> : null}
      </div>
      {children ? <div className="relative mt-5">{children}</div> : null}
    </section>
  );
}

interface EstatisticaProps {
  icone: LucideIcon;
  valor: ReactNode;
  rotulo: string;
  tom?: TomPagina;
}

/** Número em destaque com ícone, para resumos rápidos no topo das páginas. */
export function Estatistica({ icone: Icone, valor, rotulo, tom = "verde" }: EstatisticaProps) {
  const t = TONS[tom];
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: t.borda }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: t.fundo, color: t.cor }}>
        <Icone className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <strong className="block text-xl font-black leading-tight tabular-nums text-[#17362a]">{valor}</strong>
        <span className="block truncate text-xs font-semibold text-[#6c8879]">{rotulo}</span>
      </div>
    </div>
  );
}

interface CartaoProps {
  titulo?: ReactNode;
  descricao?: ReactNode;
  icone?: LucideIcon;
  tom?: TomPagina;
  acoes?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}

/** Cartão branco padrão com cabeçalho opcional (ícone + título + ações). */
export function Cartao({ titulo, descricao, icone: Icone, tom = "verde", acoes, children, className = "", id }: CartaoProps) {
  const t = TONS[tom];
  return (
    <section id={id} className={`rounded-[24px] border border-[#e1ebe2] bg-white p-5 sm:p-6 ${className}`}>
      {titulo || acoes ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {Icone ? (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: t.fundo, color: t.cor }}>
                <Icone className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : null}
            <div className="min-w-0">
              {titulo ? <h3 className="text-lg font-black leading-tight tracking-tight text-[#17362a]">{titulo}</h3> : null}
              {descricao ? <p className="mt-0.5 text-sm leading-6 text-[#6c8879]">{descricao}</p> : null}
            </div>
          </div>
          {acoes ? <div className="flex flex-wrap gap-2 sm:shrink-0">{acoes}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

interface EstadoVazioProps {
  icone?: LucideIcon;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  tom?: TomPagina;
}

/** Mensagem amigável quando não há itens para mostrar. */
export function EstadoVazio({ icone: Icone = Inbox, titulo, descricao, acao, tom = "verde" }: EstadoVazioProps) {
  const t = TONS[tom];
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-[#d6e2d9] bg-[#fafcf9] px-5 py-10 text-center" role="status">
      <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ backgroundColor: t.fundo, color: t.cor }}>
        <Icone className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-4 text-base font-black text-[#244637]">{titulo}</p>
      {descricao ? <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-[#6c8879]">{descricao}</p> : null}
      {acao ? <div className="mt-5">{acao}</div> : null}
    </div>
  );
}

/** Indicador de carregamento acessível. */
export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-[22px] bg-white px-5 py-10 text-sm font-semibold text-[#6c8879]" role="status" aria-live="polite">
      <LoaderCircle className="h-5 w-5 animate-spin text-[#1d7953]" aria-hidden="true" />
      {texto}
    </div>
  );
}

interface AvisoProps {
  tipo?: "erro" | "sucesso" | "info" | "atencao";
  children: ReactNode;
  acao?: ReactNode;
  focar?: boolean;
}
/** Caixa de mensagem (erro, sucesso, informação ou atenção). */
export function Aviso({ tipo = "info", children, acao, focar = false }: AvisoProps) {
  const referencia = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focar) referencia.current?.focus({ preventScroll: true });
  }, [focar, children]);
  const estilos = {
    erro: "border-[#f0c6c1] bg-[#fff5f3] text-[#a8493e]",
    sucesso: "border-[#cfe3d1] bg-[#f1f9ef] text-[#2f6a46]",
    info: "border-[#cfdff2] bg-[#f2f7fd] text-[#2c5a86]",
    atencao: "border-[#f3e2b4] bg-[#fff9e9] text-[#7f5a0b]",
  }[tipo];
  return (
    <div ref={referencia} tabIndex={focar ? -1 : undefined} role={tipo === "erro" ? "alert" : "status"} className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 sm:flex-row sm:items-center sm:justify-between ${estilos}`}>
      <div className="flex items-start gap-2.5">
        {tipo === "erro" || tipo === "atencao" ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        <div className="min-w-0">{children}</div>
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}

interface EtiquetaProps {
  tom?: TomPagina;
  children: ReactNode;
  icone?: LucideIcon;
}

/** Selo pequeno de status (ex.: Publicado, Pendente, Concluído). */
export function Etiqueta({ tom = "cinza", children, icone: Icone }: EtiquetaProps) {
  const t = TONS[tom];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: t.fundo, color: t.texto }}>
      {Icone ? <Icone className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

interface AbasProps<T extends string> {
  abas: ReadonlyArray<{ id: T; rotulo: string; icone?: LucideIcon; contador?: number }>;
  ativa: T;
  onChange: (id: T) => void;
  rotulo: string;
}

/** Abas em formato de "pílulas", roláveis horizontalmente no celular. */
export function Abas<T extends string>({ abas, ativa, onChange, rotulo }: AbasProps<T>) {
  const referencias = useRef<Array<HTMLButtonElement | null>>([]);
  function navegarComTeclado(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const proximo = evento.key === 'Home'
      ? 0
      : evento.key === 'End'
        ? abas.length - 1
        : (indice + (evento.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length;
    const aba = abas[proximo];
    if (!aba) return;
    onChange(aba.id);
    referencias.current[proximo]?.focus();
  }
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label={rotulo}>
      <div className="inline-flex min-w-full gap-1 rounded-2xl bg-[#e9f0eb] p-1 sm:min-w-0">
        {abas.map(({ id, rotulo: texto, icone: Icone, contador }, indice) => {
          const selecionada = id === ativa;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selecionada}
              aria-controls={`painel-${id}`}
              tabIndex={selecionada ? 0 : -1}
              ref={elemento => { referencias.current[indice] = elemento; }}
              onClick={() => onChange(id)}
              onKeyDown={evento => navegarComTeclado(evento, indice)}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition sm:flex-none ${selecionada ? "bg-white text-[#17362a] shadow-[0_1px_3px_rgba(23,54,42,.15)]" : "text-[#5f7a6b] hover:text-[#17362a]"}`}
            >
              {Icone ? <Icone className="h-4 w-4" aria-hidden="true" /> : null}
              {texto}
              {typeof contador === "number" ? (
                <span className={`rounded-full px-1.5 text-[11px] font-black tabular-nums ${selecionada ? "bg-[#1d7953] text-white" : "bg-white/70 text-[#5f7a6b]"}`}>{contador}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Barra de progresso simples. */
export function BarraProgresso({ percentual, tom = "verde", rotulo }: { percentual: number; tom?: TomPagina; rotulo: string }) {
  const valor = Math.max(0, Math.min(100, Math.round(percentual)));
  const estilo: CSSProperties = { width: `${valor}%`, backgroundColor: TONS[tom].cor };
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-[#e8efe9]" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor}>
      <div className="h-full rounded-full transition-all duration-700" style={estilo} />
    </div>
  );
}
