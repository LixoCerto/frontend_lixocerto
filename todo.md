# Tarefas — Webapp Lixo Certo

## Concluído nesta versão

- [x] Substituir a página promocional pelo painel único adaptativo.
- [x] Centralizar a matriz de papéis e permissões compartilhada.
- [x] Exibir navegação e áreas de trabalho conforme permissões.
- [x] Consumir os dados Connect/gRPC-Web disponíveis para painel, materiais e pontos.
- [x] Preparar estados visuais para usuário, pesquisador, revisor e administrador.
- [x] Adicionar testes da matriz de acesso.
- [x] Validar a experiência em desktop e mobile.

## Evidências de validação

| Verificação | Resultado |
|---|---|
| `pnpm check` | Aprovado |
| `pnpm test` | 14 testes aprovados |
| `pnpm build` | Aprovado |
| Smoke test de responsividade | Menu móvel, breakpoint desktop e controles acessíveis verificados |
| Preview desktop 1440×900 | Barra lateral fixa, cards e hierarquia aprovados |
| Preview mobile 390×844 | Menu recolhido, cabeçalho e cards empilhados aprovados |
| Perfil Pesquisador | Menu filtrado e indicadores agregados exibidos |
| Perfil Administrador | Central de revisão, pesquisa e administração exibidas |

## Observação técnica

O build registra apenas um aviso de otimização: o bundle principal ultrapassa 500 kB após minificação. A aplicação está funcional; code splitting poderá ser feito na próxima etapa de integração para reduzir o carregamento inicial.

## Próximos passos

- Substituir a matriz de demonstração pelas claims e permissões retornadas pela API Lixo Certo.
- Configurar o cliente Connect com o endpoint real do Envoy.
- Integrar autenticação OIDC/PKCE.
- Conectar as telas administrativas aos contratos gRPC reais.
- Adicionar testes E2E de fluxos autenticados com Playwright.
