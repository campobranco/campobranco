# Arquitetura do Sistema: Campo Branco

Este documento detalha a infraestrutura e a arquitetura técnica do projeto Campo Branco, servindo como guia para desenvolvedores e administradores do sistema.

## 1. Visão Geral da Infraestrutura

O sistema utiliza uma arquitetura híbrida baseada no **Google Cloud Platform (GCP)** e no **Firebase**, otimizada para performance (SSR), baixo custo e facilidade de deploy.

```mermaid
graph TD
    User([Usuário]) --> FH["Firebase Hosting"]
    FH --> DB[(Firestore Database)]
    FH --> Auth[Firebase Authentication]
```

## 2. Estratégia de Ambientes e CI/CD

O sistema utiliza **GitHub Actions** para automação de deploy, segregando as instâncias por branch:

| Ambiente | Branch | URL Hosting | Projeto Firebase | Banco (Firestore) |
| :--- | :--- | :--- | :--- | :--- |
| **Local** | N/A | `localhost:3000` | `campobrancodev` | `campobrancodev` (Test) |
| **Staging** | `dev` | `campobrancodev.web.app` | `campobrancodev` | `campo-branco` (Prod) |
| **Produção** | `main` | `campo-branco.web.app` | `campo-branco` | `campo-branco` (Prod) |

### 2.1 Workflows
*   `staging.yml`: Disparado ao fazer push na branch `dev`. Realiza build com chaves de produção e deploy no ambiente de teste.
*   `production.yml`: Disparado ao fazer push na branch `main`. Realiza build e deploy completos em produção.

## 3. Segurança (CSP)

A segurança é reforçada em duas camadas:
1.  **`firebase.json`**: Cabeçalhos aplicados em nível de rede.
2.  **`middleware.ts`**: Cabeçalhos injetados dinamicamente pelo Next.js.

**Diretivas Principais:**
*   `script-src`: Permite Google APIs, Firebase e Leaflet (`unpkg.com`). Adicionado `blob:` para Service Worker.
*   `img-src`: Permite mapas (OpenStreetMap, CartoDB), Storage do Firebase e `blob:`.
*   `frame-src`: Necessário para o fluxo de login do Firebase.
*   `connect-src`: Inclui analytics e recursos dinâmicos do Leaflet/CartoDB.

## 4. Banco de Dados e Autenticação

*   **Firestore:** Banco NoSQL centralizado no banco `(default)`.
*   **Auth:** Utiliza Firebase Auth com suporte a domínios personalizados via proxy.

## 5. Estrutura do Banco de Dados (Padrão Híbrido)

Para garantir compatibilidade com os dados originais e facilitar a leitura programática, o projeto utiliza um **Padrão Híbrido** de nomenclatura:

- **COLEÇÕES (Coletores):** Utilizam `snake_case` (letras minúsculas com underscore).
    - Exemplos: `shared_lists`, `witnessing_points`, `bug_reports`, `territory_addresses`.
- **CAMPOS (Atributos):** Utilizam `camelCase` (padrão JavaScript).
    - Exemplos: `congregationId`, `assignedTo`, `createdAt`, `updatedAt`, `visitStatus`.

> [!IMPORTANT]
> A partir da versão **v0.8.31-beta**, a migração de todos os campos legados para `camelCase` foi concluída. O código agora é limpo e não possui mais suporte a fallbacks `snake_case`. Qualquer nova implementação deve seguir estritamente o padrão camelCase para campos.

### 5.1 Estratégia de Resiliência (Legacy Support - REMOVIDO)
> [!NOTE]
> O suporte a campos legados em `snake_case` (ex: `congregation_id`) foi removido em favor de um código mais limpo e performático, após a migração bem-sucedida de todos os documentos no Firestore.

## 6. Manutenção e Deploy

### Comandos Úteis
*   `firebase deploy`: Realiza o deploy completo (Hosting + Rules).
*   `npm run rules:dev`: Deploy das regras no ambiente de desenvolvimento.
*   `npm run build`: Gera a versão estática do app.

---
> [!IMPORTANT]
> O projeto é 100% configurável via variáveis de ambiente. Verifique o arquivo `env.example` para as chaves necessárias.

## 7. Migração para Plano Spark (Mar/2026)

Para eliminar custos e dependência de cartão de crédito, o sistema utiliza uma arquitetura **Static-First** compatível com o plano gratuito (Spark) do Firebase.

### 🔄 Mudanças Principais:
- **Zero Trust Security:** A segurança foi movida inteiramente para o **Firestore Security Rules**, validando permissões diretamente no banco de dados.
- **Client-Side Logic:** Toda a lógica foi migrada para serviços de cliente (`lib/services/**`) utilizando o Firebase Client SDK.

## 8. Instalação e Primeiro Acesso (Zero Configuration Admin)

*   **Master Admin**: O primeiro acesso administrativo é definido pela variável `NEXT_PUBLIC_MASTER_EMAIL`.
*   **Promoção Automática**: Se o usuário logado corresponder a este e-mail, o `AuthContext` cria ou atualiza o perfil Firestore com o papel `ADMIN` automaticamente.

