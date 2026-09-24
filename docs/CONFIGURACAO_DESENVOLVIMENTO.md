# Configuração de desenvolvimento — Frontend Lixo Certo

O frontend é uma aplicação React/Vite estática. Ele não possui servidor Node, banco de dados, tRPC, Drizzle, sessão própria ou segredo de cliente.

## Desenvolvimento direto

Copie `.env.exemplo` para `.env`, informe o emissor OIDC e o `client_id` público cadastrados para `http://localhost:3000/callback`, instale as dependências e execute `pnpm dev`.

O frontend direto usa `VITE_API_BASE_URL` apontando para um gateway gRPC-Web acessível pelo navegador. Para execução integrada, mantenha `/api/rpc` e use o Envoy do projeto de infraestrutura.

## Execução integrada

A partir de `infra_lixocerto`, configure `.env` com os caminhos dos projetos irmãos e com as variáveis públicas `VITE_*`. Em seguida, execute `docker compose --profile app up --build`.

O fluxo integrado é:

```text
browser :3000 → frontend Nginx :8080 → gateway Envoy :8080 → API gRPC :50051 → PostgreSQL externo
                                                        └──→ Redis do Compose
```

O frontend não exige `DATABASE_URL`. O arquivo `.env` da API permanece privado e não deve ser copiado para o repositório ou para a imagem do frontend.

## Configuração OIDC

O provedor deve permitir Authorization Code com PKCE para uma aplicação pública (SPA), sem `client_secret`. Cadastre exatamente:

```text
http://localhost:3000/callback
```

O token é enviado à API como `Authorization: Bearer <token>`. A API deve validar assinatura, emissor, audiência, expiração, papel e permissão. A interface apenas monta a navegação com base na identidade retornada por `ServicoAutenticacao.ObterIdentidadeAtual`.

## Segurança

Não versione `.env`, tokens, senhas, cookies de sessão, chaves privadas ou arquivos exportados do provedor OIDC. As variáveis `VITE_*` são públicas no bundle e nunca podem conter credenciais.
