# Lixo Certo — frontend estático

Frontend React/Vite do TCC II Lixo Certo. A autenticação é própria da API gRPC: cadastro, login, renovação e logout usam `ServicoAutenticacao`; as chamadas do painel usam gRPC-Web pelo gateway Envoy.

Consulte [docs/AUTENTICACAO_LOCAL.md](docs/AUTENTICACAO_LOCAL.md) para o fluxo completo e os limites atuais do contrato.

## Desenvolvimento

```powershell
pnpm install
pnpm dev
```

No Docker, o frontend usa `VITE_API_BASE_URL=/api/rpc`. Fora do Docker, aponte para `http://127.0.0.1:8080`.
