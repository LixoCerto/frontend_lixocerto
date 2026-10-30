# Avaliação técnica da plataforma LixoCerto — Etapa 2

**Data:** 30/10/2026. **Ambiente de ensaio:** sandbox local, com PostgreSQL e Redis descartáveis, API local, Envoy gRPC-Web e frontend local. Nenhum teste automatizado desta etapa usou a VM, dados de produção, localização física ou foto real.

## Versão e ferramentas

Os resultados foram obtidos sobre a árvore de trabalho testada baseada nos commits API `6cc375982dd74be84ffb191b857d6c2c91bc52c4`, frontend `f47004681c7fb17db7f8235e2d36153467eee2d4` e infraestrutura `66c49a4657f2b9f186afe841a30e14a6a904a436`; o working tree continha alterações locais relacionadas à etapa, ainda não commitadas. O commit `30a28267606733e5955ba3bb7c8c7de6edf959fc` do frontend foi usado como referência de `App.tsx` sem lazy loading na comparação controlada do bundle. O suplemento `etapa2-evidencias` contém métricas, capturas, roteiros e manifesto; os SHAs-base não incluem as alterações avaliadas.

| Ferramenta | Versão observada |
|---|---|
| Node.js | 22.23.4 |
| pnpm | 10.4.1 |
| TypeScript | 5.9.3 (frontend) / dependência declarada 5.9.2 na API |
| Vite | 7.1.9 |
| Playwright | 1.56.1 |
| Chromium/Chrome | 156.0.8078.47 |
| axe-core / @axe-core/playwright | 4.14.0 |
| Lighthouse User Flow | 13.6.0 |

## Testes automatizados

| Camada | Execução | Resultado |
|---|---|---:|
| API | TypeScript, testes unitários, lint de contratos (Buf) e compilação | Concluídos sem erro; 122 testes unitários em 33 arquivos |
| API | Integração em PostgreSQL/Redis locais descartáveis | 11/11 aprovados |
| API | E2E de saúde gRPC | 1/1 aprovado |
| Frontend | TypeScript, testes unitários e build de produção | Concluídos sem erro; 17 testes unitários em três arquivos |
| Frontend | Playwright ponta a ponta | 7/7 aprovados |

As sete jornadas Playwright foram: (1) cadastro, login e onboarding; (2) login de conta fictícia com senha legada válida; (3) busca no Guia com registro do seed local marcado como publicado somente na base descartável; (4) busca de pontos e leitura dos dados exibidos; (5) resposta ao quiz, participação em desafio e atualização do painel; (6) rejeição de localização simulada fora do raio de 5 m; e (7) check-in no ponto com foto sintética e envio para revisão. Conta, ponto, check-in, localização e foto usados nos ensaios eram fictícios ou sintéticos e permaneceram na base descartável. Em consulta separada, confirmamos que a ficha de papel/papelão correspondente aparece publicada na homologação; a Figura 5 usa recortes dessa consulta real. O cenário de geofence simula coordenadas no navegador; não é uma medição de GPS em campo.

## Acessibilidade automática

Axe-core foi aplicado a sete telas — login, confirmação de e-mail, visão geral, Guia, pontos, quiz e check-in — em Chromium headless, viewport 1280×900 CSS px, com tags WCAG 2.2 A/AA, versões anteriores incluídas no conjunto e boas práticas. Foram encontrados **zero violações confirmadas**, 283 resultados de regra aprovados e **seis regras incompletas**, todas relacionadas a contraste de cores e exigindo verificação manual. Resultado automatizado zero não equivale a conformidade WCAG: não houve avaliação completa com teclado, leitor de tela, zoom, alto contraste nem inspeção manual de todos os pares de cores.

## Desempenho em laboratório

Lighthouse User Flow 13.6.0 foi executado três vezes na build de produção, sob emulação móvel de 390×844 CSS px, DPR 1, RTT simulado de 150 ms, throughput de download 1.474,56 Kbps, upload 675 Kbps e CPU ×4. São métricas de laboratório, não dados de campo/CrUX. A coluna “score” é a pontuação de desempenho Lighthouse (0–100) da navegação ou timespan correspondente; não se incluem snapshots de tela sem uma navegação/interação medida.

