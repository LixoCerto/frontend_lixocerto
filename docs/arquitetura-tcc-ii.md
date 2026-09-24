# Arquitetura — Lixo Certo (TCC II)

## Objetivo do produto

O **Lixo Certo** é um webapp responsivo destinado à educação ambiental sobre descarte de resíduos sólidos e eletroeletrônicos. A plataforma reúne guia de descarte, pontos de coleta, questionários, gamificação, indicadores agregados e avaliação de usabilidade.

## Visão arquitetural

```text
Navegador (React + TypeScript + OIDC/PKCE)
        │
        │ arquivos estáticos + gRPC-Web / Protocol Buffers
        ▼
Nginx → Envoy gRPC-Web
        │
        ▼
API NestJS gRPC
        ├── Autenticação OIDC/JWT e autorização por permissão
        ├── Serviços de domínio do Lixo Certo
        ├── PostgreSQL externo via Sequelize
        └── Redis gerenciado pelo projeto de infraestrutura
```

O frontend é estático e não possui backend próprio. O Envoy converte chamadas gRPC-Web para gRPC/HTTP2, permitindo que o navegador consuma a API independente com contratos tipados.

## Projetos

| Projeto | Responsabilidade |
|---|---|
| `frontend_lixocerto` | Interface React/Vite, OIDC/PKCE e cliente gRPC-Web |
| `api_lixocerto` | API NestJS, contratos, autenticação, autorização e persistência |
| `infra_lixocerto` | Dockerfiles, Compose, Envoy, Redis e operação local |

## Contratos RPC

Os contratos Protobuf são mantidos na API e gerados no frontend com Buf. Os serviços atuais incluem autenticação, identidade, materiais, pontos de coleta, questionários, gamificação, avaliação SUS, perfil, sessões, administração, auditoria e saúde.

A API é responsável por retornar identidade, papéis e permissões. O frontend usa esses dados para compor o layout por nível, mas a autorização efetiva permanece no backend em cada chamada protegida.

## Persistência e pesquisa

O PostgreSQL externo mantém materiais, pontos de coleta, questões, alternativas, tentativas, progresso, sessões, auditoria e respostas da avaliação SUS conforme as migrations da API. Dados de participantes devem ser tratados com consentimento, pseudonimização e resultados agregados.

A SUS avalia percepção de usabilidade; um escore SUS não comprova, sozinho, aprendizagem ou mudança de comportamento ambiental. O texto acadêmico deve interpretar cada instrumento dentro de sua finalidade metodológica.

## Segurança

O login usa Authorization Code com PKCE, sem `client_secret` no navegador. O token é enviado como `Authorization: Bearer`. A API valida emissor, audiência, assinatura, expiração, papel e permissão. O frontend não armazena senhas, não acessa o PostgreSQL e não possui `DATABASE_URL`.

## Validação técnica

A versão estática foi validada com geração dos contratos, verificação TypeScript, testes da matriz de permissões, build Vite e preview local dos arquivos estáticos. A validação integrada final depende da configuração real do provedor OIDC e da execução do Compose no Windows com o PostgreSQL externo.
