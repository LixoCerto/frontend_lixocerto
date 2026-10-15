import { useEffect, useState } from "react";
import {
  Archive,
  Check,
  CircleCheck,
  CircleHelp,
  CircleX,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Tag,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  Abas,
  Aviso,
  BarraProgresso,
  CabecalhoPagina,
  Carregando,
  Cartao,
  ESTILOS,
  Estatistica,
  Etiqueta,
  EstadoVazio,
  TONS,
  type TomPagina,
} from "@/components/pagina/Pagina";
import {
  alterarStatusQuestao,
  atualizarQuestao,
  criarQuestao,
  enviarRespostaQuestionario,
  listarQuestoes,
  listarQuestoesGestao,
  type DadosQuestaoApi,
} from "@/lib/api";

type QuestaoPublica = Awaited<ReturnType<typeof listarQuestoes>>["questoes"][number];
type QuestaoGestao = Awaited<ReturnType<typeof listarQuestoesGestao>>["questoes"][number];
type AlternativaForm = { idAlternativa?: string; textoAlternativa: string; indicaCorreta: boolean };
type FormQuestao = { enunciado: string; explicacao: string; pontos: number; tema: string; alternativas: AlternativaForm[] };
type Feedback = { correta: boolean; pontos: number; explicacao: string };

const formularioVazio: FormQuestao = {
  enunciado: "",
  explicacao: "",
  pontos: 50,
  tema: "residuos",
  alternativas: [
    { textoAlternativa: "", indicaCorreta: true },
    { textoAlternativa: "", indicaCorreta: false },
    { textoAlternativa: "", indicaCorreta: false },
  ],
};

