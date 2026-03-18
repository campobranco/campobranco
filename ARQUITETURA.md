# Arquitetura do Sistema: Campo Branco

Este documento detalha a infraestrutura e a arquitetura técnica do projeto Campo Branco, servindo como guia para desenvolvedores e administradores do sistema.

## 1. Visão Geral da Infraestrutura

O sistema utiliza uma arquitetura híbrida baseada no **Google Cloud Platform (GCP)** e no **Firebase**, otimizada para performance (SSR), baixo custo e facilidade de deploy.

### 🌐 Fluxo de Requisição (Proxy Bridge)

Devido às limitações de URL personalizada do Firebase App Hosting, implementamos um proxy intermediário para manter a URL gratuita `.web.app` invisível para o usuário.

```mermaid
graph TD
    User([Usuário]) --> FH["Firebase Hosting (campo-branco.web.app)"]
    FH -- Rewrite --> CR["Cloud Run (cb-proxy)"]
    CR -- Forward --> AH["Firebase App Hosting (Next.js App)"]
    AH --> DB[(Firestore Database)]
    AH --> Auth[Firebase Authentication]
```

## 2. Componentes da Solução

### 2.1 Firebase Hosting (Frontend Roteador)
*   **Papel:** Porta de entrada e gestão de domínios.
*   **Configuração (`firebase.json`):** Contém regras de `rewrites` que direcionam todo o tráfego (`**`) para o serviço `cb-proxy`.
*   **CSP:** Define políticas de segurança rígidas para mitigar ataques XSS.

### 2.2 Cloud Run Proxy (`proxy-server`)
*   **Tecnologia:** Node.js + Express + `http-proxy-middleware`.
*   **Função:** Recebe requisições do Hosting e as encaminha para a URL interna do App Hosting.
*   **Importante:** Repassa cabeçalhos como `x-forwarded-host` para garantir que o Next.js reconheça o domínio original para fins de SEO e Autenticação.

### 2.3 Firebase App Hosting (Backend Next.js)
*   **Função:** Executa o aplicativo Next.js com suporte a Server-Side Rendering (SSR).
*   **Deploy:** Automatizado via integração com o GitHub (`campobranco/campobranco`).
*   **Configuração (`apphosting.yaml`):** Gerencia variáveis de ambiente e segredos (API Keys, Private Keys).

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

*   **Firestore:** Banco NoSQL dividido em dois ambientes (`default` para produção e `campobrancodev` para desenvolvimento).
*   **Auth:** Utiliza Firebase Auth com suporte a domínios personalizados via proxy.

## 5. Manutenção e Deploy

### Repositórios
*   **Principal:** `https://github.com/campobranco/campobranco.git` (Contém o App e o Proxy).
*   **Landing Page (Estático):** `https://github.com/campobranco/campobranco.github.io.git` (Arquivos HTML antigos movidos para cá).

### Comandos Úteis
*   `firebase deploy --only hosting`: Atualiza regras de roteamento.
*   `gcloud run deploy cb-proxy --source .`: Atualiza o servidor de proxy (dentro da pasta `proxy-server`).

### Manutenção Periódica
- **Limpeza (Mar/2026)**: Remoção de arquivos `.bak`, `.log` e arquivos de dados temporários do root para manter o repositório limpo e organizado.

---
> [!IMPORTANT]
> Sempre que houver falha no deploy com erro `invoker_iam_disabled`, verifique se o Service Account `service-[PROJECT_NUMBER]@gcp-sa-firebaseapphosting.iam.gserviceaccount.com` possui a permissão `roles/run.admin`.

## 6. Migração para Plano Spark (Mar/2026)

Para eliminar custos e dependência de cartão de crédito, o sistema foi migrado para uma arquitetura **Static-First** compatível com o plano gratuito (Spark) do Firebase.

