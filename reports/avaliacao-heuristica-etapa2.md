# Avaliação heurística — Etapa 2 (estado pós-correções)

**Data:** 30/10/2026. **Escopo:** versão de trabalho inspecionada, baseada nos SHAs indicados em `reports/etapa2-evidencias/rastreabilidade.md` e acrescida das mudanças locais da etapa.

## Método e limites

Foram conduzidas dez inspeções independentes, uma por heurística de Nielsen, com base em código atual e capturas das jornadas. A escala é 0–4: 0 = sem achado; 1 = cosmético; 2 = menor; 3 = maior; 4 = catastrófico. “Presente” designa problema que permanece no estado inspecionado; “parcialmente mitigado” indica proteção ou evidência favorável que não elimina o problema. A inspeção é formativa, assistida por agentes, e não equivale a avaliação com participantes nem a auditoria exaustiva de todas as telas e estados.

## Síntese quantitativa

| Heurística | Achados | Sev. 1 | Sev. 2 | Sev. 3 | Sev. 4 | Presentes | Parcialmente mitigados |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1. Visibilidade do estado do sistema | 3 | 0 | 3 | 0 | 0 | 2 | 1 |
| 2. Correspondência com o mundo real | 3 | 0 | 2 | 1 | 0 | 1 | 2 |
| 3. Controle e liberdade | 6 | 0 | 6 | 0 | 0 | 3 | 3 |
| 4. Consistência e padrões | 3 | 1 | 2 | 0 | 0 | 2 | 1 |
| 5. Prevenção de erros | 7 | 0 | 7 | 0 | 0 | 5 | 2 |
| 6. Reconhecimento em vez de memorização | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| 7. Flexibilidade e eficiência | 2 | 0 | 2 | 0 | 0 | 1 | 1 |
| 8. Estética e design minimalista | 2 | 0 | 2 | 0 | 0 | 0 | 2 |
| 9. Diagnóstico e recuperação de erros | 3 | 0 | 1 | 2 | 0 | 1 | 2 |
| 10. Ajuda e documentação | 2 | 0 | 2 | 0 | 0 | 1 | 1 |
| **Total** | **32** | **1** | **28** | **3** | **0** | **16** | **16** |

## Achados de maior prioridade

Os três achados de severidade 3 são: (1) o Guia usa roxo para resíduos perigosos, embora a convenção brasileira de cores associe roxo a resíduos radioativos e laranja a resíduos perigosos; (2) uma resposta de quiz sem confirmação semântica de registro pode ser apresentada como registrada e remover a questão; e (3) uma mutação aceita pelo servidor pode ser comunicada como falha quando a atualização subsequente da lista falha. Não houve achado de severidade 4.

| Heurística | Evidência residual principal |
|---|---|
| 1. Visibilidade do estado | Ações administrativas do quiz não mostram pendência; falha ao atualizar uma lista pode se confundir com falha da mutação; falha parcial de desafios pode parecer lista vazia. |
| 2. Mundo real | Mapeamento cromático de resíduos perigosos; ressalva municipal do Guia pouco saliente; “Verificado” pode sugerir validação mais ampla que a revisão cadastral. |
| 3. Controle e liberdade | Onboarding adiado sem retomada clara; saída indireta de missão; perda silenciosa de formulário; GPS de cadastro sem cancelamento; ausência de desfazer/reabrir em exclusão e revisão. |
| 4. Consistência | Filtros aplicados de modos diferentes; salvamento de ponto não segue o mesmo feedback de processamento do quiz; reticências inconsistentes. |
| 5. Prevenção de erros | Ponto selecionado pode ficar obsoleto após troca de cidade; validade do check-in não é bloqueada no cliente; observação pode ser reaproveitada; falta trava de salvamento; coordenadas aceitam valores fora de faixa sem validação suficiente no serviço; arquivo rejeitado pode divergir do arquivo enviado; senha vazia ainda chega à autenticação. |
| 6. Reconhecimento | Após responder ao quiz, o feedback conserva pontuação e explicação, mas não o enunciado e as alternativas que originaram o resultado. |
| 7. Flexibilidade | Sugestões de busca preenchem o campo, mas não executam a consulta; adiamento do onboarding não persiste uma dispensa. |
| 8. Minimalismo | Grades deixam áreas vazias com um único resultado; instruções longas do Guia podem empurrar ações para baixo. |
| 9. Recuperação | Resposta semanticamente indisponível do quiz pode ser contada como registrada; falha de recarga após mutação produz mensagem ambígua; algumas listas não oferecem retry dedicado nem marcam dados antigos. |
| 10. Ajuda | A promessa de retomar missões não corresponde ao controle após adiamento; ajuda geral é organizada por área, sem busca ou ancoragem na tarefa exata. |

## Evidências positivas

As jornadas mostram feedback explícito de resultado e pontuação do quiz, estado “Em revisão” após o envio do descarte, mensagem acionável de geofence, confirmação da categoria da foto sintética e indicação local da fonte/precisão do ponto. O check-in permite cancelar a espera do GPS e oferece estados de erro com instruções. Busca rotulada, categorias, instruções e detalhes/fontes progressivamente revelados foram observados em telas específicas.

## Limitações

Os achados derivam de inspeção estática e capturas de estados selecionados. Não foram observados todos os fluxos administrativos, falhas de rede, expiração real do GPS, tamanhos de tela ou estados do onboarding. Não houve participantes, medição de frequência/tempo de erro, inspeção física de ponto, teste em aparelho real ou auditoria completa da API. A severidade expressa prioridade inferida, não risco quantificado em campo. A indicação de precisão do pin está na versão local avaliada; não há evidência de publicação dessa mudança visual na homologação.

## Recomendações

Priorizar a correção do significado das cores de descarte, a separação entre confirmação de mutação e falha de atualização, e um estado explícito no contrato do quiz para resposta registrada/indisponível. Em seguida, tratar estados locais obsoletos, impedir submissões repetidas, permitir retomar onboarding e preservar o contexto da resposta do quiz. Repetir a inspeção após as correções e validar as tarefas com participantes antes de afirmar melhora de usabilidade.
