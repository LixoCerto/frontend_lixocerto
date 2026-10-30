# Rastreabilidade da avaliação — Etapa 2

**Data:** 30/10/2026. **Escopo:** build local de homologação técnica da versão de trabalho; testes em sandbox com banco e dados descartáveis. Os ensaios não usaram dados pessoais, segredo, foto real ou GPS de campo. As capturas 13 e 14 são recortes higienizados de conteúdo público consultado em homologação, sem identidade administrativa.

## Bases Git observadas

| Repositório | Branch | HEAD base observado | Observação |
|---|---|---|---|
| `api_lixocerto` | `main` | `6cc375982dd74be84ffb191b857d6c2c91bc52c4` | Working tree continha alterações locais de catálogo, validação de geofence/coordenadas, script E2E e fixtures. |
| `frontend_lixocerto` | `main` | `f47004681c7fb17db7f8235e2d36153467eee2d4` | Working tree continha alterações locais de UI, acessibilidade, carregamento/recuperação, onboarding, code splitting e Playwright. |
| `infra_lixocerto` | `main` | `66c49a4657f2b9f186afe841a30e14a6a904a436` | Árvore limpa no momento da conferência. |
| Baseline de code splitting | — | `30a28267606733e5955ba3bb7c8c7de6edf959fc` | Referência anterior usada para restaurar apenas `App.tsx` na comparação controlada. |

**Importante:** esses SHAs são commits-base e não incluem as alterações locais da etapa; não foram criados commits nem feito push nesta sessão. `SHA256SUMS` protege a integridade dos arquivos deste suplemento, mas não cobre as árvores completas dos repositórios nem substitui um diff Git. Não afirmar que os SHAs-base, isoladamente, reproduzem a árvore avaliada.

## Versões registradas

Node.js 22.23.4; pnpm 10.4.1; TypeScript 5.9.3 no frontend; Vite 7.1.9; Playwright 1.56.1; Chromium/Chrome 156.0.8078.47; axe-core e @axe-core/playwright 4.14.0; Lighthouse User Flow 13.6.0; Puppeteer Core 25.16.0. API executada com PostgreSQL e Redis locais descartáveis e Envoy gRPC-Web local. As fixtures usam conta fictícia, ponto/check-in sintéticos, foto PNG artificial e um registro de catálogo do seed marcado como publicado apenas na base descartável. Em consulta independente, confirmou-se que a ficha de papel/papelão correspondente também consta como publicada na homologação; essa tela real é a fonte das Figuras 5 e dos recortes 13/14.

## Comandos de qualidade

```bash
# API — cópia de ensaio e serviços locais descartáveis
corepack pnpm tipos
corepack pnpm testar
corepack pnpm testar:integracao
corepack pnpm contratos:validar
corepack pnpm compilar
corepack pnpm testar:e2e

# Frontend — cópia de ensaio
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright test e2e/jornadas-etapa2.spec.ts
```

Os testes da API que exigem persistência só devem ser executados com variáveis apontadas explicitamente a PostgreSQL/Redis locais descartáveis. Credenciais temporárias não foram incluídas no repositório. O Playwright usou Vite/Envoy/API locais; não executou chamadas na VM.

## Resultados brutos

`raw/playwright.json` registra sete jornadas aprovadas. `raw/axe-wcag22.json` registra sete telas, zero violações confirmadas, 283 resultados de regra aprovados e seis resultados incompletos de contraste que exigem inspeção manual. `raw/lighthouse-run-1.json` a `raw/lighthouse-run-3.json` registram medições em emulação móvel e rede/CPU simuladas. `raw/bundle-comparison.json` detalha a comparação da rota `/login`. Capturas de origem estão em `raw/screenshots/`; composições para o artigo em `figuras/`; fontes Mermaid/Graphviz e PNGs renderizados em `diagramas/`. `raw/screenshots/13-guia-publicado-busca.png` e `14-guia-publicado-ficha.png` são recortes da homologação em consulta de leitura; cabeçalho administrativo e áreas alheias foram excluídos e as imagens da sessão original não são incluídas.

## Conferência de conteúdo publicado

Em 30/10/2026, o Guia de homologação exibiu nove materiais; a busca por “papelão” retornou uma ficha publicada, “Papel e papelão secos para coleta seletiva”, com preparo, cuidados, fontes e encaminhamentos condicionados ao serviço local. Uma observação anterior havia contado oito itens; a variação foi registrada como diferença entre consultas. Nenhum status ou conteúdo foi alterado nessa reconsulta. O relatório `../etapa2-publicacao-homologacao.md` documenta a observação e o cadastro EMLUR autorizado.

As dez heurísticas foram inspecionadas independentemente. O resumo pós-correções está em `../avaliacao-heuristica-etapa2.md` (32 achados; 1 de severidade 1, 28 de severidade 2, 3 de severidade 3 e nenhum de severidade 4; 16 presentes e 16 parcialmente mitigados).

## Interpretação

Resultados automatizados demonstram somente execução dos casos e ferramentas descritos. Não demonstram cobertura total, ausência de defeitos, conformidade WCAG integral, Core Web Vitals de campo, precisão de GPS em campo, eficácia ambiental, aprendizagem ou usabilidade percebida. INP é de laboratório por interação sintética; Core Web Vitals representativos requerem dados de campo, em geral avaliados no percentil 75.
