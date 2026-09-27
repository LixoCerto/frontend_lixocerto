export type IdentidadeLocal = {
  idUsuario: string;
  nomeUsuario: string;
  emailUsuario: string;
  papeisUsuario: string[];
  permissoesUsuario: string[];
};

export type SessaoLocal = {
  tokenAcesso: string;
  tokenAtualizacao: string;
  expiraEmSegundos: number;
  identidade: IdentidadeLocal;
};

const CHAVE_SESSAO = "lixo-certo.sessao.v1";

function armazenamento(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function carregarSessao(): SessaoLocal | null {
  const valor = armazenamento()?.getItem(CHAVE_SESSAO);
  if (!valor) return null;
  try {
    const sessao = JSON.parse(valor) as SessaoLocal;
    if (!sessao.tokenAcesso || !sessao.tokenAtualizacao || !sessao.identidade) return null;
    return sessao;
  } catch {
    limparSessao();
    return null;
  }
}

export function salvarSessao(sessao: SessaoLocal): void {
  armazenamento()?.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("lcr:sessao-alterada"));
}

export function limparSessao(): void {
  armazenamento()?.removeItem(CHAVE_SESSAO);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("lcr:sessao-alterada"));
}

export function obterTokenAcesso(): string | null {
  return carregarSessao()?.tokenAcesso ?? null;
}

export function obterTokenAtualizacao(): string | null {
  return carregarSessao()?.tokenAtualizacao ?? null;
}

export function obterExpiracaoToken(token: string | null): number | null {
  if (!token) return null;
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    const payload = JSON.parse(atob(parte.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tokenExpirado(token: string | null, margemMs = 0): boolean {
  const expiracao = obterExpiracaoToken(token);
  return expiracao !== null && expiracao <= Date.now() + margemMs;
}
