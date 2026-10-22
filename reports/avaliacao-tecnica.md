# Avaliação técnica do Lixo Certo

Data da execução: 22/10/2026. Ambiente: sandbox Linux, Node.js 22.13.0, Chromium headless, frontend servido pelo preview de produção em `127.0.0.1:4173`. A auditoria Lighthouse usou o preset mobile simulado: Moto G Power (2022), viewport 412×823, DPR 1,75, rede simulada RTT 150 ms e download 1,474 Mbps, CPU 4× mais lenta.

## 1. Testes automatizados e jornadas

| Jornada / suíte | Passos executados | Resultado |
|---|---|---|
| Cadastro e login | Abrir `/login`; validar heading, campos de e-mail e senha; alternar para “Criar conta”; preencher senha inválida; confirmar mensagens de requisito e bloqueio do cadastro; abrir recuperação de senha | **PASSOU**: 3/3 testes Playwright existentes, 23/23 testes unitários do frontend |
| Consulta ao guia | O código contém a tela e busca do guia em `Home`, mas a jornada autenticada exige API gRPC-Web/Envoy e usuário autenticado | **NÃO VALIDADO ponta a ponta**: infraestrutura de API não estava disponível nesta sandbox |
| Busca de pontos de coleta | O componente `PontosColetaCrud` foi localizado, mas a chamada real depende da API e de dados de homologação | **NÃO VALIDADO ponta a ponta**: infraestrutura de API não estava disponível |
| Quiz com pontuação | O frontend contém o fluxo de questionários e o backend contém regras de questionários/gamificação; não foi possível executar a jornada real sem API, banco e sessão | **NÃO VALIDADO ponta a ponta** |
| Check-in com foto | O fluxo de registros de descarte e evidências existe no frontend/backend; upload e persistência reais dependem de API, storage e autenticação | **NÃO VALIDADO ponta a ponta** |
| 11 testes de integração da API | `pnpm testar:integracao` | **11/11 pulados** pelos próprios testes por ausência de PostgreSQL e Redis locais |
| E2E gRPC existente | `pnpm testar:e2e` compila a API e chama `ServicoSaude.Verificar` | **FALHOU**: recebeu `status_servico=degradado` em vez de `saudavel`; banco e Redis não estavam disponíveis |
| Qualidade do frontend | `pnpm check`, `pnpm test`, `pnpm build` | **PASSOU**: tipos, 4 arquivos de teste e 23 testes; build de produção concluído |

Conclusão desta frente: os testes automatizáveis disponíveis foram executados, mas não é válido declarar as cinco jornadas principais como ponta a ponta aprovadas. Três jornadas públicas de acesso estão cobertas; as quatro jornadas autenticadas e dependentes de dados permanecem pendentes de execução em ambiente com API, Envoy, PostgreSQL, Redis e storage.

## 2. Avaliação heurística de Nielsen

Inspeção estática e exploratória das telas públicas, rotas, componentes e estados de erro/carregamento. Gravidade: 0 = sem problema; 1 = cosmético; 2 = menor; 3 = maior; 4 = crítico.

| Heurística | Evidência observada | Problema / gravidade |
|---|---|---|
| 1. Visibilidade do estado do sistema | Há `TelaCarregamento`, `role=status`, `aria-live`, estados de ocupado, alertas e mensagens de sucesso | Sem problema relevante observado — **0** |
| 2. Correspondência com o mundo real | Rótulos “Guia”, “Pontos de coleta”, “Desafios”, “Quiz” e linguagem em português orientam a tarefa | Sem problema relevante observado — **0** |
| 3. Controle e liberdade do usuário | Existem retorno para login, recuperação de senha e limpeza de filtros | A jornada autenticada não pôde ser exercitada para verificar cancelamento de upload/check-in — **2, pendente de validação** |
| 4. Consistência e padrões | Componentes Radix, botões e estados visuais seguem padrões semelhantes; tabs usam `role=tab`/`tabpanel` | Sem problema relevante após a correção ARIA — **0** |
| 5. Prevenção de erros | Validação de senha, confirmação de senha, campos rotulados e bloqueio de cadastro inválido | Sem problema relevante observado no acesso — **0** |
| 6. Reconhecimento em vez de memorização | Campos têm labels, autocomplete, placeholders, navegação nomeada e filtros visíveis | Sem problema relevante observado — **0** |
| 7. Flexibilidade e eficiência | Há filtros, busca, onboarding e navegação por áreas | A eficiência das jornadas de guia, quiz e check-in não foi confirmada sem backend — **2, pendente de validação** |
| 8. Estética e design minimalista | Login é focado; Home concentra guia, pontos, descarte, desafios, pesquisa e administração | Densidade potencialmente alta na Home para usuários iniciantes — **2, requer validação com a tela autenticada** |
| 9. Reconhecimento, diagnóstico e recuperação de erros | `role=alert`, mensagens de erro, botão “Tentar novamente” e estados vazios estão presentes | Sem problema relevante nas telas públicas — **0** |
| 10. Ajuda e documentação | Textos de apoio, dicas e onboarding explicam conceitos principais | Falta confirmar ajuda contextual para falhas de upload e integração — **1, pendente de jornada real** |

