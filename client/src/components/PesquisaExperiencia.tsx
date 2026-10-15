import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, ChartColumn, ChartNoAxesCombined, Check, CheckCircle2, LoaderCircle, Lock, MessageSquare, Send, ShieldCheck, Users } from "lucide-react";
import { Aviso, BarraProgresso, CabecalhoPagina, Carregando, Cartao, ESTILOS } from "@/components/pagina/Pagina";
import { enviarAvaliacaoSus, obterResultadosAgregados } from "@/lib/api";

const PERGUNTAS_USABILIDADE = [
  "Acho que gostaria de usar este sistema com frequência.",
  "Considerei o sistema desnecessariamente complexo.",
  "Achei o sistema fácil de usar.",
  "Acho que precisaria de ajuda de uma pessoa técnica para usar o sistema.",
  "Considerei que as várias funções do sistema estão bem integradas.",
  "Achei que há muita inconsistência no sistema.",
  "Imagino que a maioria das pessoas aprenderia a usar o sistema rapidamente.",
  "Achei o sistema muito complicado de usar.",
  "Senti-me confiante ao usar o sistema.",
  "Precisei aprender muitas coisas antes de conseguir usar o sistema.",
];

const inputClass = "w-full rounded-xl border border-[#dce8de] bg-white px-3.5 py-3 text-sm text-[#17362a] outline-none transition focus:border-[#5a9a70] focus:ring-2 focus:ring-[#5a9a70]/15";
type Resultados = Awaited<ReturnType<typeof obterResultadosAgregados>>;

function IndicadorPesquisa({ titulo, valor, icone: Icone, detalhe, percentual }: { titulo: string; valor: string; icone: typeof Users; detalhe: string; percentual?: number }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#dcd7f2] bg-[#faf9fe] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#5c7768]">{titulo}</p>
          <strong className="mt-1 block text-[1.75rem] font-black leading-tight tabular-nums text-[#17362a]">{valor}</strong>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efedfa] text-[#6b5bb5]"><Icone className="h-5 w-5" aria-hidden="true" /></span>
      </div>
      {typeof percentual === "number" ? <div className="mt-3"><BarraProgresso percentual={percentual} tom="roxo" rotulo={titulo} /></div> : null}
      <p className="mt-3 text-xs font-semibold text-[#6c8879]">{detalhe}</p>
    </article>
  );
}

