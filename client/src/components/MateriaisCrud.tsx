import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Archive, BookOpen, BookOpenCheck, Check, CircleCheck, ClipboardCheck, Clock3, ExternalLink, FolderOpen, Layers, Link2, ListChecks, LoaderCircle, MapPinned, MessageSquare, Pencil, Plus, RefreshCw, Route, Save, Search, Trash2, TriangleAlert, Undo2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Abas, Aviso, CabecalhoPagina, Carregando, Cartao, ESTILOS, EstadoVazio, Etiqueta, TONS, type TomPagina } from "@/components/pagina/Pagina";
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

const STATUS_VISUAL: Record<string, { tom: TomPagina; icone: LucideIcon }> = {
  rascunho: { tom: "amarelo", icone: Clock3 },
  publicado: { tom: "verde", icone: CircleCheck },
  arquivado: { tom: "cinza", icone: Archive },
};

const ABAS_STATUS = [
  { id: "rascunho", rotulo: "Para revisar", icone: Clock3 },
  { id: "publicado", rotulo: "Publicados", icone: CircleCheck },
  { id: "arquivado", rotulo: "Arquivados", icone: Archive },
  { id: "todos", rotulo: "Todos", icone: Layers },
] as const;

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
    <div className="space-y-5 sm:space-y-6">
      <CabecalhoPagina
        icone={ClipboardCheck}
        tom="azul"
        titulo="Central de revisão"
        descricao="Revise os rascunhos, confira as fontes e publique só orientações confirmadas. Toda edição volta para revisão, e arquivar pode ser desfeito."
        acoes={podeEscrever ? <button type="button" onClick={novoMaterial} className={`${ESTILOS.botaoPrincipal} w-full sm:w-auto`}><Plus className="h-4 w-4" aria-hidden="true" /> Novo material</button> : null}
      />

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {mensagem ? <Aviso tipo="sucesso">{mensagem}</Aviso> : null}

      <section id={`painel-${filtroStatus}`} className="space-y-3 rounded-[24px] border border-[#e1ebe2] bg-white p-4 sm:p-5" aria-label="Filtros da lista de materiais">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Buscar material ou sinônimo</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b6657]" aria-hidden="true" />
            <input value={filtroTexto} onChange={event => setFiltroTexto(event.target.value)} placeholder="Buscar material ou sinônimo" className={`${ESTILOS.campo} pl-10`} />
          </label>
          <button type="button" onClick={() => void carregar()} className={`${ESTILOS.botaoSecundario} h-12 sm:w-auto`}><RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} aria-hidden="true" /> Atualizar lista</button>
        </div>
        <Abas rotulo="Filtrar por situação" abas={ABAS_STATUS} ativa={filtroStatus} onChange={setFiltroStatus} />
      </section>

      {carregando ? <Carregando texto="Carregando materiais..." /> : null}
      {!carregando && materiais.length === 0 ? (
        <EstadoVazio
          icone={FolderOpen}
          tom="azul"
          titulo="Nenhum material por aqui"
          descricao="Tente outra palavra na busca ou escolha outra situação nas abas acima."
        />
      ) : null}
      {!carregando && materiais.length > 0 ? (
        <p className="px-1 text-sm font-semibold text-[#4b6657]">{materiais.length === 1 ? "1 material encontrado" : `${materiais.length} materiais encontrados`}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {materiais.map(material => {
          const status = STATUS_VISUAL[material.statusMaterial] ?? STATUS_VISUAL.rascunho;
          const IconeStatus = status.icone;
          return (
            <article key={material.idMaterial} className="flex min-w-0 flex-col rounded-[24px] border border-[#e1ebe2] bg-white p-5 shadow-[0_16px_32px_-30px_rgba(23,54,42,.6)] sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: TONS[status.tom].fundo, color: TONS[status.tom].cor }}><BookOpenCheck className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-black leading-tight text-[#17362a]">{material.nomeMaterial}</h3>
                    <Etiqueta tom={status.tom} icone={IconeStatus}>{rotulosStatus[material.statusMaterial] ?? material.statusMaterial}</Etiqueta>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#4b6657]">{material.categoriaMaterial} · versão {material.versaoConteudo}</p>
                </div>
              </div>

              {material.classificacao ? <p className="mt-3 text-sm leading-6 text-[#5c7768]">{material.classificacao}</p> : null}

              <div className="mt-4 rounded-2xl bg-[#f5f9f5] p-4">
                <p className="text-sm font-black text-[#17362a]">Como descartar</p>
                <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-[#46604f]">{material.instrucaoDescarte}</p>
              </div>

              {material.notaAbrangencia ? <Destaque icone={MapPinned} tom="azul" titulo="Onde vale e limites">{material.notaAbrangencia}</Destaque> : null}
              {material.cuidados ? <Destaque icone={TriangleAlert} tom="amarelo" titulo="Cuidados">{material.cuidados}</Destaque> : null}
              {material.rotasReferencia.length ? (
                <Destaque icone={Route} tom="verde" titulo="Destinos citados nas fontes (confirme se o local aceita)">
                  <ul className="mt-1 list-disc space-y-1 pl-4">{material.rotasReferencia.map((rota, indice) => <li key={`${rota}-${indice}`}>{rota}</li>)}</ul>
                </Destaque>
              ) : null}

              <div className="mt-4">
                <p className="mb-2 text-sm font-black text-[#17362a]">Fontes</p>
                {material.fontesReferencia.length ? (
                  <div className="flex flex-wrap gap-2">
                    {material.fontesReferencia.map((fonte, indice) => (
                      <a key={`${fonte.url}-${indice}`} href={fonte.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-xl border border-[#cfdff2] bg-[#f2f7fd] px-3 py-1.5 text-xs font-bold text-[#245a91] transition hover:bg-[#e8f0fa]">
                        <span className="truncate">{fonte.titulo}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff5f3] px-3 py-2 text-xs font-bold text-[#a8493e]"><TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Sem fontes de referência cadastradas.</p>
                )}
              </div>

              {material.observacaoRevisao ? <Destaque icone={MessageSquare} tom="vermelho" titulo="Nota da revisão">{material.observacaoRevisao}</Destaque> : null}

              <div className="mt-auto pt-5">
              <div className="flex flex-wrap gap-2 border-t border-[#edf2ed] pt-4 [&>button]:flex-1 sm:[&>button]:flex-none">
                {podeAprovar && material.statusMaterial === "rascunho" ? <button type="button" onClick={() => void alterarStatus(material, "publicado")} className={ESTILOS.botaoPrincipal}><Check className="h-4 w-4" aria-hidden="true" /> Aprovar e publicar</button> : null}
                {podeEscrever && material.statusMaterial !== "arquivado" ? <button type="button" onClick={() => editarMaterial(material)} className={ESTILOS.botaoSecundario}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar</button> : null}
                {podeEscrever && material.statusMaterial === "publicado" ? <button type="button" onClick={() => void alterarStatus(material, "rascunho")} className={ESTILOS.botaoSecundario}><Undo2 className="h-4 w-4" aria-hidden="true" /> Voltar para rascunho</button> : null}
                {podeEscrever && material.statusMaterial === "arquivado" ? <button type="button" onClick={() => void alterarStatus(material, "rascunho")} className={ESTILOS.botaoSecundario}><Undo2 className="h-4 w-4" aria-hidden="true" /> Restaurar como rascunho</button> : null}
                {podeEscrever && material.statusMaterial !== "arquivado" ? <button type="button" onClick={() => void alterarStatus(material, "arquivado")} className={ESTILOS.botaoPerigo}><Archive className="h-4 w-4" aria-hidden="true" /> Arquivar</button> : null}
              </div>
                              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        {aberto ? (
          <DialogContent showCloseButton={false} className="max-h-[92vh] w-full max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-[28px] border-0 bg-[#f6f9f6] p-0 shadow-2xl sm:max-w-3xl">
            <form onSubmit={event => void salvar(event)}>
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#e1ebe2] bg-white px-5 py-4 sm:px-7 sm:py-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: TONS.azul.cor }}>{editando ? <Pencil className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}</span>
                  <div className="min-w-0">
                    <DialogTitle className="text-left text-xl font-black leading-tight text-[#17362a] sm:text-2xl">{editando ? "Editar material" : "Novo material"}</DialogTitle>
                    <p className="mt-0.5 text-sm leading-6 text-[#4b6657]">Fica salvo como rascunho até ser aprovado.</p>
                    <DialogDescription className="sr-only">Cadastre ou edite uma orientação de descarte com contexto, limites e fontes de referência.</DialogDescription>
                  </div>
                </div>
                <button type="button" onClick={() => setAberto(false)} className={ESTILOS.botaoIcone} aria-label="Fechar formulário"><X className="h-5 w-5" aria-hidden="true" /></button>
              </div>

              <div className="space-y-4 p-4 sm:p-6">
                {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

                <Cartao icone={BookOpen} tom="azul" titulo="Sobre o material" descricao="Nome, categoria e palavras que ajudam a encontrá-lo.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo rotulo="Nome do material"><input required maxLength={160} value={dados.nomeMaterial} onChange={event => atualizar("nomeMaterial", event.target.value)} className={ESTILOS.campo} /></Campo>
                    <Campo rotulo="Categoria"><input required maxLength={80} value={dados.categoriaMaterial} onChange={event => atualizar("categoriaMaterial", event.target.value)} placeholder="Ex.: Eletroeletrônicos" className={ESTILOS.campo} /></Campo>
                    <Campo rotulo="Classificação / recorte do material" largo><textarea maxLength={500} rows={2} value={dados.classificacao} onChange={event => atualizar("classificacao", event.target.value)} className={`${ESTILOS.areaTexto} min-h-20`} /></Campo>
                    <Campo rotulo="Sinônimos para pesquisa" dica="Separe por vírgula." largo><input value={dados.sinonimos.join(", ")} onChange={event => atualizar("sinonimos", event.target.value.split(","))} className={ESTILOS.campo} /></Campo>
                    <Campo rotulo="Código do catálogo (opcional)"><input value={dados.codigoCatalogo} onChange={event => atualizar("codigoCatalogo", event.target.value)} placeholder="Ex.: eletronicos-celular" className={ESTILOS.campo} /></Campo>
                  </div>
                </Cartao>

                <Cartao icone={ListChecks} tom="verde" titulo="Como descartar" descricao="Passo a passo claro para quem vai descartar.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo rotulo="Orientação de descarte" largo><textarea required rows={3} maxLength={12000} value={dados.instrucaoDescarte} onChange={event => atualizar("instrucaoDescarte", event.target.value)} className={ESTILOS.areaTexto} /></Campo>
                    <Campo rotulo="Como preparar"><textarea rows={2} value={dados.preparacao} onChange={event => atualizar("preparacao", event.target.value)} className={`${ESTILOS.areaTexto} min-h-24`} /></Campo>
                    <Campo rotulo="Cuidados e limites"><textarea rows={2} value={dados.cuidados} onChange={event => atualizar("cuidados", event.target.value)} className={`${ESTILOS.areaTexto} min-h-24`} /></Campo>
                    <Campo rotulo="Por que isso importa" largo><textarea rows={2} value={dados.observacaoImpacto} onChange={event => atualizar("observacaoImpacto", event.target.value)} className={`${ESTILOS.areaTexto} min-h-20`} /></Campo>
                  </div>
                </Cartao>

                <Cartao icone={MapPinned} tom="amarelo" titulo="Onde a orientação vale" descricao="Regras podem mudar de cidade para cidade.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo rotulo="Abrangência"><select value={dados.abrangencia} onChange={event => atualizar("abrangencia", event.target.value)} className={ESTILOS.campo}><option value="orientacao_geral">Orientação geral</option><option value="logistica_reversa">Logística reversa</option><option value="confirmar_localmente">Confirmar regra local</option></select></Campo>
                    <Campo rotulo="Local e limites da orientação" largo><textarea maxLength={2000} rows={3} value={dados.notaAbrangencia} onChange={event => atualizar("notaAbrangencia", event.target.value)} className={ESTILOS.areaTexto} /></Campo>
                    <Campo rotulo="Categorias de pontos de coleta relacionadas" dica="Uma por linha. Use só quando a relação for direta." largo><textarea rows={2} value={dados.categoriasPontos.join("\n")} onChange={event => atualizar("categoriasPontos", event.target.value.split("\n"))} placeholder="Uma categoria por linha; use apenas quando a relação for direta" className={`${ESTILOS.areaTexto} min-h-20`} /></Campo>
                    <Campo rotulo="Destinos citados nas fontes" dica="Citar um destino não garante que um ponto cadastrado aceite o material. Confirme com o responsável local." largo><textarea rows={4} value={dados.rotasReferencia.join("\n")} onChange={event => atualizar("rotasReferencia", event.target.value.split("\n"))} placeholder="Um destino por linha; informe a cidade ou o responsável quando houver" className={ESTILOS.areaTexto} /></Campo>
                  </div>
                </Cartao>

                <Cartao icone={Link2} tom="roxo" titulo="Fontes de referência" descricao="É preciso ter ao menos uma fonte para publicar.">
                  <fieldset>
                    <legend className="sr-only">Fontes de referência</legend>
                    <div className="space-y-3">
                      {dados.fontesReferencia.map((fonte, indice) => (
                        <div key={indice} className="rounded-2xl border border-[#e1ebe2] bg-[#fafcf9] p-3 sm:p-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-sm font-black text-[#17362a]">Fonte {indice + 1}</p>
                            <button type="button" onClick={() => atualizar("fontesReferencia", dados.fontesReferencia.filter((_, fonteIndice) => fonteIndice !== indice))} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[#a8493e] transition hover:bg-[#fff5f3]"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remover fonte</button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input aria-label="Título da fonte" placeholder="Título ou órgão" value={fonte.titulo} onChange={event => atualizarFonte(indice, "titulo", event.target.value)} className={ESTILOS.campo} />
                            <input aria-label="URL da fonte" placeholder="https://…" value={fonte.url} onChange={event => atualizarFonte(indice, "url", event.target.value)} className={ESTILOS.campo} />
                            <textarea aria-label="O que esta fonte comprova" placeholder="O que esta fonte comprova" rows={2} value={fonte.comprova} onChange={event => atualizarFonte(indice, "comprova", event.target.value)} className={`${ESTILOS.areaTexto} min-h-20 sm:col-span-2`} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => atualizar("fontesReferencia", [...dados.fontesReferencia, { titulo: "", url: "", comprova: "" }])} className={`${ESTILOS.botaoSecundario} mt-3 w-full sm:w-auto`}><Plus className="h-4 w-4" aria-hidden="true" /> Adicionar fonte</button>
                  </fieldset>
                </Cartao>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#e1ebe2] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button type="button" onClick={() => setAberto(false)} className={ESTILOS.botaoSecundario}>Cancelar</button>
                <button type="submit" disabled={salvando} className={ESTILOS.botaoPrincipal}>{salvando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{salvando ? "Salvando…" : "Salvar rascunho"}</button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function Campo({ rotulo, dica, largo = false, children }: { rotulo: string; dica?: string; largo?: boolean; children: ReactNode }) {
  return (
    <label className={`block min-w-0 ${largo ? "sm:col-span-2" : ""}`}>
      <span className={ESTILOS.rotulo}>{rotulo}</span>
      {children}
      {dica ? <span className="mt-1.5 block text-xs leading-5 text-[#4b6657]">{dica}</span> : null}
    </label>
  );
}

function Destaque({ icone: Icone, tom, titulo, children }: { icone: LucideIcon; tom: TomPagina; titulo: string; children: ReactNode }) {
  const t = TONS[tom];
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-2xl border p-3 text-sm leading-6" style={{ backgroundColor: t.fundo, borderColor: t.borda, color: t.texto }}>
      <Icone className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 break-words"><strong className="font-black">{titulo}:</strong> {children}</div>
    </div>
  );
}
