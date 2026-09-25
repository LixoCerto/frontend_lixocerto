# Autenticação e ciclo de conta

## Princípio de segurança

O Lixo Certo é um frontend estático. Portanto, **não implementa formulários próprios que coletem ou transmitam senhas**. O ciclo de identidade é delegado ao Keycloak por OpenID Connect com Authorization Code e PKCE:

1. O frontend cria `state`, `nonce` e o desafio PKCE com `oidc-client-ts`.
2. O navegador é redirecionado ao Keycloak.
3. O Keycloak executa login, cadastro, verificação de e-mail, recuperação/alteração de senha ou login social.
4. O navegador retorna para `/callback`; o frontend valida a resposta OIDC e usa apenas o access token para gRPC-Web.

> O frontend não contém Client Secret, senha inicial ou token fixo. Variáveis `VITE_*` são públicas por definição.

## Fluxos disponíveis

| Ação na tela | Destino seguro | Resultado esperado |
|---|---|---|
| **Entrar com e-mail e senha** | Endpoint OIDC de autorização | Sessão Authorization Code + PKCE |
| **Criar conta** | Endpoint nativo `registrations` do Keycloak | Usuário cadastrado, com verificação de e-mail habilitada |
| **Esqueci minha senha** | Endpoint nativo `login-actions/reset-credentials` | Link de redefinição enviado pelo SMTP configurado no Keycloak |
| **Alterar senha com segurança** | Ação iniciada pela aplicação `kc_action=UPDATE_PASSWORD` | Keycloak exige autenticação e atualiza a credencial fora do React |
| **Entrar com Google** | Identity Provider `google` do Keycloak | Disponível apenas após configuração local explícita do provedor |

A criação das URLs de cadastro e recuperação preserva `state`, `nonce`, `redirect_uri` e PKCE previamente gerados pela biblioteca OIDC. Há teste unitário para essa propriedade em `client/src/lib/fluxos-identidade.test.ts`.

## Ambiente local

A infraestrutura fornece o Keycloak em `http://localhost:8081` e Mailpit em `http://localhost:8025`. Mailpit captura e-mails de desenvolvimento; não envia mensagens externas.

Execute, a partir de `infra_lixocerto`:

```powershell
.\scripts\iniciar.ps1 -Aplicacao
```

Se o realm já existia antes da adição de verificação de e-mail ou do tema, recrie **somente** o volume local do Keycloak:

```powershell
.\scripts\resetar-keycloak-local.ps1 -Confirmar
.\scripts\iniciar.ps1 -Aplicacao
```

O reset não remove Redis, não executa migrations e não toca no PostgreSQL externo.

## Google OAuth

A opção Google fica desabilitada até a configuração de um OAuth Client real no Google Cloud. Não insira segredo no `.env`, em variáveis `VITE_*`, Git ou conversa.

1. Crie um OAuth Client do tipo **Web application** no Google Cloud.
2. Adicione como URI de redirecionamento autorizado o valor mostrado pelo Keycloak para o provedor `google`. No ambiente local ele será:
   `http://localhost:8081/realms/lixo-certo/broker/google/endpoint`.
3. No PowerShell, execute o configurador usando o Client ID e um `SecureString` para o Client Secret:

```powershell
$segredoGoogle = Read-Host 'Client Secret Google' -AsSecureString
.\scripts\configurar-google-keycloak.ps1 -ClientId 'SEU_CLIENT_ID.apps.googleusercontent.com' -ClientSecret $segredoGoogle
```

O script envia o segredo diretamente à API administrativa do Keycloak em memória, atualiza o provedor `google` e apenas marca `VITE_OIDC_GOOGLE_ENABLED=true` no ambiente local. Ele não persiste o segredo no arquivo `.env` nem o imprime.

## Produção

Para produção, use HTTPS, um servidor SMTP real, domínio público, URIs de redirecionamento específicas, tema revisado e contas de serviço/credenciais guardadas em secret manager. O Mailpit, o Keycloak `start-dev`, o Direct Grant do cliente de Postman e o fallback local de e-mail não são componentes de produção.
