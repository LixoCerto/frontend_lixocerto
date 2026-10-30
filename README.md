# LixoCerto — Frontend web

Aplicação web de página única construída com React, TypeScript e Vite para a plataforma **LixoCerto**. Apresenta o Guia de descarte, pontos de coleta, quizzes, desafios, progresso, pesquisa de experiência e áreas administrativas, conforme as permissões recebidas da API.

> **Status:** em desenvolvimento. Testes automatizados, inspeções e métricas de laboratório têm escopo definido; não equivalem, por si só, a avaliação com participantes nem demonstram impacto ambiental.

## Arquitetura

- React 19, TypeScript, Vite e Tailwind CSS;
- navegação de página única com Wouter;
- chamadas ao backend por gRPC-Web com Connect;
- Envoy faz a ponte entre o navegador e a API gRPC;
- o container de execução serve os arquivos estáticos com Nginx não privilegiado — não há servidor Node nem banco de dados próprios no frontend.

```text
Navegador → Frontend React → /api/rpc → Envoy → API gRPC → PostgreSQL / Redis / storage
```

A API e a configuração Docker integrada ficam nos repositórios [`api_lixocerto`](https://github.com/LixoCerto/api_lixocerto) e [`infra_lixocerto`](https://github.com/LixoCerto/infra_lixocerto).

## Requisitos

- Node.js 22;
- pnpm 10.4.1 via Corepack;
- API e Envoy disponíveis para testar chamadas reais do aplicativo.

## Instalação e desenvolvimento

Na raiz do repositório:

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
cp .env.exemplo .env
```

No PowerShell:

```powershell
Copy-Item .env.exemplo .env
```

Configure no `.env` apenas as opções públicas do frontend:

| Variável | Uso |
|---|---|
| `VITE_API_BASE_URL` | URL base do gRPC-Web. Use `/api/rpc` no Docker ou `http://127.0.0.1:8080` ao acessar um Envoy local diretamente. |
| `VITE_GOOGLE_CLIENT_ID` | Client ID web público usado pelo Google Identity Services no navegador. |

Inicie o servidor de desenvolvimento com:

```bash
pnpm dev
```

Os servidores Vite de desenvolvimento e preview escutam em `0.0.0.0`; utilize-os somente em uma rede de desenvolvimento confiável e não exponha essas portas à Internet. Para gerar e visualizar o bundle de produção localmente:

```bash
pnpm build
pnpm preview
```

## Autenticação e sessão

O fluxo por e-mail usa os RPCs da API para cadastro, confirmação, login, renovação e encerramento de sessão. O botão Google usa o popup oficial do Google Identity Services; o token de identidade recebido é enviado à API para validação. Configure o mesmo Client ID web em `VITE_GOOGLE_CLIENT_ID` no frontend e `GOOGLE_OAUTH_CLIENT_ID` na API. O Client ID é público; **não coloque Client Secret nem qualquer outro segredo em variável `VITE_*`**.

A sessão e as permissões vêm do backend. Ocultar uma opção na navegação não substitui a autorização que a API deve aplicar a cada operação.

## Primeiro acesso guiado

No primeiro acesso, o roteiro obrigatório conduz a pessoa por ações reais de baixo risco no guia e na busca por cidade, e depois apresenta explicações sobre quiz, desafios e pesquisa de experiência. As telas informativas não respondem quizzes, não registram participação em desafios e não enviam respostas de pesquisa. O progresso do roteiro é mantido localmente no navegador; limpar o armazenamento ou trocar de navegador pode fazer o roteiro reaparecer.

## Comandos de qualidade

| Comando | Finalidade |
|---|---|
| `pnpm check` | Verifica tipos TypeScript |
| `pnpm test` | Executa os testes automatizados do frontend |
| `pnpm build` | Gera o bundle estático de produção |
| `pnpm proto:generate` | Valida e gera os artefatos Protobuf/TypeScript |
| `pnpm format` | Formata os arquivos com Prettier |

Execute `pnpm proto:generate` somente quando alterar deliberadamente um contrato Protobuf. Após qualquer mudança, rode ao menos `pnpm check`, `pnpm test` e `pnpm build`.

## Segurança, acessibilidade e escopo

- Variáveis `VITE_*` são incorporadas ao bundle e ficam visíveis no navegador; use-as apenas para configuração pública.
- A autorização de contas e ações é responsabilidade da API, não do frontend.
- A navegação e o onboarding são adaptados às permissões recebidas do backend.
- A interface inclui suporte a teclado e preferências de movimento reduzido. Os relatórios registram o escopo das verificações; não constituem declaração de conformidade integral com WCAG nem avaliação com participantes.
- Testes automatizados não substituem testes integrados com API/banco nem avaliação com participantes.

## Documentação relacionada

- [Arquitetura do frontend estático](docs/ARQUITETURA_FRONTEND_ESTATICO.md)
- [Configuração de desenvolvimento](docs/CONFIGURACAO_DESENVOLVIMENTO.md)
- [Contrato de autenticação](proto/lixo_certo/v1/servico_autenticacao.proto)
- [Avaliação técnica](reports/avaliacao-tecnica.md)
- [Inspeção heurística de usabilidade](reports/avaliacao-heuristica-etapa2.md)
- [API](https://github.com/LixoCerto/api_lixocerto) · [Infraestrutura](https://github.com/LixoCerto/infra_lixocerto)
