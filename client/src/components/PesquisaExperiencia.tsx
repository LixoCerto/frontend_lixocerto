import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, CheckCircle2, Users } from "lucide-react";
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

function IndicadorPesquisa({ titulo, valor, icone: Icone, detalhe }: { titulo: string; valor: string; icone: typeof Users; detalhe: string }) {
  return <article className="rounded-2xl border border-[#e1ebe2] bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#7c9386]">{titulo}</p><strong className="mt-2 block text-2xl font-black text-[#17362a]">{valor}</strong></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f5e7] text-[#23734d]"><Icone className="h-5 w-5" /></span></div><p className="mt-3 text-xs font-semibold text-[#6c8879]">{detalhe}</p></article>;
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

  return (
    <div className="space-y-6">
      <header><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#3d9664]">Pesquisa acadêmica</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#17362a] sm:text-3xl">Avaliação de usabilidade da plataforma</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#668073]">Este questionário padronizado avalia a facilidade de uso da plataforma por meio de dez afirmações. A participação é voluntária e faz parte da avaliação acadêmica do projeto. As respostas individuais não são exibidas aos pesquisadores.</p></header>

      {erro ? <p role="alert" className="rounded-xl border border-[#f1c9c0] bg-[#fff4f0] px-4 py-3 text-sm font-semibold text-[#a85040]">{erro}</p> : null}
      {mensagem ? <p role="status" className="rounded-xl border border-[#cde5cf] bg-[#eff8ee] px-4 py-3 text-sm font-semibold text-[#28764e]">{mensagem}</p> : null}

      {podeEnviar ? <form onSubmit={event => void enviar(event)} className="space-y-5 rounded-[22px] border border-[#e1ebe2] bg-white p-5 sm:p-6">
        <div><h3 className="text-lg font-black text-[#244637]">Sua experiência</h3><p className="mt-1 text-xs leading-5 text-[#71897b]">Para cada frase, selecione uma opção de 1 (discordo totalmente) a 5 (concordo totalmente).</p></div>
        <div className="space-y-3">{PERGUNTAS_USABILIDADE.map((pergunta, indice) => <fieldset key={pergunta} className="rounded-xl border border-[#e8eee8] p-4"><legend className="max-w-full px-1 text-sm font-bold leading-6 text-[#315c47]">{indice + 1}. {pergunta}</legend><div className="mt-2 flex flex-wrap gap-2 sm:gap-4">{[1, 2, 3, 4, 5].map(valor => <label key={valor} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#587261] hover:bg-[#f5faf4]"><input type="radio" name={`usabilidade-item-${indice + 1}`} value={valor} checked={notas[indice] === valor} onChange={() => setNotas(atual => atual.map((nota, posicao) => posicao === indice ? valor : nota))} className="accent-[#1d7953]" />{valor}<span className="sr-only"> de 5</span></label>)}</div></fieldset>)}</div>
        <label className="flex items-start gap-3 rounded-xl border border-[#dce8de] bg-[#f7faf6] p-4 text-xs leading-5 text-[#587261]"><input type="checkbox" checked={consentimento} onChange={event => setConsentimento(event.target.checked)} className="mt-0.5 accent-[#1d7953]" /><span>Li as informações e aceito participar voluntariamente. A conta autenticada é usada apenas para pseudonimizar e limitar a identificação; o código bruto não é armazenado junto às respostas, e os resultados de pesquisa são apresentados de forma agregada.</span></label>
        <button type="submit" disabled={enviando} className="rounded-xl bg-[#1d7953] px-5 py-3 text-sm font-black text-white transition hover:bg-[#176342] disabled:cursor-wait disabled:opacity-60">{enviando ? "Enviando avaliação…" : "Enviar avaliação"}</button>
      </form> : null}

      {podeConsultar ? <section className="space-y-4"><div><h3 className="text-lg font-black text-[#244637]">Resultados agregados</h3><p className="mt-1 text-xs leading-5 text-[#71897b]">Acesso somente a estatísticas gerais; nenhuma resposta individual ou identificador é exibido.</p></div>{carregandoResultados && !resultados ? <p className="rounded-xl bg-white p-5 text-sm font-semibold text-[#71897b]">Carregando resultados…</p> : null}{resultados ? <div className="grid gap-4 md:grid-cols-3"><IndicadorPesquisa titulo="Pontuação média de usabilidade" valor={`${resultados.mediaPontuacaoSus.toFixed(1)}/100`} detalhe="Média das avaliações válidas" icone={BarChart3} /><IndicadorPesquisa titulo="Mediana da pontuação" valor={`${resultados.medianaPontuacaoSus.toFixed(1)}/100`} detalhe="Valor central das avaliações" icone={CheckCircle2} /><IndicadorPesquisa titulo="Participantes" valor={resultados.quantidadeParticipantes.toLocaleString("pt-BR")} detalhe="Avaliações consentidas registradas" icone={Users} /></div> : null}</section> : null}

      <aside className="rounded-[20px] bg-[#17362a] p-5 text-white"><h3 className="font-black">Privacidade por padrão</h3><p className="mt-2 text-sm leading-6 text-[#bdd2c3]">A API valida a permissão no servidor. O identificador do participante é derivado da sessão autenticada e pseudonimizado antes da gravação; somente perfis autorizados recebem estatísticas agregadas.</p></aside>
    </div>
  );
}
