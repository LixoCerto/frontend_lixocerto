# Tarefas — Webapp Lixo Certo

## Concluído nesta versão

- [x] Implementar tela de login com Manus OAuth.
- [x] Preservar o callback oficial `/api/oauth/callback` com nonce anti-CSRF.
- [x] Criar o endpoint protegido `auth.access` para sessão autenticada.
- [x] Persistir os níveis `user`, `pesquisador`, `revisor` e `admin` no banco do webapp.
- [x] Traduzir níveis persistidos para papéis de layout: usuário, pesquisador, revisor e administrador.
- [x] Carregar navegação e áreas conforme permissões retornadas pelo backend.
- [x] Remover o seletor de perfil demonstrativo como fonte de autorização.
- [x] Adicionar logout funcional e exibição da identidade autenticada.
- [x] Validar login em desktop e mobile.

## Evidências de validação

| Verificação | Resultado |
|---|---|
| `pnpm check` | Aprovado |
| `pnpm test` | 18 testes aprovados |
| `pnpm build` | Aprovado |
| Migration `0002_secret_maria_hill.sql` | Aplicada com sucesso |
| Teste `auth.access` | 4 níveis persistidos verificados |
| Tela `/login` desktop | Identidade, CTA e política visíveis |
| Tela `/login` mobile | Layout, CTA e legibilidade aprovados |
| Sessão autenticada de preview | Administrador e 11 permissões carregados |

## Modelo de autorização

O login usa o fluxo Manus OAuth já existente no WebDev. Após o callback, o backend cria a sessão, sincroniza o usuário e o procedimento protegido `auth.access` traduz o papel persistido em permissões de navegação. A interface usa essas permissões somente para composição do layout; operações sensíveis continuam devendo ser autorizadas pela API/backend.

## Próximos passos

- Sincronizar os papéis do banco do webapp com o serviço de identidade da API Lixo Certo quando o endpoint gRPC protegido estiver publicado.
- Criar uma tela administrativa para atribuição e revogação de papéis, com auditoria.
- Adicionar testes E2E do fluxo completo OAuth, logout e bloqueio de áreas sem permissão.
- Fazer code splitting do bundle principal, que atualmente gera apenas um aviso acima de 500 kB após minificação.