Resultado heurístico: nenhuma falha crítica foi identificada nas telas públicas. Os itens de gravidade 1–2 são pontos de validação das jornadas autenticadas, não evidências de falha reproduzida.

## 3. Acessibilidade, desempenho e latência

### Axe / WCAG 2.2

Auditoria com `axe-core` usando tags `wcag22a`, `wcag21aa` e `best-practice`, viewport 1280×800, DPR 1, nas telas `/login`, `/confirmar-email` e `/redefinir-senha`.

| Tela | Violações | Passes | Incompletos |
|---|---:|---:|---:|
| `/login` | **0** | 15 | 0 |
| `/confirmar-email` | **0** | 11 | 0 |
| `/redefinir-senha` | **0** | 11 | 0 |

Foi corrigido o uso inválido de `role="tabpanel"` diretamente no `<form>`, passando o painel para um contêiner semântico. Também foram corrigidos contrastes do subtítulo, tab inativo e rodapé, e removida a restrição `maximum-scale=1` do viewport.

### Lighthouse

| Métrica | Resultado final |
|---|---:|
| Performance | **92/100** |
| Accessibility | **100/100** |
| Best Practices | **100/100** |
| SEO | **92/100** |
| FCP | **2,5 s** |
| LCP | **2,9 s** |
| CLS | **0** |
| TBT | **0 ms** |
| INP | Não disponível no Lighthouse de laboratório; requer dados de campo ou interação instrumentada |

A meta de latência abaixo de 3 s foi atingida para o LCP da tela de login no cenário documentado: **2,9 s** com Moto G Power (2022) em rede simulada RTT 150 ms / 1,474 Mbps. Isso não comprova todas as telas autenticadas nem uma medição de campo de INP.

### Code splitting e ativos

Antes do ajuste, o build gerava um único chunk JavaScript principal de **790,16 kB** (**224,78 kB gzip**) e o Lighthouse apontou LCP variável, chegando a 5,7 s em uma execução.

Depois do ajuste, as páginas passaram a ser carregadas com `React.lazy`/`Suspense`: o maior chunk comum ficou em **281,97 kB** (**91,68 kB gzip**), com `Login` em **20,83 kB** (**7,31 kB gzip**) e `Home` em chunk separado de **301,40 kB** (**78,11 kB gzip**). O logo usado no login também foi reduzido de PNG 1254×1254 com **606 kB** para WebP 256×256 com **19 kB**. O LCP final ficou em **2,9 s**.

## Artefatos

- `reports/playwright.json`: resultado JSON dos testes Playwright.
- `reports/lighthouse-login-final-final.json`: relatório Lighthouse final.
- `reports/axe-public.json`: relatório axe das três telas públicas.
- `dist/`: build de produção após code splitting e otimizações.

## Pendência para fechar a avaliação ponta a ponta

Executar novamente em homologação com API, Envoy, PostgreSQL, Redis, storage e contas de teste válidas. Só então devem ser adicionados/rodados os cenários reais de guia, pontos, quiz com pontuação e check-in com foto, além de repetir Lighthouse/axe na Home autenticada e medir INP com interação real.
