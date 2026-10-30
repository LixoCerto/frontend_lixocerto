import { AlertTriangle, ChevronDown, ExternalLink, MapPinned, Recycle, Sparkles } from "lucide-react";
import { TONS, type TomPagina } from "@/components/pagina/Pagina";

export type MaterialGuia = {
  id: string;
  name: string;
  category: string;
  classification: string;
  disposalInstruction: string;
  impactNote: string;
  synonyms: string[];
  preparation: string;
  cautions: string;
  acceptedPointCategories: string[];
  routes: string[];
  scope: string;
  scopeNote: string;
  sources: { title: string; url: string; supports: string }[];
  verifiedAt: string;
};

/** Associa a categoria do material à cor da lixeira da coleta seletiva (CONAMA 275/2001). */
export function tomDaCategoria(categoria: string): TomPagina {
  const texto = categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/papel|papelao/.test(texto)) return "azul";
  if (/plastic/.test(texto)) return "vermelho";
  if (/vidro/.test(texto)) return "verde";
  if (/metal|aluminio|aco|lata/.test(texto)) return "amarelo";
  if (/organic|compost|alimento/.test(texto)) return "marrom";
  if (/eletr|pilha|bateria|perigos|lampada|oleo|medicament/.test(texto)) return "roxo";
  return "cinza";
}

export default function GuiaMaterialCard({
  material,
  onEncontrarPonto,
}: {
  material: MaterialGuia;
  onEncontrarPonto: (categorias: string[]) => void;
}) {
  const abrangencia = material.scope === "logistica_reversa"
    ? "Logística reversa"
    : material.scope === "orientacao_geral"
      ? "Orientação geral"
      : "Confirme a regra da sua cidade";
  const tom = TONS[tomDaCategoria(material.category)];
  const temDetalhes = Boolean(material.scopeNote || material.routes.length || material.acceptedPointCategories.length || material.sources.length || material.impactNote);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#e1ebe2] bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-28px_rgba(23,54,42,.6)]">
      <div className="h-1.5" style={{ backgroundColor: tom.cor }} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: tom.fundo, color: tom.cor }} aria-hidden="true">
            <Recycle className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black leading-tight text-[#17362a]">{material.name}</h3>
            <span className="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: tom.fundo, color: tom.texto }}>{material.category}</span>
          </div>
        </div>

        {material.synonyms.length ? <p className="mt-3 text-xs text-[#4b6657]">Também chamado de: {material.synonyms.join(", ")}</p> : null}
        {material.classification ? <p className="mt-1 text-xs text-[#4b6657]">{material.classification}</p> : null}

        <div className="mt-4 rounded-2xl bg-[#f5faf4] p-4">
          <p className="text-sm font-black text-[#1d6b43]">Como descartar</p>
          <p className="mt-1 text-[15px] leading-6 text-[#3f5c4c]">{material.disposalInstruction}</p>
        </div>

        {material.preparation ? (
          <p className="mt-3 flex gap-2.5 rounded-2xl border border-[#e1ebe2] p-3.5 text-sm leading-6 text-[#4a6455]">
            <Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#2f9a5f]" aria-hidden="true" />
            <span><strong className="text-[#17362a]">Antes de descartar:</strong> {material.preparation}</span>
          </p>
        ) : null}
        {material.cautions ? (
          <p className="mt-3 flex gap-2.5 rounded-2xl bg-[#fff8e7] p-3.5 text-sm leading-6 text-[#6d5413]">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[#c98a12]" aria-hidden="true" />
            <span><strong>Atenção:</strong> {material.cautions}</span>
          </p>
        ) : null}

        {temDetalhes ? (
          <details className="group/detalhes mt-3 rounded-2xl border border-[#e1ebe2] [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3.5 text-sm font-bold text-[#285e47] hover:bg-[#f5faf4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]">
              Mais informações e fontes
              <ChevronDown className="h-4 w-4 transition-transform group-open/detalhes:rotate-180" aria-hidden="true" />
            </summary>
            <div className="space-y-3 border-t border-[#edf2ed] px-3.5 pb-3.5 pt-3 text-sm leading-6 text-[#4a6455]">
              {material.impactNote ? <p>{material.impactNote}</p> : null}
              {material.scopeNote ? <p><strong className="text-[#17362a]">Onde vale esta orientação:</strong> {material.scopeNote}</p> : null}
              {material.acceptedPointCategories.length ? (
                <div>
                  <p className="font-bold text-[#17362a]">Pontos que costumam receber</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {material.acceptedPointCategories.map(item => (
                      <span key={item} className="rounded-full bg-[#edf3ed] px-2.5 py-1 text-xs font-bold text-[#4a6455]">{item}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {material.routes.length ? (
                <div>
                  <p className="font-bold text-[#17362a]">Caminhos indicados pelas fontes</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {material.routes.map((rota, index) => <li key={`${rota}-${index}`}>{rota}</li>)}
                  </ul>
                  <p className="mt-1 text-xs text-[#4b6657]">Confirme se o ponto da sua cidade aceita.</p>
                </div>
              ) : null}
              {material.sources.length ? (
                <ul className="space-y-2">
                  {material.sources.map((source, index) => (
                    <li key={`${source.url}-${index}`} className="rounded-xl bg-[#f7faf7] p-2.5">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir fonte: ${source.title} em nova aba`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#eef5ed] px-2.5 text-xs font-bold text-[#2c6b4a] hover:bg-[#dff0d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]"
                      >
                        {source.title} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                      {source.supports ? <p className="mt-1 text-xs leading-5 text-[#4b6657]">Sustenta: {source.supports}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        ) : null}

        <div className="mt-auto pt-4">
          <p className="mb-3 text-xs font-semibold text-[#4b6657]">
            {abrangencia}{material.verifiedAt ? ` · Verificado em ${new Date(`${material.verifiedAt}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}
          </p>
          <button
            type="button"
            onClick={() => onEncontrarPonto(material.acceptedPointCategories)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-4 text-sm font-black text-white transition hover:bg-[#17362a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]"
          >
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Onde descartar
          </button>
        </div>
      </div>
    </article>
  );
}
