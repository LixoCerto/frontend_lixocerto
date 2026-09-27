# Configuração de desenvolvimento — frontend Lixo Certo

O frontend é uma aplicação React/Vite estática. Ele não possui servidor Node, banco de dados, tRPC, Drizzle ou segredo de cliente.

## Desenvolvimento direto

Copie `.env.exemplo` para `.env`, configure `VITE_API_BASE_URL=http://127.0.0.1:8080`, instale as dependências e execute `pnpm dev`.

## Execução integrada

A partir de `infra_lixocerto`, configure o `.env` com os caminhos dos projetos irmãos e execute:

```powershell
docker compose --env-file .env --profile app up --build -d
```

O fluxo é:

```text
browser :3000 → frontend Nginx :8080 → gateway Envoy :8080 → API gRPC :50051 → PostgreSQL externo
                                                        └──→ Redis do Compose
```

O frontend não exige `DATABASE_URL`. O arquivo `.env` da API permanece privado e não deve ser copiado para o repositório ou para a imagem do frontend.

## Autenticação

O frontend chama o serviço gRPC próprio da API para cadastro, login, renovação, logout e identidade atual. O cliente Connect-Web anexa `Authorization: Bearer <token>` automaticamente às chamadas. Não configure OIDC, Keycloak, Google ou Client Secret.

Recuperação de senha, troca de senha, verificação de e-mail e login social ainda não fazem parte do contrato gRPC atual; a interface informa esse limite em vez de simular uma operação inexistente.

## Segurança

Não versione `.env`, tokens, senhas, cookies de sessão ou chaves privadas. As variáveis `VITE_*` são públicas no bundle e nunca podem conter credenciais.
