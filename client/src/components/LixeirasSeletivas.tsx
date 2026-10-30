import type { LucideIcon } from "lucide-react";
import { Apple, Cog, Newspaper, Package, Wine } from "lucide-react";
import { useEffect, useState } from "react";

type Residuo = {
  rotulo: string;
  nomeCor: string;
  cor: string;
  corTampa: string;
  dica: string;
  Icone: LucideIcon;
};

/** Cores do padrão brasileiro de coleta seletiva (Resolução CONAMA 275/2001). */
const RESIDUOS: Residuo[] = [
  { rotulo: "Papel", nomeCor: "azul", cor: "#2f6fb0", corTampa: "#245a91", Icone: Newspaper, dica: "Jornais, revistas, caixas e folhas. Precisa estar limpo e seco." },
  { rotulo: "Plástico", nomeCor: "vermelha", cor: "#d0493e", corTampa: "#ab3a31", Icone: Package, dica: "Garrafas PET, potes e embalagens. Enxágue antes de descartar." },
  { rotulo: "Vidro", nomeCor: "verde", cor: "#2f9a5f", corTampa: "#247c4c", Icone: Wine, dica: "Garrafas, potes e frascos. Embrulhe cacos para evitar acidentes." },
  { rotulo: "Metal", nomeCor: "amarela", cor: "#e0a52a", corTampa: "#b98620", Icone: Cog, dica: "Latas de alumínio e de aço. Amasse para ocupar menos espaço." },
  { rotulo: "Orgânico", nomeCor: "marrom", cor: "#8a5a34", corTampa: "#6f4728", Icone: Apple, dica: "Restos de alimentos, cascas e borra de café. Ótimo para compostagem." },
];

const INTERVALO_MS = 2800;

/**
 * Ilustração interativa das lixeiras da coleta seletiva.
 * Alterna sozinha entre as lixeiras e, ao passar o mouse ou focar com o teclado,
 * abre a tampa e mostra uma dica de descarte do material.
 */
export default function LixeirasSeletivas() {
  const [ativa, setAtiva] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setAtiva(atual => (atual + 1) % RESIDUOS.length), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [pausado]);

  const residuoAtivo = RESIDUOS[ativa];

  return (
    <div
      className="rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-5 backdrop-blur-sm"
      onMouseLeave={() => setPausado(false)}
    >
      <div className="flex items-end justify-between gap-1" role="group" aria-label="Lixeiras da coleta seletiva">
        {RESIDUOS.map((residuo, indice) => {
          const selecionada = indice === ativa;
          const { Icone } = residuo;
          return (
            <button
              key={residuo.rotulo}
              type="button"
              data-ativa={selecionada}
              aria-pressed={selecionada}
              aria-label={`${selecionada ? "Certo! " : ""}${residuo.rotulo} — lixeira ${residuo.nomeCor}`}
              onMouseEnter={() => { setPausado(true); setAtiva(indice); }}
              onFocus={() => { setPausado(true); setAtiva(indice); }}
              onBlur={() => setPausado(false)}
              onClick={() => { setPausado(true); setAtiva(indice); }}
              className="lixeira relative flex flex-1 flex-col items-center gap-2 rounded-2xl pt-9 outline-none focus-visible:ring-2 focus-visible:ring-[#d6efad]/70"
            >
              {selecionada ? (
                <span key={`pontos-${indice}`} className="lixeira-pontos absolute top-0 z-10 whitespace-nowrap rounded-full shadow-[0_4px_10px_-4px_rgba(0,0,0,.5)] bg-[#d6efad] px-2 py-0.5 text-[10px] font-black text-[#17362a]">
                  Certo!
                </span>
              ) : null}
              <span className="lixeira-corpo relative block h-[88px] w-[70px]">
                <svg viewBox="0 0 54 68" className="h-full w-full overflow-visible" aria-hidden="true">
                  <ellipse cx="27" cy="66" rx="20" ry="2.5" fill="#000" opacity="0.25" />
                  <g className="lixeira-tampa">
                    <rect x="20" y="1.5" width="14" height="6" rx="3" fill="none" stroke={residuo.corTampa} strokeWidth="3" />
                    <rect x="2" y="7" width="50" height="8" rx="3" fill={residuo.corTampa} />
                  </g>
                  <path d="M6 16 H48 L44.5 61 Q44 65 40 65 H14 Q10 65 9.5 61 Z" fill={residuo.cor} />
                  <path d="M6 16 H48 L47.6 20 H6.4 Z" fill="#000" opacity="0.14" />
                  <path d="M12 23 L13.5 58" stroke="#fff" strokeOpacity="0.16" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-x-0 top-[44%] flex justify-center text-white">
                  <Icone className="h-6 w-6" aria-hidden="true" />
                </span>
              </span>
              <span className={`text-[13px] font-bold transition-colors ${selecionada ? "text-white" : "text-[#9db9a7]"}`}>{residuo.rotulo}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-[52px] items-start gap-3 rounded-2xl bg-black/15 px-4 py-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: residuoAtivo.cor }} aria-hidden="true" />
        <p className="text-sm leading-6 text-[#cfe0d4]">
          <strong className="text-white">Lixeira {residuoAtivo.nomeCor} · {residuoAtivo.rotulo}.</strong> {residuoAtivo.dica}
        </p>
      </div>
    </div>
  );
}

/** Faixa compacta das cores da coleta seletiva, usada no topo do formulário em telas pequenas. */
export function LixeirasSeletivasCompacta() {
  return (
    <div
      role="img"
      aria-label="Cores da coleta seletiva: azul para papel, vermelho para plástico, verde para vidro, amarelo para metal e marrom para orgânico."
      className="flex items-center justify-center gap-2"
    >
      {RESIDUOS.map(({ rotulo, cor, Icone }) => (
        <span key={rotulo} style={{ backgroundColor: cor }} className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm">
          <Icone className="h-4 w-4" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}