export default function PesquisaExperiencia({ podeEnviar, podeConsultar }: { podeEnviar: boolean; podeConsultar: boolean }) {
  const [notas, setNotas] = useState<number[]>(Array(10).fill(0));
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultados | null>(null);
  const [carregandoResultados, setCarregandoResultados] = useState(false);

  useEffect(() => {
    if (!podeConsultar) {
      setResultados(null);
      return;
    }
    let ativo = true;
    setCarregandoResultados(true);
    void obterResultadosAgregados().then(resposta => {
      if (ativo) setResultados(resposta);
    }).catch(() => {
      if (ativo) setErro("Não foi possível carregar os resultados agregados agora.");
    }).finally(() => {
      if (ativo) setCarregandoResultados(false);
    });
    return () => { ativo = false; };
  }, [podeConsultar]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    if (!podeEnviar) return;
    if (!consentimento) {
      setErro("É necessário ler e aceitar o consentimento para participar.");
      return;
    }
    if (notas.some(nota => nota < 1 || nota > 5)) {
      setErro("Responda às dez afirmações antes de enviar.");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await enviarAvaliacaoSus(notas);
      if (!resposta.avaliacaoAceita) throw new Error(resposta.mensagemResultado || "A avaliação não foi aceita.");
      setMensagem(`Avaliação registrada. Sua pontuação de usabilidade foi ${resposta.pontuacaoSus}/100. Obrigado pela contribuição.`);
      setNotas(Array(10).fill(0));
      setConsentimento(false);
      if (podeConsultar) setResultados(await obterResultadosAgregados());
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : "Não foi possível enviar a avaliação agora.");
    } finally {
      setEnviando(false);
    }
  }

  if (!podeEnviar && !podeConsultar) return null;

  const respondidas = notas.filter(nota => nota >= 1 && nota <= 5).length;
  const total = PERGUNTAS_USABILIDADE.length;
  const faltam = total - respondidas;

  return (
    <div className="space-y-5 sm:space-y-6">
      <CabecalhoPagina
        icone={ChartNoAxesCombined}
        tom="roxo"
        titulo="Pesquisa de usabilidade"
        descricao="Conte como foi usar a plataforma respondendo a 10 frases rápidas. É voluntário, faz parte da avaliação acadêmica do projeto e ninguém vê suas respostas individuais."
      >
        {podeEnviar ? (
          <div className="rounded-2xl border border-[#dcd7f2] bg-white/80 p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-[#2c4a3c]">Seu progresso</span>
              <span className="font-black tabular-nums text-[#4f4291]">{respondidas} de {total} respondidas</span>
            </div>
            <BarraProgresso percentual={(respondidas / total) * 100} tom="roxo" rotulo="Afirmações respondidas" />
          </div>
        ) : null}
      </CabecalhoPagina>

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}
      {mensagem ? <Aviso tipo="sucesso">{mensagem}</Aviso> : null}

      {podeEnviar ? (
        <form onSubmit={event => void enviar(event)} className="space-y-5">
          <Cartao icone={MessageSquare} tom="roxo" titulo="Sua experiência" descricao="Para cada frase, toque em um número de 1 (discordo totalmente) a 5 (concordo totalmente).">
            <div className="space-y-3">
              {PERGUNTAS_USABILIDADE.map((pergunta, indice) => {
                const respondida = notas[indice] >= 1;
                return (
                  <fieldset key={pergunta} className={`min-w-0 rounded-2xl border p-4 transition sm:p-5 ${respondida ? "border-[#dcd7f2] bg-[#faf9fe]" : "border-[#e8eee8] bg-white"}`}>
                    <legend className="sr-only">{indice + 1}. {pergunta}</legend>
                    <div className="flex items-start gap-3" aria-hidden="true">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${respondida ? "bg-[#6b5bb5] text-white" : "bg-[#efedfa] text-[#4f4291]"}`}>
                        {respondida ? <Check className="h-4 w-4" /> : indice + 1}
                      </span>
                      <p className="pt-1 text-[15px] font-bold leading-6 text-[#17362a]">{pergunta}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map(valor => (
                        <label key={valor} className="relative block cursor-pointer">
                          <input
                            type="radio"
                            name={`usabilidade-item-${indice + 1}`}
                            value={valor}
                            checked={notas[indice] === valor}
                            onChange={() => setNotas(atual => atual.map((nota, posicao) => posicao === indice ? valor : nota))}
                            className="peer sr-only"
                          />
                          <span className="grid h-12 place-items-center rounded-xl border-2 border-[#dfe8e1] bg-white text-lg font-black text-[#3f5c4c] transition hover:border-[#b8aee6] hover:bg-[#f6f4fd] peer-checked:border-[#6b5bb5] peer-checked:bg-[#6b5bb5] peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-[#6b5bb5]/30 sm:h-14">
                            {valor}
                          </span>
                          <span className="sr-only"> de 5{valor === 1 ? " (discordo totalmente)" : valor === 5 ? " (concordo totalmente)" : ""}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between gap-3 text-xs font-semibold text-[#6c8879]" aria-hidden="true">
                      <span>Discordo totalmente</span>
                      <span className="text-right">Concordo totalmente</span>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </Cartao>

          <Cartao icone={ShieldCheck} tom="verde" titulo="Antes de enviar">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dce8de] bg-[#f7faf6] p-4 text-sm leading-6 text-[#46604f] transition hover:border-[#afd2b3]">
              <input type="checkbox" checked={consentimento} onChange={event => setConsentimento(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1d7953]" />
              <span>Li as informações e aceito participar voluntariamente. A conta autenticada é usada apenas para pseudonimizar e limitar a identificação; o código bruto não é armazenado junto às respostas, e os resultados de pesquisa são apresentados de forma agregada.</span>
            </label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#6c8879]">{faltam > 0 ? `Falta${faltam > 1 ? "m" : ""} ${faltam} ${faltam > 1 ? "frases" : "frase"} para responder.` : "Tudo respondido! Agora é só enviar."}</p>
              <button type="submit" disabled={enviando} className={`${ESTILOS.botaoPrincipal} h-12 w-full disabled:cursor-wait sm:w-auto`}>
                {enviando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {enviando ? "Enviando avaliação…" : "Enviar avaliação"}
              </button>
            </div>
          </Cartao>
        </form>
      ) : null}

      {podeConsultar ? (
        <Cartao icone={ChartColumn} tom="roxo" titulo="Resultados gerais" descricao="Você vê apenas números gerais. Nenhuma resposta individual ou identificação aparece aqui.">
          {carregandoResultados && !resultados ? <Carregando texto="Carregando resultados…" /> : null}
          {resultados ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <IndicadorPesquisa titulo="Pontuação média" valor={`${resultados.mediaPontuacaoSus.toFixed(1)}/100`} detalhe="Média das avaliações válidas" icone={BarChart3} percentual={resultados.mediaPontuacaoSus} />
              <IndicadorPesquisa titulo="Pontuação do meio (mediana)" valor={`${resultados.medianaPontuacaoSus.toFixed(1)}/100`} detalhe="Valor central das avaliações" icone={CheckCircle2} percentual={resultados.medianaPontuacaoSus} />
              <IndicadorPesquisa titulo="Participantes" valor={resultados.quantidadeParticipantes.toLocaleString("pt-BR")} detalhe="Avaliações consentidas registradas" icone={Users} />
            </div>
          ) : null}
        </Cartao>
      ) : null}

      <aside className="flex items-start gap-4 rounded-[24px] bg-[#17362a] p-5 text-white sm:p-6">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#9fe0b8]"><Lock className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 className="text-lg font-black">Sua privacidade vem primeiro</h3>
          <p className="mt-1 text-sm leading-6 text-[#bdd2c3]">O servidor confere quem pode acessar cada coisa. Seu identificador vem da sessão e é pseudonimizado antes de ser salvo, e só perfis autorizados veem os números gerais.</p>
        </div>
      </aside>
    </div>
  );
}