### 🔄 Mudanças Principais:
- **Remoção do Proxy:** Cloud Run (`cb-proxy`) e Firebase App Hosting foram descontinuados.
- **Static Export (SPA Mode):** O Next.js foi configurado com `output: 'export'`, gerando um bundle 100% estático (HTML/JS/CSS) na pasta `out/`.
- **Extinção do diretório `app/api/`:** Todas as rotas de API Node.js foram removidas e substituídas por serviços diretos.
- **Client-Side Logic:** Toda a lógica de servidor (Server Actions e API Routes) foi migrada para serviços de cliente (`lib/services/**`) utilizando o Firebase Client SDK (Firestore).
- **Gerenciamento de Admin:** Funções de administração (usuários, congregações, reparo de dados) agora operam via client-side, respeitando as Firestore Security Rules.
- **Zero Trust Security:** A segurança foi movida inteiramente para o **Firestore Security Rules**, validando permissões diretamente no banco de dados, sem intermediários de servidor.
- **Consolidação de Banco:** O uso de múltiplos bancos de dados foi removido, centralizando tudo no banco `(default)`.

### 🛠️ Novas Ferramentas e Serviços:
- **`lib/services/admin.ts`**: Centraliza gestão de usuários e congregações.
- **`lib/services/export.ts`**: Geração de CSV via Blob no navegador.
- **`sw-kill.js`**: Implementado para limpeza agressiva de caches antigos de PWA/Service Worker.
- **Versionamento**: O controle de versão (`package.json`) é o gatilho para invalidação de cache.

## 7. Instalação e Primeiro Acesso (Zero Configuration Admin)

Para facilitar deploys Open Source e novas instâncias do Campo Branco:
*   **Master Admin**: O primeiro acesso administrativo é definido pela variável `NEXT_PUBLIC_MASTER_EMAIL`.
*   **Promoção Automática**: Se o usuário logado corresponder a este e-mail, o `AuthContext` cria ou atualiza o perfil Firestore com o papel `ADMIN` automaticamente.
*   **Isolamento de Ambiente**: As credenciais de desenvolvimento (`campobrancodev`) e produção (`campo-branco`) são isoladas via arquivos `.env`, garantindo que testes locais não afetem dados reais.

---
### 📝 Registro de Melhorias:
- **[Mar/2026] Isolamento de Ambiente e Privacidade**: Removido `MEASUREMENT_ID` e centralizado o "Master Email" em variáveis de ambiente, resolvendo o problema de hardcoded emails e garantindo conformidade com a política anti-rastreamento.
- **[Mar/2026] Correções de Acesso e UX**:
  - Resolução do bloqueio de autenticação do Google Sign-In via adição do header de CSP `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
  - Correção na permissão de criação e edição do próprio perfil no Firestore, corrigindo conflito e erro de **Missing or insufficient permissions**.
  - Ajuste na captura de log via `html2canvas` da imagem de avatar do Google, previnindo erro de rota 429 (Too Many Requests).
  - Remoção de obrigatoriedade do parâmetro `cityId` no serviço de estatísticas (`stats.ts`), liberando pesquisa e exibição de todos os cartões na listagem da página de cidades.
  - Mitigação de imagem de perfil (Google Avatar) corrompido no Next Export: `<Image>` alterado para `<img>` com policy `no-referrer`.
  - Correção de erro de permissão na criação de listas compartilhadas: Adicionada regra para a coleção `shared_list_snapshots` e inclusão de `congregationId` nos documentos de snapshot para validação de segurança.
  - Substituição total do componente `<Image>` do Next.js por tags `<img>` nativas em toda a aplicação (incluindo Login, Dashboard e Settings) para evitar conflitos de runtime com o construtor global `Image` do navegador.
  - Implementação de monitoramento em tempo real (`onSnapshot`) para o perfil do usuário no `AuthContext`, permitindo que alterações de papel (role) e congregação sejam refletidas instantaneamente na interface sem necessidade de recarregamento manual.
  - Suporte resiliente a múltiplos formatos de campo para congregação (`congregationId` e `congregation_id`) no carregamento de perfil, garantindo compatibilidade com diferentes estados do banco de dados Firestore.

---
> [!IMPORTANT]
> A partir da v0.6.183-beta, os arquivos `middleware.ts`, `apphosting.yaml` e a pasta `proxy-server/` tornaram-se obsoletos e devem ser removidos após validação.

