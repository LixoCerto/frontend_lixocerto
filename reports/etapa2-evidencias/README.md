# Suplemento de evidências — Etapa 2

Este diretório reúne material de revisão e reprodução, não dados de produção. O roteiro Playwright e a fixture local estão nos repositórios `frontend_lixocerto/e2e/jornadas-etapa2.spec.ts` e `api_lixocerto/testes/e2e/fixtures/preparar-fixtures-etapa2.mts`.

- `diagramas/`: fontes Mermaid e Graphviz e PNGs do desenho DSR, arquitetura, casos de uso e modelo ER.
- `figuras/`: cinco composições em tons de cinza para o artigo.
- `raw/`: JSON de Playwright, Axe, Lighthouse e bundle, capturas E2E de origem e medição cartográfica.
- `scripts/`: roteiros de Axe e Lighthouse, dependências de auditoria fixadas e utilitários de figura/artigo.
- `rastreabilidade.md`: SHAs-base, versões, comandos, limites e estado não commitado das alterações.
- `SHA256SUMS`: hashes dos arquivos do suplemento, excluindo dependências instaladas, caches e o próprio manifesto.

A Figura 5 usa recortes somente de leitura da ficha de papel/papelão publicada no Guia da homologação; a Figura 6 combina o mapa OpenStreetMap com o cartão EMLUR após aprovação. Ambas excluem identidade administrativa e áreas alheias. A coordenada exibida na Figura 6 é o pin cartográfico do Google Maps, não aferição em campo. As Figuras 7–9 são capturas de jornadas locais com conta fictícia, fixtures e foto sintética.

A composição da Figura 5 (busca por “papelão” e ficha publicada, com preparo e cuidados) pode ser refeita, em escala de cinza, com `python3 reports/etapa2-evidencias/scripts/compose-guide-figure.py`. O script usa os recortes higienizados `raw/screenshots/13-guia-publicado-busca.png` e `14-guia-publicado-ficha.png`, obtidos da consulta ao site em 30/10/2026; os cabeçalhos e a identidade administrativa não são incluídos. Não são inseridos textos ou elementos artificiais.

O script da figura usa Pillow; o gerador DOCX usa `python-docx` e lê o artigo original sem modificá-lo. Ambos usam os caminhos absolutos deste sandbox, que devem ser ajustados em outro ambiente.

O modelo ER é gerado da fonte `diagramas/modelo-er-core.dot` com Graphviz (`dot -Tpng -Gdpi=180 ...`); a fonte Mermaid anterior permanece como referência do primeiro desenho.

## Reprodução segura

Execute apenas em ambiente local descartável, nunca apontando testes à VM, homologação, produção ou contas reais. Prepare PostgreSQL e Redis locais, configure a API para usar somente esses serviços, aplique migrations/seeds locais e execute a fixture versionada com conta fictícia. O teste usa um PNG sintético e geolocalização simulada. Não inclua `.env`, credenciais, dumps reais ou dados pessoais no repositório.

Na raiz do frontend, instale as dependências congeladas e execute:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright test e2e/jornadas-etapa2.spec.ts
```

Para Axe/Lighthouse, inicie a build e API/Envoy locais. Instale as dependências isoladas e exporte somente variáveis fictícias de teste (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`), além de URLs de loopback em `AUDIT_BASE_URL`/`LHR_BASE_URL`. Exemplo a partir da raiz do frontend:

```bash
npm ci --prefix reports/etapa2-evidencias/scripts
node reports/etapa2-evidencias/scripts/run-axe.mjs
export CHROME_PATH="$(node -p 'require("@playwright/test").chromium.executablePath()')"
for run in 1 2 3; do
  LHR_RUN_ID="$run" node reports/etapa2-evidencias/scripts/run-lighthouse.mjs
done
```

Os roteiros não contêm credenciais e falham se as variáveis fictícias não forem fornecidas. Em outro ambiente, adapte o caminho do Chromium e os seletores caso a interface tenha mudado. Lighthouse é uma medição de laboratório; Axe automatizado não é certificação WCAG.
