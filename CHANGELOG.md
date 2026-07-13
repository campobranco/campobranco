## 0.9.68-beta - 2026-07-13

- **Segurança**: Implementação de isolamento multi-tenant robusto, bloqueio de autopromoção de privilégios de usuários e atualização do Next.js para mitigar vulnerabilidades críticas (CVEs).
- **Correções em Dashboard & Convites**: 
  - Ajustada query restrita de usuários em `VisitsHistory` para evitar erros de permissão.
  - Correção de vulnerabilidade de auto-transferência de congregação em links de convite com exibição de erro amigável.
  - Ajuste de payload dinâmico para criação vs atualização em convites respeitando as regras do Firestore.
  - Remoção do campo `role` no payload do `setDoc` para evitar conflito com as regras de escrita do Firestore.
- **Autenticação**: Redirecionamento correto de usuários não autenticados para a página de login no componente `AuthReadyGate`.
- **Testes & CI/CD**:
  - Correção de caminhos e resolução de escopo ESM no `playwright.config.ts`.
  - Configuração do ambiente E2E/Playwright e integração de variáveis de ambiente com dotenv rodando sob o emulador do Firebase.
  - Correção de deprecations no Jest e renomeação de arquivos de configuração de testes para suporte a módulos nativos (ESM).
- **Infraestrutura**: Atualização e sincronização de dependências críticas (`emnapi`, etc.) para sanar conflitos de versionamento no lockfile.

## 0.9.43-beta - 2026-06-18

- Security hardening: isolated collections by `congregationId` in Firestore rules.
- Removed hardcoded admin backdoor email.
- Restricted public reads on sensitive collections.
- Added `sanitizeUrl` helper to block dangerous URL protocols.
- Updated update rule syntax for `users` collection.
- Bumped package version to `0.9.43-beta`.
