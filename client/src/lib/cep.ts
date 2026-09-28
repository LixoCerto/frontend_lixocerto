export interface DadosCep {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

type RespostaViaCep = Partial<DadosCep> & { erro?: boolean };

export function normalizarCep(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8);
}

export function formatarCep(valor: string): string {
  const digitos = normalizarCep(valor);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export function cepCompleto(valor: string): boolean {
  return normalizarCep(valor).length === 8;
}

export function montarEnderecoCep(dados: Pick<DadosCep, 'logradouro' | 'complemento' | 'bairro'>): string {
  return Array.from(new Set([dados.logradouro, dados.complemento, dados.bairro].map(valor => valor?.trim()).filter(Boolean))).join(', ');
}

export async function buscarCepViaCep(valor: string): Promise<DadosCep | null> {
  const cep = normalizarCep(valor);
  if (cep.length !== 8) throw new Error('Informe um CEP com oito dígitos.');

  const controlador = new AbortController();
  const timeout = globalThis.setTimeout(() => controlador.abort(), 10000);
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: { Accept: 'application/json' },
      signal: controlador.signal,
    });
    if (!resposta.ok) throw new Error('Não foi possível consultar o serviço de CEP agora.');
    const dados = await resposta.json() as RespostaViaCep;
    if (dados.erro) return null;
    return {
      cep: normalizarCep(dados.cep ?? cep),
      logradouro: dados.logradouro?.trim() ?? '',
      complemento: dados.complemento?.trim() ?? '',
      bairro: dados.bairro?.trim() ?? '',
      localidade: dados.localidade?.trim() ?? '',
      uf: dados.uf?.trim().toUpperCase() ?? '',
    };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
