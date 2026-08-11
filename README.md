# Campo Branco

[![Secured by GitGuard](https://img.shields.io/badge/Secured%20by-GitGuard-success?style=flat-square)](https://www.gitguard.com.br/paulojacomelli)

O **Campo Branco** é uma aplicação web moderna e progressiva (PWA) desenvolvida para digitalizar e otimizar a gestão de territórios, visitas e testemunho público para congregações locais. Focada em usabilidade, privacidade (LGPD), performance e resiliência lógica, a aplicação serve desde a administração central da congregação até o uso diário pelos publicadores no campo.

> 🚀 Construído com **Vibe Coding Google Antigravity**

---

### ⚠️ Aviso Importante

Este aplicativo é uma iniciativa **independente e open source**. Ele **não** é uma ferramenta oficial da organização religiosa das Testemunhas de Jeová, embora seja projetado especificamente para ser útil e compatível com as atividades locais das congregações.

---

## ✨ Funcionalidades Principais

### 🗺️ Gestão de Territórios
- **Mapas Interativos:** Visualização clara de territórios com indicadores de status integrados com Leaflet/OpenStreetMap.
- **Cartões Digitais:** Compartilhamento seguro de territórios via links únicos (sem necessidade de login para visualização básica dos publicadores).
- **Geocodificação:** Integração com APIs de mapas para localização precisa.
- **Histórico:** Registro detalhado de designações, conclusões e devoluções.

### 🔒 Privacidade e Segurança (LGPD)
- **Compliance LGPD:** Estrutura desenvolvida com foco na Lei Geral de Proteção de Dados.
- **Definição de Papéis:** Clara distinção de responsabilidade legal entre o Operador (o software/administrador) e o Controlador (a congregação local).
- **Minimização de Dados:** Coleta e tratamento estrito apenas das informações necessárias para as atividades pastorais.

### 👥 Controle de Acesso Baseado em Papéis (RBAC)
Lógica de permissões modularizada e testável puramente via [rbac.ts](file:///C:/Users/design/Desktop/dev/campobranco/lib/rbac.ts):
- **Admin:** Gestão global do sistema e de congregações.
- **Anciãos:** Gestão de territórios, membros e campanhas.
- **Servos:** Manutenção e distribuição.
- **Publicadores:** Acesso restrito aos seus próprios territórios.

### 📱 Experiência Mobile (PWA)
- **Instalável:** Funciona como app nativo em Android e iOS.
- **Offline First:** Funcionalidades essenciais disponíveis mesmo sem conexão ativa à internet.
- **Dark Mode:** Tema escuro nativo e fluido.

---

## 🏗️ Arquitetura e Engenharia de Software

O projeto adota uma arquitetura robusta pensada para tolerância a falhas, concorrência e consistência de dados:

```
[ UI Componentes (React 19) ]
             │
             ▼ (Uso Obrigatório para Escritas)
[ Mutation Layer / Contratos ]
             │
             ▼ (Integridade e Domínio Puro)
[ Domain Layer / Regras ] ◄──► [ Jest Unit Tests ]
             │
             ▼ (Transações e Concorrência)
[ Services ] ◄───────────────► [ Firestore / Emulator ]
```

### 🚫 Regras Críticas de Desenvolvimento:
1. **Zero UI Direct Writes:** A UI nunca acessa escritas no Firestore diretamente (`updateDoc`, `deleteDoc`, `setDoc`). Toda mutação deve passar por `lib/contracts/mutations/` de forma transacional.
2. **Camada de Domínio Pura:** As lógicas puras de negócio (como transições de estado de territórios ou regras de concorrência) residem isoladas em [territoryRules.ts](file:///C:/Users/design/Desktop/dev/campobranco/lib/domain/territoryRules.ts), desacopladas do Firebase e testadas via Jest.
3. **Padrão Híbrido de Banco de Dados:** Coleções usam `snake_case` e os atributos/campos usam estritamente `camelCase` (migração concluída na v0.8.31-beta).
4. **Desnormalização no Cliente:** Contadores de estatísticas de territórios e endereços são computados transacionalmente por bairro via `FieldValue.increment()` para eliminar queries custosas na tela inicial.

---

## 🚀 Tecnologias

- **Frontend:** [Next.js 15](https://nextjs.org/) (App Router), React 19
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Mapas:** [Leaflet](https://leafletjs.com/) & OpenStreetMap
- **Banco de Dados & Auth:** [Firebase Client SDK](https://firebase.google.com/) (Firestore/Auth) - *Static-First (Plano Spark Gratuito)*
- **Hospedagem:** [Firebase Hosting](https://firebase.google.com/hosting)
- **PWA:** `@ducanh2912/next-pwa`

---

## 🛠️ Configuração e Instalação

### 1. Pré-requisitos
- Node.js 18+
- Java JDK 21+ (necessário para rodar o emulador do Firebase localmente)
- Projeto no Firebase com Firestore e Auth ativados

### 2. Instalação e Configuração Automática
O projeto dispõe de um instalador e assistente visual automatizado:
```bash
git clone https://github.com/campobranco/campobranco.git
cd campobranco

# Roda o script de setup para configurar dependências e verificar o ambiente
npm run setup
```

### 3. Rodando o Projeto
```bash
# Servidor local de desenvolvimento
npm run dev
# Acesse http://localhost:3000
```

---

## 🔥 Firebase & Infraestrutura

Toda a infraestrutura do projeto foi desenhada sob uma política **Zero Trust** utilizando regras de segurança rígidas no Firestore:
- **Zero Trust Rules:** Validações finas baseadas no papel do usuário logado diretamente no `firestore.rules`.
- **Master Admin:** O primeiro acesso ao sistema é configurado pela variável `NEXT_PUBLIC_MASTER_EMAIL`. Se o usuário logado coincidir com este e-mail, ele é promovido a ADMIN automaticamente.

### Comandos de Deploy
- Fazer deploy de regras e hospedagem: `firebase deploy`
- Fazer deploy apenas das regras do Firestore: `npm run deploy:rules`
- Fazer deploy apenas da hospedagem estática: `npm run deploy:hosting`

---

## 🧪 Testes e Qualidade (QA)

| Comando | Descrição |
|---------|-----------|
| `npm run lint` | Executa a validação de sintaxe e regras de estilo do código (ESLint). |
| `npm run test:unit` | Executa testes unitários isolados com Jest (regras de domínio e RBAC). |
| `npm run test:integration` | Executa testes de integração diretamente contra o emulador local do Firebase. |
| `npm run test:e2e` | Executa testes End-to-End simulando o comportamento real do usuário com Playwright. |
| `npm run test:all` | Roda sequencialmente o Lint, Testes Unitários e E2E. |

### Rodando Emuladores Localmente
Para rodar os testes de integração ou testar a aplicação localmente sem poluir o ambiente de produção:
```bash
# Inicia o emulador do Firestore e Auth locais
npm run emulator
```

---

## 🤝 Contribuição e Suporte

Contribuições são muito bem-vindas! Se você deseja ajudar na evolução da plataforma, por favor leia o nosso guia de contribuição detalhado em [CONTRIBUTING.md](file:///C:/Users/design/Desktop/dev/campobranco/CONTRIBUTING.md).

Desenvolvido por **Paulo Jacomelli**.
- E-mail: `campobrancojw@gmail.com`

## 📄 Licença
Este projeto está licenciado sob a licença MIT.

