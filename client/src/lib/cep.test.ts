import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarCepViaCep, cepCompleto, formatarCep, montarEnderecoCep, normalizarCep } from './cep';

afterEach(() => vi.unstubAllGlobals());

describe('utilitários de CEP', () => {
  it('aplica a máscara brasileira depois do quinto dígito', () => {
    expect(formatarCep('58013')).toBe('58013');
    expect(formatarCep('58013000')).toBe('58013-000');
    expect(formatarCep('58013-000')).toBe('58013-000');
  });

  it('remove caracteres não numéricos e limita a oito dígitos', () => {
    expect(normalizarCep('58.013-0009')).toBe('58013000');
  });

  it('identifica CEP completo', () => {
    expect(cepCompleto('58013-000')).toBe(true);
    expect(cepCompleto('58013')).toBe(false);
  });

  it('compõe endereço com campos disponíveis sem duplicatas', () => {
    expect(montarEnderecoCep({ logradouro: 'Rua A', complemento: '', bairro: 'Centro' })).toBe('Rua A, Centro');
    expect(montarEnderecoCep({ logradouro: 'Rua A', complemento: 'Rua A', bairro: '' })).toBe('Rua A');
  });

  it('consulta o ViaCEP e mapeia seus dados para o formulário', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      cep: '58013-000',
      logradouro: 'Avenida Exemplo',
      complemento: '',
      bairro: 'Centro',
      localidade: 'João Pessoa',
      uf: 'PB',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(buscarCepViaCep('58013-000')).resolves.toEqual({
      cep: '58013000',
      logradouro: 'Avenida Exemplo',
      complemento: '',
      bairro: 'Centro',
      localidade: 'João Pessoa',
      uf: 'PB',
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://viacep.com.br/ws/58013000/json/');
  });

  it('trata CEP inexistente e rejeita valores incompletos sem consultar a rede', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ erro: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(buscarCepViaCep('99999999')).resolves.toBeNull();
    await expect(buscarCepViaCep('123')).rejects.toThrow('oito dígitos');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