export default function QuestionariosCrud({ podeAdministrar, podeResponder }: { podeAdministrar: boolean; podeResponder: boolean }) {
  const [aba, setAba] = useState<"quiz" | "gestao">(podeAdministrar ? "gestao" : "quiz");
  const abaAtual = aba === "quiz" && !podeResponder ? "gestao" : aba === "gestao" && !podeAdministrar ? "quiz" : aba;
  const [questoesPublicas, setQuestoesPublicas] = useState<QuestaoPublica[]>([]);
  const [questoesGestao, setQuestoesGestao] = useState<QuestaoGestao[]>([]);
  const [respostas, setRespostas] = useState<Record<string, Feedback | undefined>>({});
  const [feedbackRecente, setFeedbackRecente] = useState<Feedback | null>(null);
  const [alternativaSelecionada, setAlternativaSelecionada] = useState<Record<string, string | undefined>>({});
  const [idRespondendo, setIdRespondendo] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [form, setForm] = useState<FormQuestao>(formularioVazio);
  const [idEdicao, setIdEdicao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!podeResponder) return;
    let ativo = true;
    const carregarQuiz = () => {
      void listarQuestoes(1, 100).then(resultado => {
        if (ativo) setQuestoesPublicas(resultado.questoes);
      }).catch(() => {
        if (ativo) setErro("Não foi possível carregar o quiz agora.");
      });
    };
    carregarQuiz();
    const intervalo = window.setInterval(carregarQuiz, 60_000);
    return () => { ativo = false; window.clearInterval(intervalo); };
  }, [podeResponder]);

  useEffect(() => {
    if (!podeAdministrar || abaAtual !== "gestao") return;
    let ativo = true;
    setCarregando(true);
    void listarQuestoesGestao(buscaAplicada, statusFiltro).then(resultado => {
      if (ativo) setQuestoesGestao(resultado.questoes);
    }).catch(() => {
      if (ativo) setErro("Não foi possível carregar as questões de gestão.");
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, [podeAdministrar, abaAtual, buscaAplicada, statusFiltro]);

  function iniciarEdicao(questao: QuestaoGestao) {
    if (questao.statusQuestao === "arquivada") return;
    setIdEdicao(questao.idQuestao);
    setForm({
      enunciado: questao.enunciadoQuestao,
      explicacao: questao.explicacaoQuestao,
      pontos: questao.quantidadePontos,
      tema: questao.temaQuestao,
      alternativas: questao.alternativas.map(alternativa => ({
        idAlternativa: alternativa.idAlternativa,
        textoAlternativa: alternativa.textoAlternativa,
        indicaCorreta: alternativa.indicaCorreta,
      })),
    });
    setAviso("");
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limparFormulario() {
    setIdEdicao("");
    setForm({ ...formularioVazio, alternativas: formularioVazio.alternativas.map(item => ({ ...item })) });
  }

  async function recarregarGestao() {
    const resultado = await listarQuestoesGestao(buscaAplicada, statusFiltro);
    setQuestoesGestao(resultado.questoes);
    if (podeResponder) {
      const publicadas = await listarQuestoes(1, 100);
      setQuestoesPublicas(publicadas.questoes);
    }
  }

  async function salvarQuestao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setSalvando(true);
    setErro("");
    setAviso("");
    const dados: DadosQuestaoApi = {
      enunciadoQuestao: form.enunciado,
      explicacaoQuestao: form.explicacao,
      quantidadePontos: Number(form.pontos),
      temaQuestao: form.tema,
      alternativas: form.alternativas.map((alternativa, indice) => ({ ...alternativa, ordemExibicao: indice + 1 })),
    };
    try {
      const resultado = idEdicao ? await atualizarQuestao(idEdicao, dados) : await criarQuestao(dados);
      if (!resultado.operacaoAceita) throw new Error(resultado.mensagemResultado || "Não foi possível salvar a questão.");
      setAviso(resultado.mensagemResultado);
      limparFormulario();
      await recarregarGestao();
    } catch (falha) {
      setErro(mensagemErro(falha, "Não foi possível salvar. Confira os campos e tente novamente."));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(id: string, status: string) {
    setErro("");
    setAviso("");
    try {
      const resultado = await alterarStatusQuestao(id, status);
      if (!resultado.operacaoAceita) throw new Error(resultado.mensagemResultado || "Não foi possível alterar o status.");
      setAviso(resultado.mensagemResultado);
      if (idEdicao === id) limparFormulario();
      await recarregarGestao();
    } catch (falha) {
      setErro(mensagemErro(falha, "Não foi possível alterar o status da questão."));
    }
  }

  async function responder(questao: QuestaoPublica, idAlternativa: string) {
    if (idRespondendo) return;
    setIdRespondendo(questao.idQuestao);
    setAlternativaSelecionada(atual => ({ ...atual, [questao.idQuestao]: idAlternativa }));
    setErro("");
    try {
      const resposta = await enviarRespostaQuestionario(questao.idQuestao, idAlternativa);
      const feedback = { correta: resposta.indicaCorreta, pontos: resposta.quantidadePontos, explicacao: resposta.explicacaoResposta };
      setRespostas(atual => ({ ...atual, [questao.idQuestao]: feedback }));
      setFeedbackRecente(feedback);
      setQuestoesPublicas(atual => atual.filter(item => item.idQuestao !== questao.idQuestao));
      setAviso(resposta.indicaCorreta ? `Resposta correta: +${resposta.quantidadePontos} pontos. Esta questão foi encerrada.` : "Resposta registrada. Esta questão foi encerrada e não pode ser respondida novamente.");
    } catch {
      setErro("Não foi possível registrar sua resposta. Tente novamente.");
      setAlternativaSelecionada(atual => ({ ...atual, [questao.idQuestao]: undefined }));
    } finally {
      setIdRespondendo("");
    }
  }

  if (!podeAdministrar && !podeResponder) return null;

  const respondidasAgora = Object.values(respostas).filter((item): item is Feedback => Boolean(item));
  const acertosAgora = respondidasAgora.filter(item => item.correta).length;
  const pontosAgora = respondidasAgora.reduce((total, item) => total + (item.correta ? item.pontos : 0), 0);
  const totalRodada = respondidasAgora.length + questoesPublicas.length;
  const abas = [
    ...(podeResponder ? [{ id: "quiz" as const, rotulo: "Jogar quiz", icone: Sparkles, contador: questoesPublicas.length }] : []),
    ...(podeAdministrar ? [{ id: "gestao" as const, rotulo: "Gerenciar perguntas", icone: ListChecks }] : []),
  ];

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        icone={CircleHelp}
        tom="amarelo"
        titulo="Quiz e questionários"
        descricao="Teste o que você sabe sobre descarte certo. As perguntas chegam aos poucos, cada uma vale pontos e só pode ser respondida uma vez."
      >
        {podeResponder ? (
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Estatistica icone={CircleHelp} tom="amarelo" valor={questoesPublicas.length} rotulo="Perguntas para responder" />
            <Estatistica icone={CircleCheck} tom="verde" valor={acertosAgora} rotulo="Acertos nesta visita" />
            <Estatistica icone={Star} tom="roxo" valor={`+${pontosAgora}`} rotulo="Pontos nesta visita" />
          </div>
        ) : null}
      </CabecalhoPagina>

      {abas.length > 1 ? <Abas rotulo="Seções do quiz" abas={abas} ativa={abaAtual} onChange={setAba} /> : null}

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {aviso ? <Aviso tipo="sucesso">{aviso}</Aviso> : null}

      {abaAtual === "quiz" && feedbackRecente ? <ResultadoResposta feedback={feedbackRecente} destaque /> : null}

      {abaAtual === "quiz" ? (
        <section className="space-y-4" aria-label="Perguntas do quiz">
          {totalRodada > 0 && respondidasAgora.length > 0 ? (
            <div className="rounded-[20px] border border-[#e1ebe2] bg-white px-4 py-3.5 sm:px-5">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-[#2c4a3c]">Seu progresso</span>
                <span className="font-black tabular-nums text-[#8a5d06]">{respondidasAgora.length} de {totalRodada}</span>
              </div>
              <BarraProgresso percentual={(respondidasAgora.length / totalRodada) * 100} tom="amarelo" rotulo="Perguntas respondidas nesta visita" />
            </div>
          ) : null}

          {questoesPublicas.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {questoesPublicas.map((questao, posicao) => (
                <CartaoPergunta
                  key={questao.idQuestao}
                  questao={questao}
                  numero={posicao + 1}
                  feedback={respostas[questao.idQuestao]}
                  idSelecionada={alternativaSelecionada[questao.idQuestao]}
                  bloqueado={Boolean(idRespondendo)}
                  enviando={idRespondendo === questao.idQuestao}
                  onResponder={idAlternativa => void responder(questao, idAlternativa)}
                />
              ))}
            </div>
          ) : (
            <EstadoVazio
              icone={Sparkles}
              tom="amarelo"
              titulo="Nenhuma pergunta no momento"
              descricao="Novas perguntas aparecem de tempos em tempos. Volte mais tarde para testar seus conhecimentos e ganhar pontos."
            />
          )}
        </section>
      ) : (
        <section className="space-y-4" aria-label="Gerenciar perguntas">
          <Aviso tipo="info">Área de gestão: aqui você cria, edita e publica as perguntas que aparecem no quiz.</Aviso>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,.85fr)_minmax(0,1.15fr)]">
            <Cartao
              icone={idEdicao ? Pencil : Plus}
              tom="amarelo"
              titulo={idEdicao ? "Editar pergunta" : "Criar pergunta"}
              descricao={idEdicao ? "Ao salvar, a pergunta volta para rascunho." : "Ela fica como rascunho até você publicar."}
              acoes={idEdicao ? <button type="button" className={ESTILOS.botaoSecundario} onClick={limparFormulario}><X className="h-4 w-4" aria-hidden="true" />Cancelar</button> : undefined}
            >
              <form onSubmit={salvarQuestao} className="space-y-4">
                <label className="block">
                  <span className={ESTILOS.rotulo}>Pergunta</span>
                  <textarea required maxLength={4000} className={`${ESTILOS.areaTexto} resize-y`} value={form.enunciado} onChange={evento => setForm(atual => ({ ...atual, enunciado: evento.target.value }))} placeholder="Escreva uma pergunta clara e objetiva" />
                </label>
                <label className="block">
                  <span className={ESTILOS.rotulo}>Explicação da resposta certa</span>
                  <textarea required maxLength={8000} className={`${ESTILOS.areaTexto} min-h-24 resize-y`} value={form.explicacao} onChange={evento => setForm(atual => ({ ...atual, explicacao: evento.target.value }))} placeholder="Explique a orientação e o contexto" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={ESTILOS.rotulo}>Tema</span>
                    <input required maxLength={80} className={ESTILOS.campo} value={form.tema} onChange={evento => setForm(atual => ({ ...atual, tema: evento.target.value }))} placeholder="reciclagem, compostagem…" />
                  </label>
                  <label className="block">
                    <span className={ESTILOS.rotulo}>Pontos (máximo)</span>
                    <input required type="number" min={10} max={50} className={ESTILOS.campo} value={form.pontos} onChange={evento => setForm(atual => ({ ...atual, pontos: Number(evento.target.value) }))} />
                  </label>
                </div>
                <p className="-mt-2 text-xs leading-5 text-[#6c8879]">Quem acertar ganha um valor sorteado entre 10 e este limite (no máximo 50).</p>

                <fieldset className="space-y-2.5 rounded-2xl border border-[#e1ebe2] bg-[#fafcf9] p-3.5 sm:p-4">
                  <legend className="px-1 text-sm font-black text-[#17362a]">Alternativas</legend>
                  <p className="text-xs leading-5 text-[#6c8879]">Marque exatamente uma como correta. A resposta certa não aparece para quem joga.</p>
                  {form.alternativas.map((alternativa, indice) => (
                    <div key={alternativa.idAlternativa ?? indice} className="flex flex-col gap-2 rounded-xl border border-[#e1ebe2] bg-white p-2.5 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <LetraAlternativa indice={indice} />
                        <input required maxLength={1000} className={ESTILOS.campo} value={alternativa.textoAlternativa} onChange={evento => setForm(atual => ({ ...atual, alternativas: atual.alternativas.map((item, pos) => pos === indice ? { ...item, textoAlternativa: evento.target.value } : item) }))} placeholder={`Alternativa ${String.fromCharCode(65 + indice)}`} />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <label title="Marcar como correta" className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#d6e2d9] px-3 text-sm font-bold text-[#5f7a6b] transition hover:bg-[#f5faf4] has-[:checked]:border-[#9fd0b0] has-[:checked]:bg-[#e6f5ec] has-[:checked]:text-[#1d6b43]">
                          <input type="radio" name="resposta-correta" className="h-4 w-4 accent-[#1d7953]" checked={alternativa.indicaCorreta} onChange={() => setForm(atual => ({ ...atual, alternativas: atual.alternativas.map((item, pos) => ({ ...item, indicaCorreta: pos === indice })) }))} /> Correta
                        </label>
                        {form.alternativas.length > 2 ? (
                          <button type="button" aria-label={`Remover alternativa ${indice + 1}`} className={`${ESTILOS.botaoIcone} text-[#a8493e] hover:bg-[#fff5f3] hover:text-[#a8493e]`} onClick={() => setForm(atual => { const alternativas = atual.alternativas.filter((_, pos) => pos !== indice); if (!alternativas.some(item => item.indicaCorreta)) alternativas[0] = { ...alternativas[0], indicaCorreta: true }; return { ...atual, alternativas }; })}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {form.alternativas.length < 6 ? (
                    <button type="button" className={`${ESTILOS.botaoSecundario} w-full sm:w-auto`} onClick={() => setForm(atual => ({ ...atual, alternativas: [...atual.alternativas, { textoAlternativa: "", indicaCorreta: false }] }))}>
                      <Plus className="h-4 w-4" aria-hidden="true" />Adicionar alternativa
                    </button>
                  ) : null}
                </fieldset>

                <button type="submit" disabled={salvando} className={`${ESTILOS.botaoPrincipal} h-12 w-full`}>
                  {salvando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  {salvando ? "Salvando..." : idEdicao ? "Salvar e voltar para rascunho" : "Salvar como rascunho"}
                </button>
                <p className="text-xs leading-5 text-[#6c8879]">Perguntas já publicadas ou respondidas ficam guardadas: editar cria uma nova versão em rascunho, e excluir significa arquivar para manter o histórico.</p>
              </form>
            </Cartao>

            <div className="space-y-4">
              <div className="flex flex-col gap-2.5 rounded-[24px] border border-[#e1ebe2] bg-white p-4 sm:flex-row">
                <input className={ESTILOS.campo} aria-label="Buscar pergunta" value={busca} onChange={evento => setBusca(evento.target.value)} onKeyDown={evento => { if (evento.key === "Enter") { evento.preventDefault(); setBuscaAplicada(busca); } }} placeholder="Buscar pela pergunta" />
                <button type="button" className={`${ESTILOS.botaoSecundario} h-12 shrink-0`} onClick={() => setBuscaAplicada(busca)}><Search className="h-4 w-4" aria-hidden="true" />Buscar</button>
                <select className={`${ESTILOS.campo} sm:max-w-44`} aria-label="Filtrar por situação" value={statusFiltro} onChange={evento => setStatusFiltro(evento.target.value)}>
                  <option value="todos">Todos os status</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="publicada">Publicada</option>
                  <option value="arquivada">Arquivada</option>
                </select>
              </div>
              {carregando ? <Carregando texto="Carregando perguntas…" /> : null}
              {!carregando && !questoesGestao.length ? (
                <EstadoVazio icone={ListChecks} tom="amarelo" titulo="Nenhuma pergunta por aqui" descricao="Nada encontrado neste filtro. Crie uma pergunta para começar o quiz." />
              ) : null}
              {questoesGestao.map(questao => (
                <article key={questao.idQuestao} className="rounded-[24px] border border-[#e1ebe2] bg-white p-5 transition hover:border-[#cfe0d3] hover:shadow-[0_18px_36px_-28px_rgba(23,54,42,.45)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <EtiquetaStatusQuestao status={questao.statusQuestao} />
                    <Etiqueta tom="verde" icone={Tag}>{questao.temaQuestao.replaceAll("_", " ")}</Etiqueta>
                    <Etiqueta tom="amarelo" icone={Star}>Até {questao.quantidadePontos} pontos</Etiqueta>
                  </div>
                  <h3 className="mt-3 text-base font-black leading-6 text-[#17362a]">{questao.enunciadoQuestao}</h3>
                  <p className="mt-2 rounded-xl bg-[#f7faf6] px-3.5 py-2.5 text-sm leading-6 text-[#5c7768]">{questao.explicacaoQuestao}</p>
                  <ul className="mt-3 space-y-1.5">
                    {questao.alternativas.map((alternativa, indice) => (
                      <li key={alternativa.idAlternativa} className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm ${alternativa.indicaCorreta ? "bg-[#e6f5ec] font-bold text-[#1d6b43]" : "bg-[#f7f9f6] text-[#5b7463]"}`}>
                        <span className="mt-0.5 text-xs font-black">{String.fromCharCode(65 + indice)}</span>
                        <span className="min-w-0 flex-1 break-words">{alternativa.textoAlternativa}</span>
                        {alternativa.indicaCorreta ? <span className="inline-flex shrink-0 items-center gap-1 text-xs"><Check className="h-3.5 w-3.5" aria-hidden="true" />Correta</span> : null}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eef3ef] pt-4">
                    {questao.statusQuestao !== "arquivada" ? <button type="button" className={ESTILOS.botaoSecundario} onClick={() => iniciarEdicao(questao)}><Pencil className="h-4 w-4" aria-hidden="true" />Editar</button> : null}
                    {questao.statusQuestao === "rascunho" ? <button type="button" className={ESTILOS.botaoPrincipal} onClick={() => void mudarStatus(questao.idQuestao, "publicada")}><Send className="h-4 w-4" aria-hidden="true" />Publicar</button> : null}
                    {questao.statusQuestao === "publicada" ? <button type="button" className={ESTILOS.botaoSecundario} onClick={() => void mudarStatus(questao.idQuestao, "rascunho")}><RotateCcw className="h-4 w-4" aria-hidden="true" />Voltar a rascunho</button> : null}
                    {questao.statusQuestao === "arquivada" ? (
                      <button type="button" className={ESTILOS.botaoSecundario} onClick={() => void mudarStatus(questao.idQuestao, "rascunho")}><RotateCcw className="h-4 w-4" aria-hidden="true" />Restaurar como rascunho</button>
                    ) : (
                      <button type="button" className={ESTILOS.botaoPerigo} onClick={() => void mudarStatus(questao.idQuestao, "arquivada")}><Archive className="h-4 w-4" aria-hidden="true" />Arquivar</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const TONS_LETRAS: TomPagina[] = ["verde", "azul", "amarelo", "vermelho", "roxo", "marrom"];

function LetraAlternativa({ indice, ativa = false }: { indice: number; ativa?: boolean }) {
  const tom = TONS[TONS_LETRAS[indice % TONS_LETRAS.length]];
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-black transition"
      style={ativa ? { backgroundColor: tom.cor, color: "#fff" } : { backgroundColor: tom.fundo, color: tom.texto }}
      aria-hidden="true"
    >
      {String.fromCharCode(65 + indice)}
    </span>
  );
}

function EtiquetaStatusQuestao({ status }: { status: string }) {
  if (status === "publicada") return <Etiqueta tom="verde" icone={CircleCheck}>Publicada</Etiqueta>;
  if (status === "arquivada") return <Etiqueta tom="cinza" icone={Archive}>Arquivada</Etiqueta>;
  if (status === "rascunho") return <Etiqueta tom="amarelo" icone={Pencil}>Rascunho</Etiqueta>;
  return <Etiqueta tom="cinza">{status}</Etiqueta>;
}

function ResultadoResposta({ feedback, destaque = false }: { feedback: Feedback; destaque?: boolean }) {
  const acertou = feedback.correta;
  const Icone = acertou ? CircleCheck : CircleX;
  return (
    <div
      className={`flex items-start gap-3.5 rounded-[22px] border ${destaque ? "p-5" : "mt-4 p-4"} ${acertou ? "border-[#cfe8d8] bg-[#eef9f1] text-[#1d6b43]" : "border-[#f3e2b4] bg-[#fff9e9] text-[#7f5a0b]"}`}
      role="status"
      aria-live="polite"
    >
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${acertou ? "bg-[#2f9a5f]" : "bg-[#c98a12]"}`}>
        <Icone className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <strong className="block text-lg font-black leading-tight">
          {acertou ? `Mandou bem! +${feedback.pontos} pontos` : "Não foi dessa vez"}
        </strong>
        {!acertou ? <p className="mt-0.5 text-sm font-semibold">Sua resposta foi registrada. Cada pergunta vale uma tentativa.</p> : null}
        {feedback.explicacao ? (
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-[#3f5c4c]">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#c98a12]" aria-hidden="true" />
            <span>{feedback.explicacao}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface CartaoPerguntaProps {
  questao: QuestaoPublica;
  numero: number;
  feedback: Feedback | undefined;
  idSelecionada: string | undefined;
  bloqueado: boolean;
  enviando: boolean;
  onResponder: (idAlternativa: string) => void;
}

function CartaoPergunta({ questao, numero, feedback, idSelecionada, bloqueado, enviando, onResponder }: CartaoPerguntaProps) {
  return (
    <article className="flex flex-col rounded-[24px] border border-[#e1ebe2] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-30px_rgba(23,54,42,.55)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[#17362a] px-2.5 py-1 text-xs font-black text-white">Pergunta {numero}</span>
        <Etiqueta tom="verde" icone={Tag}>{questao.temaQuestao.replaceAll("_", " ")}</Etiqueta>
        <Etiqueta tom="amarelo" icone={Star}>Vale até {questao.quantidadePontos} pontos</Etiqueta>
      </div>
      <h3 className="mt-4 text-lg font-black leading-7 text-[#17362a] sm:text-xl">{questao.enunciadoQuestao}</h3>
      <div className="mt-4 grid gap-2.5">
        {questao.alternativas.map((alternativa, indice) => {
          const selecionada = idSelecionada === alternativa.idAlternativa;
          return (
            <button
              key={alternativa.idAlternativa}
              type="button"
              disabled={Boolean(feedback) || bloqueado}
              onClick={() => onResponder(alternativa.idAlternativa)}
              className={`group flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left text-[15px] font-bold transition enabled:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d7953] disabled:cursor-default ${selecionada ? "border-[#2f9a5f] bg-[#eef9f1] text-[#1d6b43]" : "border-[#e1ebe2] bg-white text-[#2c4a3c] enabled:hover:border-[#9fd0b0] enabled:hover:bg-[#f7fcf8] disabled:opacity-70"}`}
            >
              <LetraAlternativa indice={indice} ativa={selecionada} />
              <span className="min-w-0 flex-1 break-words">{alternativa.textoAlternativa}</span>
              {selecionada && enviando ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      {feedback ? (
        <ResultadoResposta feedback={feedback} />
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#6c8879]">
          <Target className="h-4 w-4 shrink-0 text-[#c98a12]" aria-hidden="true" />
          {enviando ? "Conferindo sua resposta..." : "Toque na alternativa que você acha certa."}
        </p>
      )}
    </article>
  );
}

function mensagemErro(falha: unknown, padrao: string) {
  return falha instanceof Error && falha.message ? falha.message : padrao;
}