| Etapa medida | Score Lighthouse — mediana (intervalo) | Métrica | Mediana (3 execuções) | Amostras |
|---|---:|---|---:|---|
| Navegação inicial `/login` | 94 (94–100) | LCP | **2.930,6 ms** | 1.374,1; 2.935,0; 2.930,6 ms |
| Navegação inicial `/login` | 94 (94–100) | CLS | **0,000** | 0; 0; 0 |
| Autenticação e primeiro acesso | 69 (68–69) | INP de laboratório | **58,1 ms** | 58,4; 57,1; 58,1 ms |
| Busca no Guia | 97 (97–97) | INP de laboratório | **230,5 ms** | 231,3; 222,7; 230,5 ms |
| Busca de ponto | 97 (96–97) | INP de laboratório | **245,7 ms** | 233,2; 245,7; 253,0 ms |
| Abertura do quiz | 100 (100–100) | INP de laboratório | **158,7 ms** | 137,8; 158,7; 164,5 ms |
| Início do check-in | 98 (98–99) | INP de laboratório | **202,6 ms** | 201,6; 203,3; 202,6 ms |

Os limites de referência para um resultado “bom” são LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1. O LCP mediano de laboratório excedeu 2,5 s, embora as três amostras tenham ficado abaixo de 3 s; três das cinco medianas de interação excederam 200 ms (busca do Guia, busca de pontos e início do check-in). CLS permaneceu zero. INP acima é uma medida de interações sintéticas em User Flow, não o percentil 75 de sessões reais; não há dados de campo para afirmar aprovação dos Core Web Vitals.

## Comparação controlada do code splitting

Foram construídas duas cópias com o mesmo código e dependências da versão de trabalho; somente o carregamento de rotas em `App.tsx` foi alternado para a referência anterior ao lazy loading. O total de JavaScript da aplicação permaneceu semelhante, mas a transferência inicial da rota `/login` caiu:

| Rota inicial `/login` | Antes (sem divisão de rota) | Depois (lazy loading) | Variação |
|---|---:|---:|---:|
| JavaScript efetivamente solicitado, bytes sem gzip | 797.683 | 474.077 | −40,6% |
| Transferência HTTP dos scripts, gzip | 226.801 | 146.583 | **−35,4%** |
| Número de arquivos JS solicitados | 1 | 5 | chunks compartilhados e da rota |

Os arquivos JavaScript somados na build final totalizam 800.223 bytes sem gzip, pois o code splitting reorganiza o total em chunks e não remove o código das demais rotas. O comparativo é do carregamento inicial da tela de login; não deve ser descrito como redução equivalente do total de bytes da aplicação.

## Homologação e ponto de coleta

Na primeira observação da homologação, foram vistos oito conteúdos publicados; na reconsulta somente de leitura em 30/10/2026, o Guia exibiu nove e a busca por “papelão” retornou uma ficha publicada. Os cinco temas em revisão documental já apareciam na lista, portanto não houve publicação duplicada; a diferença entre oito e nove é tratada como variação entre consultas, não como publicação feita por nós. A pedido do usuário, a EMLUR foi cadastrada e aprovada como “Verificado”, com fonte municipal e coordenada do pin do Google Maps. A coordenada não foi aferida em campo; “Verificado” indica aprovação do cadastro, não precisão geodésica ou confirmação operacional. Não há evidência de que a alteração local de interface que destaca a ressalva do pin tenha sido implantada na homologação.

## Reprodução

Os comandos, SHAs-base, versões, relatórios brutos, capturas e roteiros de axe/Lighthouse estão no suplemento versionado junto ao projeto, em `reports/etapa2-evidencias/`. Os testes devem ser executados apenas contra PostgreSQL/Redis locais descartáveis e contas fictícias.
