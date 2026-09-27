# Arquitetura do frontend estático — Lixo Certo

O frontend é uma aplicação React/Vite estática. Não possui servidor Node, banco de dados, tRPC, Drizzle ou segredos de cliente.

## Fluxo de execução

1. O navegador acessa o bundle servido pelo Nginx.
2. O usuário cadastra ou autentica pelo serviço gRPC `ServicoAutenticacao`.
3. A API retorna access token, refresh token e identidade com papéis e permissões.
4. A sessão fica somente no `sessionStorage`; o hook renova o access token e chama `Sair` no logout.
5. O token de acesso é enviado como `Authorization: Bearer` pelo interceptor Connect-Web.
6. O navegador chama `/api/rpc`, publicado pelo Nginx e encaminhado ao Envoy.
7. O Envoy converte gRPC-Web em gRPC e encaminha as chamadas para a API Lixo Certo.
8. A API confirma autenticação e autorização; o frontend apenas filtra a navegação.

## Variáveis públicas

A única variável de execução do bundle é `VITE_API_BASE_URL`. Variáveis `VITE_*` são públicas e nunca devem conter senhas, tokens ou chaves privadas. O banco PostgreSQL permanece exclusivamente no ambiente privado da API.

## Projetos

| Projeto | Responsabilidade |
|---|---|
| `frontend_lixocerto` | Interface React/Vite, sessão JWT local e cliente gRPC-Web |
| `api_lixocerto` | Domínio, autenticação JWT própria, autorização, banco e gRPC |
| `infra_lixocerto` | Redis, Envoy, imagens Docker, Compose e operação local |

## Limites atuais

Cadastro, login, renovação, logout e identidade estão expostos pela API. Recuperação de senha, troca de senha, verificação de e-mail e login social ainda exigem novos RPCs e não são simulados pelo frontend.
