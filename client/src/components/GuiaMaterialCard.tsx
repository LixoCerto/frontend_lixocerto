import { ExternalLink, MapPinned, Recycle } from "lucide-react";

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

export default function GuiaMaterialCard({
  material,
  onEncontrarPonto,
}: {
  material: MaterialGuia;
  onEncontrarPonto: (categorias: string[]) => void;
}) {
  const abrangencia = material.scope === "logistica_reversa"
    ? "Sistema de logística reversa"
    : material.scope === "orientacao_geral"
      ? "Orientação geral"
      : "Confirme a regra local e a aceitação do ponto";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf5e8] text-[#2b7a52]" aria-hidden="true">
          <Recycle className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-[#f1f5ed] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#69907a]">
          {material.category}
        </span>
      </div>

      <h3 className="mt-5 text-base font-black">{material.name}</h3>
      {material.classification ? <p className="mt-1 text-xs leading-5 text-[#71897b]">{material.classification}</p> : null}
      {material.synonyms.length ? <p className="mt-2 text-xs text-[#71897b]">Também conhecido como: {material.synonyms.join(", ")}</p> : null}
      <p className="mt-2 text-sm leading-6 text-[#638071]">{material.disposalInstruction}</p>

      {material.preparation ? (
        <p className="mt-3 rounded-xl bg-[#f5faf4] p-3 text-xs leading-5 text-[#55715d]">
          <strong>Como preparar:</strong> {material.preparation}
        </p>
      ) : null}
      {material.cautions ? (
        <p className="mt-3 rounded-xl bg-[#fff8e7] p-3 text-xs leading-5 text-[#745f2d]">
          <strong>Atenção:</strong> {material.cautions}
        </p>
      ) : null}
      {material.scopeNote ? (
        <p className="mt-3 rounded-xl bg-[#eef5ed] p-3 text-xs leading-5 text-[#55715d]">
          <strong>Abrangência e limites:</strong> {material.scopeNote}
        </p>
      ) : null}
      {material.acceptedPointCategories.length ? (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase text-[#71897b]">Categorias de pontos relacionadas</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {material.acceptedPointCategories.map(item => (
              <span key={item} className="rounded-full bg-[#edf3ed] px-2 py-1 text-[10px] font-bold text-[#5d796a]">{item}</span>
            ))}
          </div>
        </div>
      ) : null}
      {material.routes.length ? (
        <div className="mt-3 rounded-xl bg-[#f5faf4] p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#55715d]">Rotas citadas nas fontes — confirme a aceitação local</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#638071]">
            {material.routes.map((rota, index) => <li key={`${rota}-${index}`}>{rota}</li>)}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 border-t border-[#edf2ed] pt-3 text-xs font-semibold leading-5 text-[#7b9485]">{material.impactNote}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#668073]">
        {abrangencia}{material.verifiedAt ? ` · Fonte verificada em ${new Date(`${material.verifiedAt}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}
      </p>
      {material.sources.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {material.sources.map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              title={source.supports}
              aria-label={`Abrir fonte: ${source.title} em nova aba`}
              className="rounded-lg bg-[#eef5ed] px-2.5 py-1.5 text-xs font-black text-[#337a51] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]"
            >
              Fonte: {source.title} <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onEncontrarPonto(material.acceptedPointCategories)}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cfe3d1] px-4 py-3 text-sm font-black text-[#1d7953] transition hover:bg-[#f2f8ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953]"
      >
        <MapPinned className="h-4 w-4" aria-hidden="true" />
        Encontrar ponto de coleta
      </button>
    </article>
  );
}
