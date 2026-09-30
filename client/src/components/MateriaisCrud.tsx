import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Archive, BookOpenCheck, Check, ExternalLink, LoaderCircle, Pencil, Plus, Save, Search, Undo2, X } from "lucide-react";
import { alterarStatusMaterial, atualizarMaterial, criarMaterial, listarMateriais, type DadosMaterialApi, type FonteReferenciaMaterialApi } from "@/lib/api";

type Material = DadosMaterialApi & {
  idMaterial: string;
  statusMaterial: string;
  versaoConteudo: number;
  observacaoRevisao: string;
};

const dadoVazio: DadosMaterialApi = {
  codigoCatalogo: "",
  classificacao: "",
  nomeMaterial: "",
  categoriaMaterial: "",
  instrucaoDescarte: "",
  observacaoImpacto: "",
  sinonimos: [],
  preparacao: "",
  cuidados: "",
  categoriasPontos: [],
  rotasReferencia: [],
  abrangencia: "confirmar_localmente",
  notaAbrangencia: "",
  fontesReferencia: [],
  dataVerificacao: "",
};
const rotulosStatus: Record<string, string> = { rascunho: "Rascunho", publicado: "Publicado", arquivado: "Arquivado" };

export default function MateriaisCrud({ podeEscrever, podeAprovar }: { podeEscrever: boolean; podeAprovar: boolean }) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [dados, setDados] = useState<DadosMaterialApi>(dadoVazio);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("rascunho");
  const [editando, setEditando] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await listarMateriais(filtroTexto, "", filtroStatus);
      setMateriais(resposta.materiais.map(material => ({
        idMaterial: material.idMaterial,
        codigoCatalogo: material.codigoCatalogo,
        classificacao: material.classificacao,
        nomeMaterial: material.nomeMaterial,
        categoriaMaterial: material.categoriaMaterial,
        instrucaoDescarte: material.instrucaoDescarte,
        observacaoImpacto: material.observacaoImpacto,
        sinonimos: material.sinonimos,
        preparacao: material.preparacao,
        cuidados: material.cuidados,
        categoriasPontos: material.categoriasPontos,
        rotasReferencia: material.rotasReferencia,
        abrangencia: material.abrangencia,
        notaAbrangencia: material.notaAbrangencia,
        fontesReferencia: material.fontesReferencia.map(fonte => ({ titulo: fonte.titulo, url: fonte.url, comprova: fonte.comprova })),
        dataVerificacao: material.dataVerificacao,
        statusMaterial: material.statusMaterial,
        versaoConteudo: material.versaoConteudo,
        observacaoRevisao: material.observacaoRevisao,
      })));
    } catch {
      setErro("Não foi possível carregar os materiais. Verifique sua permissão e a conexão com a API.");
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus, filtroTexto]);

  useEffect(() => { void carregar(); }, [carregar]);

  function atualizar<K extends keyof DadosMaterialApi>(campo: K, valor: DadosMaterialApi[K]) {
    setDados(atual => ({ ...atual, [campo]: valor }));
  }

  function novoMaterial() {
    setEditando(null);
    setDados({ ...dadoVazio, fontesReferencia: [{ titulo: "", url: "", comprova: "" }] });
    setErro(null);
    setMensagem(null);
    setAberto(true);
  }

  function editarMaterial(material: Material) {
    setEditando(material.idMaterial);
    setDados({
      codigoCatalogo: material.codigoCatalogo,
      classificacao: material.classificacao,
      nomeMaterial: material.nomeMaterial,
      categoriaMaterial: material.categoriaMaterial,
      instrucaoDescarte: material.instrucaoDescarte,
      observacaoImpacto: material.observacaoImpacto,
      sinonimos: material.sinonimos,
      preparacao: material.preparacao,
      cuidados: material.cuidados,
      categoriasPontos: material.categoriasPontos,
      rotasReferencia: material.rotasReferencia,
      abrangencia: material.abrangencia,
      notaAbrangencia: material.notaAbrangencia,
      fontesReferencia: material.fontesReferencia.length ? material.fontesReferencia : [{ titulo: "", url: "", comprova: "" }],
      dataVerificacao: material.dataVerificacao,
    });
    setErro(null);
    setMensagem(null);
    setAberto(true);
  }

  function atualizarFonte(indice: number, campo: keyof FonteReferenciaMaterialApi, valor: string) {
    setDados(atual => ({
      ...atual,
      fontesReferencia: atual.fontesReferencia.map((fonte, atualIndice) => atualIndice === indice ? { ...fonte, [campo]: valor } : fonte),
    }));
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);
    const dadosNormalizados: DadosMaterialApi = {
      ...dados,
      codigoCatalogo: dados.codigoCatalogo.trim(),
      classificacao: dados.classificacao.trim(),
      notaAbrangencia: dados.notaAbrangencia.trim(),
      nomeMaterial: dados.nomeMaterial.trim(),
      categoriaMaterial: dados.categoriaMaterial.trim(),
      instrucaoDescarte: dados.instrucaoDescarte.trim(),
      observacaoImpacto: dados.observacaoImpacto.trim(),
      sinonimos: dados.sinonimos.map(item => item.trim()).filter(Boolean),
      rotasReferencia: dados.rotasReferencia.map(item => item.trim()).filter(Boolean),
      fontesReferencia: dados.fontesReferencia.filter(fonte => fonte.titulo.trim() || fonte.url.trim() || fonte.comprova.trim()),
    };
    if (!dadosNormalizados.nomeMaterial || !dadosNormalizados.categoriaMaterial || !dadosNormalizados.instrucaoDescarte) {
      setErro("Preencha nome, categoria e orientação de descarte.");
      return;
    }
    setSalvando(true);
    try {
      const resposta = editando ? await atualizarMaterial(editando, dadosNormalizados) : await criarMaterial(dadosNormalizados);
      if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado || "Operação não aceita");
      setMensagem(resposta.mensagemResultado);
      setAberto(false);
      await carregar();
    } catch {
      setErro("Não foi possível salvar. Revise os campos, as fontes e suas permissões.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(material: Material, status: string) {
    const acao = status === "arquivado" ? "Arquivar este material? Ele poderá ser restaurado como rascunho." : status === "publicado" ? "Publicar este material no guia visível aos usuários?" : "Devolver este material a rascunho?";
    if (!window.confirm(acao)) return;
    setErro(null);
    setMensagem(null);
    try {
      const resposta = await alterarStatusMaterial(material.idMaterial, status);
      if (!resposta.operacaoAceita) throw new Error(resposta.mensagemResultado);
      setMensagem(resposta.mensagemResultado);
      await carregar();
    } catch {
      setErro("Não foi possível alterar o status. Verifique suas permissões e, para publicar, inclua fontes de referência.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3d9664]">Fila de moderação</p>
          <h2 className="mt-2 text-2xl font-black text-[#17362a] sm:text-3xl">Central de revisão de materiais</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#668073]">Revise os rascunhos, confira fontes e limites locais e publique somente orientações validadas. Edições voltam para revisão; arquivar é reversível.</p>
        </div>
        {podeEscrever ? <button type="button" onClick={novoMaterial} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white"><Plus className="h-4 w-4" /> Novo material</button> : null}
      </div>

      {erro ? <div role="alert" className="rounded-2xl border border-[#f0c1bd] bg-[#fff4f0] p-4 text-sm font-bold text-[#a8493e]">{erro}</div> : null}
      {mensagem ? <div role="status" className="rounded-2xl border border-[#cfe3d1] bg-[#f2faf0] p-4 text-sm font-semibold text-[#356b4a]">{mensagem}</div> : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#e0eae1] bg-white p-4 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#d9e6db] px-3 py-2.5"><Search className="h-4 w-4 text-[#638775]" /><input value={filtroTexto} onChange={event => setFiltroTexto(event.target.value)} placeholder="Buscar material ou sinônimo" className="w-full text-sm outline-none" /></label>
        <select value={filtroStatus} onChange={event => setFiltroStatus(event.target.value)} className="rounded-xl border border-[#d9e6db] px-3 py-2.5 text-sm font-semibold">
          <option value="todos">Todos os status</option><option value="rascunho">Rascunhos</option><option value="publicado">Publicados</option><option value="arquivado">Arquivados</option>
        </select>
        <button type="button" onClick={() => void carregar()} className="rounded-xl border border-[#cfe3d1] px-4 py-2.5 text-sm font-black text-[#1d7953]">Atualizar</button>
      </div>

      {carregando ? <p className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#708a7b]">Carregando catálogo…</p> : null}
      {!carregando && materiais.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-[#708a7b]">Nenhum material encontrado com esses filtros.</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {materiais.map(material => (
          <article key={material.idMaterial} className="rounded-2xl border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)]">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf5e8] text-[#2b7a52]"><BookOpenCheck className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#17362a]">{material.nomeMaterial}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${material.statusMaterial === "publicado" ? "bg-[#e5f5e6] text-[#28744d]" : material.statusMaterial === "arquivado" ? "bg-[#f1f2f0] text-[#6b766e]" : "bg-[#fff2d9] text-[#94620e]"}`}>{rotulosStatus[material.statusMaterial] ?? material.statusMaterial}</span></div>
                <p className="mt-1 text-xs font-bold text-[#69907a]">{material.categoriaMaterial} · versão {material.versaoConteudo}</p>
              </div>
            </div>
            {material.classificacao ? <p className="mt-3 text-xs leading-5 text-[#71897b]">{material.classificacao}</p> : null}
            {material.notaAbrangencia ? <p className="mt-3 rounded-xl bg-[#eef5ed] p-3 text-xs leading-5 text-[#55715d]"><strong>Abrangência e limites:</strong> {material.notaAbrangencia}</p> : null}
            <p className="mt-4 text-sm leading-6 text-[#638071]">{material.instrucaoDescarte}</p>
            {material.cuidados ? <p className="mt-3 rounded-xl bg-[#fff8e7] p-3 text-xs leading-5 text-[#745f2d]"><strong>Cuidados:</strong> {material.cuidados}</p> : null}
            {material.rotasReferencia.length ? <div className="mt-3 rounded-xl bg-[#f5faf4] p-3"><p className="text-[10px] font-black uppercase tracking-wide text-[#55715d]">Rotas citadas nas fontes — confirmar aceitação local</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#638071]">{material.rotasReferencia.map((rota, indice) => <li key={`${rota}-${indice}`}>{rota}</li>)}</ul></div> : null}
            {material.fontesReferencia.length ? <div className="mt-3 flex flex-wrap gap-2">{material.fontesReferencia.map((fonte, indice) => <a key={`${fonte.url}-${indice}`} href={fonte.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-[#f0f5f0] px-2.5 py-1.5 text-xs font-bold text-[#337a51]">{fonte.titulo}<ExternalLink className="h-3 w-3" /></a>)}</div> : <p className="mt-3 text-xs font-bold text-[#a8493e]">Sem fontes de referência cadastradas.</p>}
            {material.observacaoRevisao ? <p className="mt-3 rounded-xl bg-[#fff4f0] p-3 text-xs text-[#a8493e]"><strong>Nota de revisão:</strong> {material.observacaoRevisao}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf2ed] pt-4">
              {podeEscrever && material.statusMaterial !== "arquivado" ? <button type="button" onClick={() => editarMaterial(material)} className="inline-flex items-center gap-1 rounded-lg bg-[#eef5ed] px-3 py-2 text-xs font-black text-[#337a51]"><Pencil className="h-3.5 w-3.5" /> Editar</button> : null}
              {podeAprovar && material.statusMaterial === "rascunho" ? <button type="button" onClick={() => void alterarStatus(material, "publicado")} className="inline-flex items-center gap-1 rounded-lg bg-[#e5f5e6] px-3 py-2 text-xs font-black text-[#28744d]"><Check className="h-3.5 w-3.5" /> Publicar</button> : null}
              {podeEscrever && material.statusMaterial === "publicado" ? <button type="button" onClick={() => void alterarStatus(material, "rascunho")} className="inline-flex items-center gap-1 rounded-lg bg-[#fff2d9] px-3 py-2 text-xs font-black text-[#94620e]"><Undo2 className="h-3.5 w-3.5" /> Devolver a rascunho</button> : null}
              {podeEscrever && material.statusMaterial !== "arquivado" ? <button type="button" onClick={() => void alterarStatus(material, "arquivado")} className="inline-flex items-center gap-1 rounded-lg bg-[#fff1ef] px-3 py-2 text-xs font-black text-[#a8493e]"><Archive className="h-3.5 w-3.5" /> Arquivar</button> : null}
              {podeEscrever && material.statusMaterial === "arquivado" ? <button type="button" onClick={() => void alterarStatus(material, "rascunho")} className="inline-flex items-center gap-1 rounded-lg bg-[#eef5ed] px-3 py-2 text-xs font-black text-[#337a51]"><Undo2 className="h-3.5 w-3.5" /> Restaurar como rascunho</button> : null}
            </div>
          </article>
        ))}
      </div>

      {aberto ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#17362a]/40 p-4">
          <form onSubmit={event => void salvar(event)} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3d9664]">Rascunho com rastreabilidade</p><h3 className="mt-1 text-2xl font-black text-[#17362a]">{editando ? "Editar material" : "Novo material"}</h3></div><button type="button" onClick={() => setAberto(false)} className="rounded-xl p-2 text-[#648074] hover:bg-[#edf3ed]" aria-label="Fechar formulário"><X /></button></div>
            {erro ? <div role="alert" className="mt-5 rounded-xl border border-[#f0c1bd] bg-[#fff4f0] p-3 text-sm font-bold text-[#a8493e]">{erro}</div> : null}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Nome do material</span><input required maxLength={160} value={dados.nomeMaterial} onChange={event => atualizar("nomeMaterial", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Categoria</span><input required maxLength={80} value={dados.categoriaMaterial} onChange={event => atualizar("categoriaMaterial", event.target.value)} placeholder="Ex.: Eletroeletrônicos" className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Classificação / recorte do material</span><textarea maxLength={500} rows={2} value={dados.classificacao} onChange={event => atualizar("classificacao", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Sinônimos para pesquisa (separados por vírgula)</span><input value={dados.sinonimos.join(", ")} onChange={event => atualizar("sinonimos", event.target.value.split(","))} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Orientação de descarte</span><textarea required rows={3} maxLength={12000} value={dados.instrucaoDescarte} onChange={event => atualizar("instrucaoDescarte", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Como preparar</span><textarea rows={2} value={dados.preparacao} onChange={event => atualizar("preparacao", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Cuidados e limites</span><textarea rows={2} value={dados.cuidados} onChange={event => atualizar("cuidados", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Por que importa (qualitativo)</span><textarea rows={2} value={dados.observacaoImpacto} onChange={event => atualizar("observacaoImpacto", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Abrangência</span><select value={dados.abrangencia} onChange={event => atualizar("abrangencia", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm"><option value="orientacao_geral">Orientação geral</option><option value="logistica_reversa">Logística reversa</option><option value="confirmar_localmente">Confirmar regra local</option></select></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Contexto geográfico e limites da orientação</span><textarea maxLength={2000} rows={3} value={dados.notaAbrangencia} onChange={event => atualizar("notaAbrangencia", event.target.value)} className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Código do catálogo (opcional)</span><input value={dados.codigoCatalogo} onChange={event => atualizar("codigoCatalogo", event.target.value)} placeholder="Ex.: eletronicos-celular" className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Categorias do catálogo relacionadas a pontos cadastrados</span><textarea rows={2} value={dados.categoriasPontos.join("\n")} onChange={event => atualizar("categoriasPontos", event.target.value.split("\n"))} placeholder="Uma categoria por linha; use apenas quando a relação for direta" className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black uppercase text-[#5f7b6c]">Rotas de destinação citadas nas fontes</span><textarea rows={4} value={dados.rotasReferencia.join("\n")} onChange={event => atualizar("rotasReferencia", event.target.value.split("\n"))} placeholder="Uma rota por linha; informe o município/operador quando aplicável" className="w-full rounded-xl border border-[#d9e6db] px-4 py-3 text-sm" /><span className="mt-1 block text-xs text-[#71897b]">Rotas de pesquisa não significam que um ponto cadastrado aceite o material. Confirme com o operador local.</span></label>
              <fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-black uppercase text-[#5f7b6c]">Fontes de referência</legend><div className="space-y-3">{dados.fontesReferencia.map((fonte, indice) => <div key={indice} className="grid gap-2 rounded-xl border border-[#e1ebe2] p-3 sm:grid-cols-2"><input aria-label="Título da fonte" placeholder="Título / órgão" value={fonte.titulo} onChange={event => atualizarFonte(indice, "titulo", event.target.value)} className="rounded-lg border border-[#d9e6db] px-3 py-2 text-sm" /><input aria-label="URL da fonte" placeholder="https://…" value={fonte.url} onChange={event => atualizarFonte(indice, "url", event.target.value)} className="rounded-lg border border-[#d9e6db] px-3 py-2 text-sm" /><textarea aria-label="O que esta fonte comprova" placeholder="O que a fonte sustenta" rows={2} value={fonte.comprova} onChange={event => atualizarFonte(indice, "comprova", event.target.value)} className="rounded-lg border border-[#d9e6db] px-3 py-2 text-sm sm:col-span-2" /><button type="button" onClick={() => atualizar("fontesReferencia", dados.fontesReferencia.filter((_, fonteIndice) => fonteIndice !== indice))} className="justify-self-start text-xs font-bold text-[#a8493e]">Remover fonte</button></div>)}</div><button type="button" onClick={() => atualizar("fontesReferencia", [...dados.fontesReferencia, { titulo: "", url: "", comprova: "" }])} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#eef5ed] px-3 py-2 text-xs font-black text-[#337a51]"><Plus className="h-3.5 w-3.5" /> Adicionar fonte</button><p className="mt-2 text-xs text-[#71897b]">É necessário cadastrar ao menos uma fonte antes de publicar.</p></fieldset>
            </div>
            <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setAberto(false)} className="rounded-xl border border-[#cfe3d1] px-4 py-3 text-sm font-black text-[#5d796a]">Cancelar</button><button type="submit" disabled={salvando} className="inline-flex items-center gap-2 rounded-xl bg-[#17362a] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{salvando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{salvando ? "Salvando…" : "Salvar rascunho"}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
