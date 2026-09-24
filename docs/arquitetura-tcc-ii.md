# Arquitetura inicial — Lixo Certo (TCC II)

## Objetivo do produto

O **Lixo Certo** é um webapp mobile-first destinado à educação ambiental sobre descarte de resíduos sólidos e eletroeletrônicos. A primeira versão reúne um guia de descarte, um quiz gamificado, indicadores de progresso e uma base preparada para consulta de pontos de coleta e avaliação de usabilidade.

A escolha por webapp substitui o aplicativo mobile inicialmente previsto. A interface é responsiva e foi projetada para uso prioritário em smartphones, mas deve ser tratada no texto acadêmico como uma aplicação web responsiva. A aceitação dessa mudança de escopo deve ser confirmada com a orientação e a coordenação antes da entrega final.

## Visão arquitetural

```text
Navegador (React + TypeScript)
        │
        │ gRPC-Web / Protocol Buffers
        ▼
Servidor Express + Connect RPC
        │
        ├── Contratos .proto e tipos gerados
        ├── Serviços de domínio do Lixo Certo
        └── Banco de dados MySQL/TiDB via Drizzle
```

O sistema usa **Protocol Buffers** como contrato de mensagens. O servidor Connect RPC expõe os serviços usando gRPC-Web, protocolo que pode ser consumido diretamente por navegadores. A mesma definição de serviço pode ser migrada para gRPC nativo sobre HTTP/2 caso a infraestrutura final exija clientes que não sejam navegadores.[1] [2]

## Contrato RPC inicial

O contrato está em `proto/lixo_certo/v1/lixo_certo.proto`. A geração tipada usa Buf e produz os tipos compartilhados do cliente e do servidor em `shared/gen/`.

| Serviço | Finalidade | Estado do MVP |
|---|---|---|
| `GetDashboard` | Retornar saudação, pontos, sequência de dias, badges, dica diária e atalhos. | Implementado com dados demonstrativos. |
| `ListMaterials` | Consultar materiais por categoria ou termo de pesquisa. | Implementado com catálogo inicial demonstrativo. |
| `ListCollectionPoints` | Localizar pontos de coleta por cidade e tipo de material. | Contrato e retorno demonstrativo implementados; dados reais ainda dependem de validação. |
| `SubmitQuiz` | Avaliar resposta do quiz e calcular pontos concedidos. | Implementado. |
| `SubmitSusEvaluation` | Validar as dez respostas da escala SUS e calcular o escore. | Implementado sem persistir respostas de participantes. |

## Persistência prevista

O banco possui estruturas para materiais, pontos de coleta, questões, alternativas, tentativas de quiz, progresso do usuário e respostas de usabilidade. Nenhuma carga de dados de participantes foi incluída no banco.

A tabela `usability_responses` foi criada para uma etapa futura de avaliação, mas o serviço do MVP foi deliberadamente configurado para **não gravar respostas SUS**. Antes de coletar dados reais, o projeto deve definir o protocolo da pesquisa, o consentimento, o código anônimo do participante, a finalidade da coleta e a autorização institucional aplicável.

## Regras de pesquisa e de interpretação

A System Usability Scale (SUS) avalia percepção de usabilidade. Um bom escore SUS não comprova, por si só, aprendizagem ou mudança de comportamento ambiental. Assim, o TCC deve formular conclusões compatíveis com o instrumento aplicado.

Se o objetivo do estudo permanecer como avaliação da conscientização ambiental, a pesquisa deverá acrescentar uma medida específica, como questionário de conhecimento antes e depois do uso, tarefa prática de identificação de descarte ou escala de atitude. Caso a pesquisa utilize apenas SUS, o resultado deverá ser descrito como avaliação de usabilidade percebida e potencial de apoio à educação ambiental.

## Escopo do MVP entregue

O MVP atual contém uma interface web responsiva, dados carregados por gRPC-Web, catálogo pesquisável de resíduos, filtros por categoria, painel de impacto, quiz com retorno imediato e contrato para consulta de pontos de coleta e cálculo de SUS. O ponto de coleta retornado atualmente é identificado como demonstrativo e **não deve ser apresentado como dado real no trabalho acadêmico**.

As próximas etapas devem substituir os dados demonstrativos por fontes verificadas, conectar a autenticação ao progresso individual, cadastrar questões revisadas por fonte confiável, validar pontos de coleta de João Pessoa e executar testes de usabilidade somente após a formalização do protocolo de pesquisa.

## Validação técnica executada

Foram executados a verificação estática de tipos, os testes automatizados e o build de produção. Os testes cobrem painel, filtros de materiais, ponto de coleta demonstrativo, quiz, cálculo de SUS com consentimento e rejeição sem consentimento. O banco foi migrado com as tabelas necessárias ao MVP.

## Referências

[1]: https://connectrpc.com/docs/introduction/ "Connect RPC — Introduction"
[2]: https://connectrpc.com/docs/node/server-plugins/ "Connect RPC — Server plugins for Node.js"
