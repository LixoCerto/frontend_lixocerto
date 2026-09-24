# Tarefas — Frontend Lixo Certo

## Concluído

- [x] Importar os contratos Protobuf reais da API Lixo Certo.
- [x] Gerar os clientes TypeScript com Buf e `protoc-gen-es`.
- [x] Substituir tRPC, sessão Manus e backend embutido por OIDC Authorization Code + PKCE.
- [x] Criar callback OIDC e envio de `Authorization: Bearer` pelo cliente Connect-Web.
- [x] Adaptar materiais, pontos de coleta, progresso e questionário aos contratos gRPC reais.
- [x] Remover `server/`, `drizzle/`, configuração Sequelize/Drizzle e componentes legados do template.
- [x] Converter o build para Vite estático servido pelo Nginx.
- [x] Adicionar Envoy gRPC-Web e proxy `/api/rpc` no projeto `infra_lixocerto`.
- [x] Documentar a configuração pública do frontend e a separação entre os três projetos.

## Validação

- [x] `pnpm proto:generate`.
- [x] `pnpm check`.
- [x] `pnpm test` — 2 testes da matriz de permissões aprovados.
- [x] `pnpm build` — bundle estático gerado em `dist/`.
- [x] Compose revisado para Redis, API, Envoy e frontend.

## Configurações externas documentadas

- [x] Registrar que `VITE_OIDC_ISSUER` e `VITE_OIDC_CLIENT_ID` precisam ser preenchidos pelo responsável pelo provedor institucional.
- [x] Registrar que `http://localhost:3000/callback` e `http://localhost:3000/login` precisam ser cadastrados no provedor OIDC.
- [x] Registrar que a API deve aceitar CORS/origem `http://localhost:3000` e tokens com a audiência configurada.
- [x] Documentar o comando de Compose para a validação E2E no Windows; a execução depende do Docker Desktop e do provedor OIDC reais.

## Observações

O bundle inicial ultrapassa 500 kB após minificação. Isso é um aviso de otimização, não uma falha funcional; pode ser tratado posteriormente com code splitting por área do painel. Nenhum segredo deve ser colocado em variáveis `VITE_*`, pois elas são incorporadas ao JavaScript público.
