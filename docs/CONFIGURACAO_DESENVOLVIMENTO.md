# Configuração de desenvolvimento — Frontend Lixo Certo

Este documento descreve as variáveis usadas pelo frontend WebDev e seu backend de sessão. **Os valores reais devem permanecer no ambiente local ou no gerenciador de segredos.**

## Arquivo local

Crie um arquivo `.env.local` na raiz do frontend:

```env
# Manus OAuth
VITE_APP_ID=SEU_APP_ID_MANUS
VITE_OAUTH_PORTAL_URL=https://api.manus.im
OAUTH_SERVER_URL=https://api.manus.im

# Sessão do backend WebDev
JWT_SECRET=SUBSTITUA_POR_UM_SEGREDO_SERVER_SIDE_LONGO

# Banco do backend WebDev
DATABASE_URL=mysql://usuario:senha@127.0.0.1:3306/lixo_certo_web

# Proprietário do projeto
OWNER_OPEN_ID=SEU_OPEN_ID_MANUS
OWNER_NAME=Arthur Nobrega

# APIs internas Manus, somente se forem usadas
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
```

O callback oficial do OAuth é:

```text
/api/oauth/callback
```

O frontend cria o nonce no navegador e o backend valida o estado antes de criar a sessão. Não substitua esse fluxo por uma URL de callback manual.

## Autorização por nível

Depois do login, o procedimento protegido `auth.access` retorna o papel persistido e as permissões da sessão. Os papéis suportados são:

| Valor persistido | Papel exibido | Escopo |
|---|---|---|
| `user` | Usuário | Aprendizagem, materiais, desafios e impacto próprio |
| `pesquisador` | Pesquisador | Indicadores e resultados agregados |
| `revisor` | Revisor | Moderação de materiais, pontos e questionários |
| `admin` | Administrador | Governança, auditoria e todas as áreas autorizadas |

A interface utiliza as permissões para montar o menu, mas operações sensíveis devem continuar sendo protegidas no backend/API.

## Gateway da API gRPC

O cliente atual do frontend usa o caminho relativo `/api/rpc`. Para consumir a API independente em `localhost:50051`, será necessário configurar um gateway Connect/gRPC-Web ou Envoy. O navegador deve enviar:

```http
Authorization: Bearer <jwt>
```

A configuração do gateway e a troca do endpoint relativo pelo endpoint de desenvolvimento devem ser feitas quando a API gRPC estiver exposta para o navegador.

## Segurança

Não versione `.env`, `.env.local`, tokens, senhas, cookies de sessão, chaves privadas ou arquivos exportados do provedor OIDC. Antes de publicar, confirme:

```powershell
git status --short
git diff -- .env .env.local
```
