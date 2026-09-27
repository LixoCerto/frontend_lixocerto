# Autenticação local — Lixo Certo

## Escopo implementado

O frontend usa os RPCs próprios do serviço `ServicoAutenticacao` da API gRPC:

- `CadastrarUsuario`: cria a conta e inicia a sessão;
- `Entrar`: autentica e recebe access token e refresh token;
- `RenovarToken`: renova a sessão antes da expiração do access token;
- `Sair`: revoga o refresh token no backend;
- `ObterIdentidadeAtual`: confirma a sessão e carrega papéis e permissões.

O perfil também usa os RPCs `ServicoSessoes/ListarSessoes` e
`ServicoSessoes/RevogarTodasSessoes`. A revogação de todas as sessões exige
confirmação explícita na interface e, quando concluída, encerra a sessão local.

As chamadas de negócio usam gRPC-Web pelo Envoy e recebem automaticamente `Authorization: Bearer <token>` por interceptor.

## Fluxo da interface

1. O usuário acessa `/login`.
2. O formulário valida e-mail, senha e, no cadastro, nome e confirmação.
3. A API retorna a identidade, papéis, permissões e tokens.
4. A sessão é mantida somente em `sessionStorage` durante a aba atual.
5. O hook renova o token próximo da expiração e recarrega a identidade.
6. O painel filtra a navegação, mas a autorização definitiva permanece na API.
7. O perfil consulta sessões reais do backend e permite encerrar todas após confirmação.
8. O logout chama o RPC `Sair`, limpa a sessão local e volta para `/login`.

## Limites honestos do contrato atual

A API própria atual ainda não expõe RPCs para recuperação de senha, troca de senha, verificação de e-mail ou login social. A tela sinaliza esse limite em vez de simular uma operação que não existe. Esses recursos exigem novos contratos, persistência de tokens de uso único e um serviço de envio de e-mail.

## Configuração

- Docker: `VITE_API_BASE_URL=/api/rpc`.
- Vite fora do Docker: `VITE_API_BASE_URL=http://127.0.0.1:8080`.
- Não existem mais variáveis `VITE_OIDC_*` para este fluxo.
- Nenhum segredo é colocado em variáveis `VITE_*`.
