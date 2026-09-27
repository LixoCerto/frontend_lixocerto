# Tarefas — Frontend Lixo Certo

## Concluído

- [x] Importar os contratos Protobuf reais da API Lixo Certo.
- [x] Gerar os clientes TypeScript com Buf e `protoc-gen-es`.
- [x] Substituir tRPC, sessão Manus e backend embutido por autenticação gRPC própria.
- [x] Criar cadastro, login, renovação, logout e envio de `Authorization: Bearer` pelo cliente Connect-Web.
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

## Configurações locais documentadas

- [x] Registrar `VITE_API_BASE_URL` para Vite direto ou `/api/rpc` no Nginx.
- [x] Registrar que a API deve aceitar a origem `http://localhost:3000` e tokens JWT próprios.
- [x] Documentar o comando de Compose para a validação E2E no Windows com PostgreSQL externo.

## Extensões fora do contrato atual

Recuperação/troca de senha, verificação de e-mail e login social não foram
simulados no frontend: exigem RPCs específicos na API, persistência de tokens
de uso único, SMTP transacional ou credenciais OAuth externas. Permanecem como
evoluções futuras, sem telas que aparentem funcionar sem suporte real.

## Observações

O bundle inicial ultrapassa 500 kB após minificação. Isso é um aviso de otimização, não uma falha funcional; pode ser tratado posteriormente com code splitting por área do painel. Nenhum segredo deve ser colocado em variáveis `VITE_*`, pois elas são incorporadas ao JavaScript público.