---
### 📝 Registro de Melhorias Recentes:
- **v0.8.37-beta**: **Personalização de Histórico e Relatórios**. (20/03/2026)
  - **Identidade**: Implementada resolução automática de nomes de usuários no Histórico de Território e Registro de Designação (PDF), eliminando o texto genérico "Usuário".
  - **Refinamento**: Adicionado filtro inteligente para evitar que o nome do território (utilizado como título de link) seja exibido indevidamente como nome do responsável no relatório.
  - **Correção de Dados**: Aplicado parsing robusto de data (`parseDate`) no Registro de Designação, corrigindo o erro de relatório vazio causado por objetos `Timestamp` do Firestore.
- **v0.8.36-beta**: **Compatibilidade de Tipos Firestore**. (20/03/2026)
  - **Relatórios**: Implementada função `parseDate` para suportar objetos `Timestamp` e objetos `seconds/nanoseconds` do Firebase, corrigindo indicadores de Giro e Cobertura.
  - **UX**: Alterada a exibição de "0" para "-" quando não houver histórico de giro suficiente, evitando confusão.
- **v0.8.35-beta**: **Resiliência de Dados e Limpeza UTF-8**. (20/03/2026)
  - **Relatórios**: Corrigido erro de `NaN` no card de Giro (Dias) através de validação de datas no processamento de histórico.
  - **Interface**: Limpeza em massa de caracteres UTF-8 corrompidos (`âš ï¸ ` e `â€¢`) na página de administração de congregações.
- **v0.8.34-beta**: **Área Administrativa e Estabilidade**. (20/03/2026)
  - **Administração**: Padronizados os menus de Congregações (`admin/congregations`) e Membros (`admin/users`) com o componente `DropDownItem`.
  - **Correção Crítica**: Resolvido erro de sintaxe JSX em `my-maps/address/page.tsx` que impedia a renderização da página.
  - **UX Administrativa**: Adicionado suporte a fechamento interativo em todos os menus administrativos.
- **v0.8.33-beta**: **Padronização Visual Completa e Witnessing UX**. (20/03/2026)
  - **Witnessing Points**: Padronizados os menus de pontos de testemunho em `witnessing/city/page.tsx` com `DropDownItem`.
  - **Tabela de Territórios**: Implementada a padronização de menus na visualização em lista/tabela de endereços dentro de `my-maps/territory/page.tsx`.
  - **Resiliência de Menus**: Adicionado fundo interativo (`fixed inset-0`) em todos os menus padronizados para garantir o fechamento ao clicar fora, melhorando a experiência em dispositivos móveis.
- **v0.8.32-beta**: **Padronização Visual de Menus e UX do Dashboard**. (20/03/2026)
  - **Identidade Visual**: Implementado o componente `DropDownItem` em todo o sistema para menus de contexto, folders e ações de endereço, garantindo uma estética premium com ícones circulares e cores variantes.
  - **Dashboard UX**: Corrigida a exibição de cartões concluídos para mostrar a data de conclusão ("Fim: [data]") em vez do contador de expiração.
  - **Consistência**: Padronizados os menus em `SharedListView`, `AddressActionsMenu`, `CityPage`, `TerritoryPage`, `AddressPage` e `DashboardCards`.
  - **Limpeza de Legado**: Removidos redirecionamento de host legado e fallback de convite /invite antigo; migracao automatica de `currentPublishers` para `activeUsers` nos pontos de testemunho.
- **v0.8.31-beta**: **Migração Completa para camelCase e Limpeza de Código**.
  - **Fim do Legado**: Removido todo o suporte a campos `snake_case` no frontend (fallbacks e queries `or`).
  - **Data Migration**: Executado script de migração para converter todos os documentos existentes para o padrão `camelCase`.
  - **Simplificação**: Queries do Firestore agora são mais eficientes, utilizando filtros diretos em vez de operadores `or` complexos.
  - **AuthContext**: Removida detecção de congregação via `congregation_id`.
- **v0.8.30-beta**: **Resiliência de Dados e Feedback Visual**.
  - **Urgência**: Corrigido o sumiço dos cartões no Dashboard devido a inconsistências de `snake_case` vs `camelCase` no banco.
  - **Auth Resilience**: `AuthContext` agora detecta a congregação mesmo se o campo for `congregation_id`.
  - **Queries**: Implementado `or()` em todas as queries do Dashboard para suportar campos legados.
  - **UX**: Adicionada mensagem "Nenhum cartão encontrado" quando a lista está vazia, evitando quadros brancos.
  - **SharedView**: Aplicada a mesma lógica de resiliência nos links compartilhados.
- **v0.8.29-beta**: **Reversão Final para Padrão Híbrido**.
  - **Decisão Arquitetural**: Restaurada a estrutura original do banco de dados: Coleções em `snake_case` e Campos em `camelCase`.
  - Reversão de todas as mudanças que tentaram forçar `snake_case` nos campos (ex: `congregation_id` -> `congregationId`).
  - Atualização das `firestore.rules` para realizar o `data.get()` em `camelCase`, corrigindo o erro de permissão que impedia a visualização do Dashboard.
  - Sincronização de todos os serviços (`lib/services/`) para garantir que as queries batam com o esquema real do banco.
  - Limpagem técnica de `ARQUITETURA.md` removendo seções duplicadas.
- **v0.8.14-beta**: Padronização anterior de interface e status de visitas.
- **v0.7.42-beta**: Acesso Público total para links compartilhados.
