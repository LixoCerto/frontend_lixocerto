import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Apple, CupSoda, Lightbulb, Milk, Newspaper, Recycle } from "lucide-react";

type ModoCarregamento = "entrada" | "saida";

const CHAVE_TRANSICAO = "lixo-certo:transicao";

export function marcarTransicao(modo: ModoCarregamento) {
  try {
    window.sessionStorage.setItem(CHAVE_TRANSICAO, modo);
  } catch {
    // Sem sessionStorage a transição apenas não é exibida.
  }
}

export function lerTransicao(): ModoCarregamento | null {
  try {
    const valor = window.sessionStorage.getItem(CHAVE_TRANSICAO);
    return valor === "entrada" || valor === "saida" ? valor : null;
  } catch {
    return null;
  }
}

export function limparTransicao() {
  try {
    window.sessionStorage.removeItem(CHAVE_TRANSICAO);
  } catch {
    // Nada a limpar.
  }
}

export const esperar = (ms: number) => new Promise<void>(resolver => window.setTimeout(resolver, ms));

const ITENS: { icone: LucideIcon; cor: string }[] = [
  { icone: Newspaper, cor: "#7cc4f5" },
  { icone: CupSoda, cor: "#f59a8a" },
  { icone: Milk, cor: "#f5d36b" },
  { icone: Apple, cor: "#c9a27a" },
];

const ETAPAS: Record<ModoCarregamento, string[]> = {
  entrada: ["Separando os recicláveis...", "Organizando o seu painel...", "Contando seus pontos...", "Quase pronto!"],
  saida: ["Encerrando sua sessão com segurança...", "Guardando seu progresso...", "Tudo certo!"],
};

const DICAS = [
  "O alumínio pode ser reciclado infinitas vezes sem perder qualidade.",
  "Pilhas e baterias não vão no lixo comum: leve a um ponto de coleta.",
  "Óleo de cozinha usado vai numa garrafa fechada até um ponto de coleta, nunca na pia.",
  "Embalagens limpas e secas têm mais chance de serem recicladas.",
  "Restos de comida podem virar adubo na compostagem.",
  "Vidro quebrado deve ser embrulhado em jornal antes do descarte, para proteger quem coleta.",
];

interface TelaCarregamentoProps {
  modo?: ModoCarregamento;
  nome?: string | null;
}

export default function TelaCarregamento({ modo = "entrada", nome }: TelaCarregamentoProps) {
  const etapas = ETAPAS[modo];
  const [etapa, setEtapa] = useState(0);
  const [dica] = useState(() => DICAS[Math.floor(Math.random() * DICAS.length)]);
  const primeiroNome = nome?.trim().split(/\s+/)[0];

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setEtapa(atual => Math.min(atual + 1, etapas.length - 1));
    }, 650);
    return () => window.clearInterval(intervalo);
  }, [etapas.length]);

  const titulo = modo === "entrada"
    ? primeiroNome ? `Bem-vindo(a), ${primeiroNome}!` : "Preparando seu espaço"
    : primeiroNome ? `Até logo, ${primeiroNome}!` : "Até logo!";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="carregamento-tela fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden px-5 text-white"
    >
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative h-44 w-40" aria-hidden="true">
          {ITENS.map(({ icone: Icone, cor }, indice) => (
            <span
              key={indice}
              className="carregamento-item absolute left-1/2 top-0 grid h-10 w-10 place-items-center rounded-xl bg-white shadow-lg"
              style={{ color: cor, animationDelay: `${indice * 0.55}s` }}
            >
              <Icone className="h-5 w-5" />
            </span>
          ))}
          <div className="absolute bottom-0 left-1/2 w-28 -translate-x-1/2">
            <div className="carregamento-tampa mx-auto h-3 w-[7.5rem] -translate-x-1 rounded-full bg-[#b8e07a]" />
            <div className="mx-auto mt-1 grid h-24 w-24 place-items-center rounded-b-3xl rounded-t-md bg-gradient-to-b from-[#2c8a5e] to-[#1d7953] shadow-[0_18px_40px_-16px_rgba(0,0,0,.6)]">
              <Recycle className="carregamento-icone h-10 w-10 text-[#d6efad]" />
            </div>
          </div>
        </div>

        <h1 className="mt-7 text-2xl font-black tracking-tight sm:text-3xl">{titulo}</h1>
        <p key={etapa} className="carregamento-etapa mt-2 min-h-6 text-sm font-semibold text-[#cfe5d6] sm:text-base">{etapas[etapa]}</p>

        <div className="mt-5 h-2 w-full max-w-[16rem] overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#b8e07a] to-[#8fdcae] transition-[width] duration-500 ease-out"
            style={{ width: `${((etapa + 1) / etapas.length) * 100}%` }}
          />
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-left">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f5d36b]/20 text-[#f5d36b]">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-[13px] leading-5 text-[#e3efe6]">
            <strong className="block text-[11px] font-black uppercase tracking-[0.14em] text-[#f5d36b]">Você sabia?</strong>
            {dica}
          </p>
        </div>
      </div>
    </div>
  );
}
