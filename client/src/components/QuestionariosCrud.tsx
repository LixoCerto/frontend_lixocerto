import { useEffect, useState } from "react";
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

const inputClass = "w-full rounded-xl border border-[#dce8de] bg-white px-3.5 py-3 text-sm text-[#17362a] outline-none transition placeholder:text-[#9aac9f] focus:border-[#5a9a70] focus:ring-2 focus:ring-[#5a9a70]/15";
const buttonPrimary = "rounded-xl bg-[#1d7953] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#176342] disabled:cursor-wait disabled:opacity-60";
const buttonSecondary = "rounded-xl border border-[#dce8de] bg-white px-3 py-2 text-xs font-bold text-[#386348] transition hover:bg-[#f4f8f3] disabled:opacity-50";

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[24px] bg-[#17362a] p-6 text-white sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c7e5bf]">Banco de aprendizagem</p>
          <h2 className="mt-2 text-2xl font-black">Quiz ambiental</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d1e0d5]">Receba uma questão por vez em horários aleatórios, com tema e pontuação sorteados. Cada questão aceita uma única resposta.</p>
        </div>
        {podeAdministrar || podeResponder ? (
          <div className="flex rounded-xl bg-white/10 p-1">
            {podeResponder ? <button type="button" onClick={() => setAba("quiz")} className={`rounded-lg px-3 py-2 text-xs font-black ${abaAtual === "quiz" ? "bg-white text-[#1d4934]" : "text-white"}`}>Responder quiz</button> : null}
            {podeAdministrar ? <button type="button" onClick={() => setAba("gestao")} className={`rounded-lg px-3 py-2 text-xs font-black ${abaAtual === "gestao" ? "bg-white text-[#1d4934]" : "text-white"}`}>Gerenciar questões</button> : null}
          </div>
        ) : null}
      </header>

      {erro ? <p role="alert" className="rounded-xl border border-[#f1c9c0] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">{erro}</p> : null}
      {aviso ? <p role="status" className="rounded-xl border border-[#cde5cf] bg-[#eff8ee] px-4 py-3 text-sm font-semibold text-[#28764e]">{aviso}</p> : null}
      {abaAtual === "quiz" && feedbackRecente ? <div className={`rounded-2xl px-5 py-4 ${feedbackRecente.correta ? "bg-[#e6f5e7] text-[#1e7048]" : "bg-[#fff2d9] text-[#865913]"}`}><strong className="text-sm">{feedbackRecente.correta ? `Acertou · +${feedbackRecente.pontos} pontos` : "Resposta registrada · nenhuma nova tentativa"}</strong><p className="mt-1 text-sm leading-5">{feedbackRecente.explicacao}</p></div> : null}

      {abaAtual === "quiz" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {questoesPublicas.map(questao => {
            const feedback = respostas[questao.idQuestao];
            return (
              <article key={questao.idQuestao} className="rounded-[22px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)]">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#edf5e9] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#3e8257]">{questao.temaQuestao.replaceAll("_", " ")}</span><span className="text-xs font-bold text-[#809789]">Até {questao.quantidadePontos} pontos</span></div>
                <h3 className="mt-4 text-lg font-black leading-7 text-[#17362a]">{questao.enunciadoQuestao}</h3>
                <div className="mt-4 grid gap-2.5">
                  {questao.alternativas.map((alternativa, indice) => {
                    const selecionada = alternativaSelecionada[questao.idQuestao] === alternativa.idAlternativa;
                    return <button key={alternativa.idAlternativa} type="button" disabled={Boolean(feedback) || Boolean(idRespondendo)} onClick={() => void responder(questao, alternativa.idAlternativa)} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition disabled:cursor-default ${selecionada ? "border-[#52a36b] bg-[#eaf5e7] text-[#1d6f48]" : "border-[#dfe9e0] text-[#345b43] hover:border-[#9ac4a5] hover:bg-[#f7fbf6]"}`}><span>{alternativa.textoAlternativa}</span><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs">{String.fromCharCode(65 + indice)}</span></button>;
                  })}
                </div>
                {feedback ? <div className={`mt-4 rounded-xl p-4 ${feedback.correta ? "bg-[#e6f5e7] text-[#1e7048]" : "bg-[#fff2d9] text-[#865913]"}`}><strong className="text-sm">{feedback.correta ? `Resposta correta · +${feedback.pontos} pontos` : "Continue aprendendo"}</strong><p className="mt-1 text-sm leading-5">{feedback.explicacao}</p></div> : <p className="mt-4 text-xs font-semibold text-[#84998c]">Escolha uma alternativa para receber o feedback.</p>}
              </article>
            );
          })}
          {!questoesPublicas.length ? <div className="rounded-2xl border border-dashed border-[#d9e6dc] bg-white p-8 text-center text-sm font-semibold text-[#718b7a] lg:col-span-2">Ainda não há questões publicadas. Volte mais tarde para testar seus conhecimentos.</div> : null}
        </section>
      ) : (
        <section className="grid items-start gap-5 xl:grid-cols-[minmax(320px,.85fr)_minmax(0,1.15fr)]">
          <form onSubmit={salvarQuestao} className="space-y-4 rounded-[22px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.6)]">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.13em] text-[#62806c]">{idEdicao ? "Edição" : "Novo conteúdo"}</p><h3 className="mt-1 text-lg font-black">{idEdicao ? "Editar questão" : "Criar questão"}</h3></div>{idEdicao ? <button type="button" className={buttonSecondary} onClick={limparFormulario}>Cancelar</button> : null}</div>
            <label className="block text-xs font-bold text-[#587261]">Enunciado<textarea required maxLength={4000} className={`${inputClass} mt-1.5 min-h-24 resize-y`} value={form.enunciado} onChange={evento => setForm(atual => ({ ...atual, enunciado: evento.target.value }))} placeholder="Escreva uma pergunta clara e objetiva" /></label>
            <label className="block text-xs font-bold text-[#587261]">Explicação da resposta correta<textarea required maxLength={8000} className={`${inputClass} mt-1.5 min-h-20 resize-y`} value={form.explicacao} onChange={evento => setForm(atual => ({ ...atual, explicacao: evento.target.value }))} placeholder="Explique a orientação e o contexto" /></label>
            <label className="block text-xs font-bold text-[#587261]">Tema<input required maxLength={80} className={`${inputClass} mt-1.5`} value={form.tema} onChange={evento => setForm(atual => ({ ...atual, tema: evento.target.value }))} placeholder="reciclagem, compostagem…" /></label>
            <label className="block text-xs font-bold text-[#587261]">Limite máximo dos pontos sorteados<input required type="number" min={10} max={50} className={`${inputClass} mt-1.5`} value={form.pontos} onChange={evento => setForm(atual => ({ ...atual, pontos: Number(evento.target.value) }))} /><span className="mt-1 block font-normal text-[#82978a]">O valor recebido é sorteado de 10 até este limite, no máximo 50.</span></label>
            <div className="space-y-2.5"><div><p className="text-xs font-bold text-[#587261]">Alternativas</p><p className="mt-1 text-[11px] text-[#82978a]">Selecione exatamente uma resposta correta. O gabarito fica oculto no quiz público.</p></div>
              {form.alternativas.map((alternativa, indice) => <div key={alternativa.idAlternativa ?? indice} className="flex items-center gap-2"><input required maxLength={1000} className={inputClass} value={alternativa.textoAlternativa} onChange={evento => setForm(atual => ({ ...atual, alternativas: atual.alternativas.map((item, pos) => pos === indice ? { ...item, textoAlternativa: evento.target.value } : item) }))} placeholder={`Alternativa ${String.fromCharCode(65 + indice)}`} /><label title="Marcar como correta" className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#3f7552]"><input type="radio" name="resposta-correta" checked={alternativa.indicaCorreta} onChange={() => setForm(atual => ({ ...atual, alternativas: atual.alternativas.map((item, pos) => ({ ...item, indicaCorreta: pos === indice })) }))} /> Correta</label>{form.alternativas.length > 2 ? <button type="button" aria-label={`Remover alternativa ${indice + 1}`} className="rounded-lg px-2 py-1 text-sm font-black text-[#a85040] hover:bg-[#fff4f0]" onClick={() => setForm(atual => { const alternativas = atual.alternativas.filter((_, pos) => pos !== indice); if (!alternativas.some(item => item.indicaCorreta)) alternativas[0] = { ...alternativas[0], indicaCorreta: true }; return { ...atual, alternativas }; })}>×</button> : null}</div>)}
              {form.alternativas.length < 6 ? <button type="button" className={buttonSecondary} onClick={() => setForm(atual => ({ ...atual, alternativas: [...atual.alternativas, { textoAlternativa: "", indicaCorreta: false }] }))}>+ Adicionar alternativa</button> : null}
            </div>
            <button type="submit" disabled={salvando} className={`${buttonPrimary} w-full`}>{salvando ? "Salvando..." : idEdicao ? "Salvar e voltar para rascunho" : "Salvar como rascunho"}</button>
            <p className="text-[11px] leading-5 text-[#82978a]">Questões com publicação ou respostas anteriores são preservadas; editar cria uma nova versão em rascunho. Excluir significa arquivar para manter o histórico.</p>
          </form>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#e1ebe2] bg-white p-4 sm:flex-row"><input className={inputClass} value={busca} onChange={evento => setBusca(evento.target.value)} onKeyDown={evento => { if (evento.key === "Enter") { evento.preventDefault(); setBuscaAplicada(busca); } }} placeholder="Buscar pelo enunciado" /><button type="button" className={buttonSecondary} onClick={() => setBuscaAplicada(busca)}>Buscar</button><select className={`${inputClass} sm:max-w-44`} value={statusFiltro} onChange={evento => setStatusFiltro(evento.target.value)}><option value="todos">Todos os status</option><option value="rascunho">Rascunho</option><option value="publicada">Publicada</option><option value="arquivada">Arquivada</option></select></div>
            {carregando ? <p className="rounded-xl bg-white p-5 text-sm font-semibold text-[#718b7a]">Carregando questões…</p> : null}
            {!carregando && !questoesGestao.length ? <div className="rounded-2xl border border-dashed border-[#d9e6dc] bg-white p-8 text-center text-sm font-semibold text-[#718b7a]">Nenhuma questão neste filtro. Crie uma questão para iniciar a base do quiz.</div> : null}
            {questoesGestao.map(questao => <article key={questao.idQuestao} className="rounded-[20px] border border-[#e1ebe2] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(23,54,42,.5)]">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${questao.statusQuestao === "publicada" ? "bg-[#e7f4e6] text-[#27764d]" : questao.statusQuestao === "arquivada" ? "bg-[#f0eeee] text-[#77716e]" : "bg-[#fff3d7] text-[#96630d]"}`}>{questao.statusQuestao}</span><span className="text-xs font-bold text-[#7b9283]">{questao.quantidadePontos} pontos</span></div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#edf5e9] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#3e8257]">{questao.temaQuestao.replaceAll("_", " ")}</span><span className="text-xs font-bold text-[#7b9283]">Limite {questao.quantidadePontos} pontos</span></div><h3 className="mt-3 font-black leading-6 text-[#17362a]">{questao.enunciadoQuestao}</h3><p className="mt-2 text-sm leading-5 text-[#647d6c]">{questao.explicacaoQuestao}</p>
              <ul className="mt-3 space-y-1.5">{questao.alternativas.map(alternativa => <li key={alternativa.idAlternativa} className={`rounded-lg px-3 py-2 text-xs ${alternativa.indicaCorreta ? "bg-[#eaf5e7] font-bold text-[#1d6f48]" : "bg-[#f7f9f6] text-[#5b7463]"}`}>{alternativa.indicaCorreta ? "Correta · " : ""}{alternativa.textoAlternativa}</li>)}</ul>
              <div className="mt-4 flex flex-wrap gap-2">{questao.statusQuestao !== "arquivada" ? <button type="button" className={buttonSecondary} onClick={() => iniciarEdicao(questao)}>Editar</button> : null}{questao.statusQuestao === "rascunho" ? <button type="button" className={buttonSecondary} onClick={() => void mudarStatus(questao.idQuestao, "publicada")}>Publicar</button> : null}{questao.statusQuestao === "publicada" ? <button type="button" className={buttonSecondary} onClick={() => void mudarStatus(questao.idQuestao, "rascunho")}>Voltar a rascunho</button> : null}{questao.statusQuestao === "arquivada" ? <button type="button" className={buttonSecondary} onClick={() => void mudarStatus(questao.idQuestao, "rascunho")}>Restaurar como rascunho</button> : <button type="button" className="rounded-xl border border-[#f1d4cd] px-3 py-2 text-xs font-bold text-[#a85040] hover:bg-[#fff4f0]" onClick={() => void mudarStatus(questao.idQuestao, "arquivada")}>Arquivar</button>}</div>
            </article>)}
          </div>
        </section>
      )}
    </div>
  );
}

function mensagemErro(falha: unknown, padrao: string) {
  return falha instanceof Error && falha.message ? falha.message : padrao;
}
