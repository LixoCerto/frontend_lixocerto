# Autenticação local — Lixo Certo

## Escopo implementado

O frontend usa os RPCs próprios do serviço `ServicoAutenticacao` da API gRPC:

- `CadastrarUsuario`: cria a conta; o acesso só é liberado após a confirmação do e-mail;
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
3. A API retorna a identidade, papéis e permissões; para uma conta nova, os tokens ficam vazios até a confirmação do e-mail.
4. A sessão é mantida somente em `sessionStorage` durante a aba atual.
5. O hook renova o token próximo da expiração e recarrega a identidade.
6. O painel filtra a navegação, mas a autorização definitiva permanece na API.
7. O perfil consulta sessões reais do backend e permite encerrar todas após confirmação.
8. O logout chama o RPC `Sair`, limpa a sessão local e volta para `/login`.

## Limites honestos do contrato atual

Os fluxos de confirmação de e-mail e recuperação de senha estão implementados
ponta a ponta: contrato gRPC, tokens de uso único persistidos como hash, envio
transacional pelo Resend e telas dedicadas. Ainda não fazem parte do contrato:
troca de senha autenticada (com senha atual), login social e autenticação em
dois fatores.

## Telas dos fluxos de e-mail

| Rota | Função |
|---|---|
| `/login` (modo Esqueci) | Solicita o código de recuperação com resposta neutra |
| `/confirmar-email?email=...` | Recebe e consome o código de confirmação |
| `/redefinir-senha?email=...` | Recebe o código, cria a nova senha e informa as sessões revogadas |

O painel exibe um aviso quando `emailVerificadoUsuario` é falso, com ação de
reenvio do link. O estado de verificação vem da API em cada renovação de sessão,
portanto a interface nunca presume que o e-mail já foi confirmado.

## Configuração

- Docker: `VITE_API_BASE_URL=/api/rpc`.
- Vite fora do Docker: `VITE_API_BASE_URL=http://127.0.0.1:8080`.
- Não existem mais variáveis `VITE_OIDC_*` para este fluxo.
- Nenhum segredo é colocado em variáveis `VITE_*`.
- `SolicitarVerificacaoEmail`: pede o envio do código de confirmação do e-mail;
- `ConfirmarEmail`: valida e consome o código junto com o e-mail;
- `SolicitarRecuperacaoSenha`: pede o código de redefinição com resposta neutra;
- `RedefinirSenha`: valida e consome o código, troca a senha e revoga todas as sessões.
