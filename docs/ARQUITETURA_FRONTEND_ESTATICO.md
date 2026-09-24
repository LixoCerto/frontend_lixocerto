# Arquitetura do frontend estático — Lixo Certo

O frontend é uma aplicação React/Vite estática. Não possui servidor Node, banco de dados, tRPC, Drizzle, sessões próprias ou segredos de cliente.

## Fluxo de execução

1. O navegador acessa o bundle servido pelo Nginx.
2. O login usa OIDC Authorization Code com PKCE por meio de `oidc-client-ts`.
3. O token de acesso é enviado como `Authorization: Bearer` pelo interceptor Connect-Web.
4. O navegador chama `/api/rpc`, publicado pelo Nginx e encaminhado ao Envoy.
5. O Envoy converte gRPC-Web em gRPC e encaminha as chamadas para a API Lixo Certo.
6. A API calcula identidade, papéis e permissões; o frontend apenas filtra a navegação e nunca substitui a autorização do backend.

## Variáveis públicas

As variáveis `VITE_*` são incorporadas ao bundle e não devem conter senhas, tokens, chaves privadas ou credenciais. O banco PostgreSQL permanece exclusivamente no ambiente privado da API.

## Projetos

| Projeto | Responsabilidade |
|---|---|
| `frontend_lixocerto` | Interface React/Vite, OIDC/PKCE e cliente gRPC-Web |
| `api_lixocerto` | Domínio, autenticação JWT/OIDC, autorização, banco e gRPC |
| `infra_lixocerto` | Redis, Envoy, imagens Docker, Compose e operação local |

## Limites de segurança

O frontend não recebe nem armazena senha. O `client_id` OIDC é público por definição para uma SPA; o provedor deve cadastrar os redirects exatos e permitir PKCE. A autorização efetiva continua na API, que deve validar assinatura, emissor, audiência, expiração, papel e permissão em cada operação protegida.
