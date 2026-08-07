# Regras do Projeto — Campo Branco

## Controle de Versionamento e Push ao GitHub
- Manter todas as alterações estritamente **locais** durante as sessões de desenvolvimento.
- **NÃO** realizar `git push` para o GitHub automaticamente.
- Realizar o `git push` **somente** quando o usuário solicitar explicitamente (ex: "faça o push", "suba as alterações", "envie para a main/dev").

## Firebase Environment Isolation (Regra Absoluta)

Este repositório é configurado para operar **exclusivamente** com o projeto `campobrancodev`.

**Projeto único autorizado**:
- `campobrancodev` (mapeado para `default`, `dev` e `prod` no `.firebaserc`)

**Regra Operacional**:
1. Antes de qualquer operação Firebase, executar `npm run firebase:check`.
2. O CLI deve retornar sempre `Active Project: campobrancodev`.
3. Todos os deploys e rotinas locais usam obrigatoriamente a flag `--project campobrancodev`.
