---
description: Projeto Campo Branco — Diretrizes de Engenharia e Fluxo de Trabalho
---

### Objetivo

Definir um fluxo de trabalho claro, previsível, colaborativo, seguro e acessível para qualquer desenvolvedor, priorizando simplicidade, conformidade legal, testes confiáveis, custo financeiro zero e facilidade de setup.

---

### Princípios do Projeto

* **Open Source e Colaborativo:** Sem barreiras, sem passos ocultos e com documentação transparente.
* **Setup Simples e Rápido:** Qualquer pessoa deve conseguir rodar o projeto localmente em minutos.
* **Custo Zero Inegociável:** Priorizar soluções gratuitas, sem necessidade de cartão de crédito e restritas ao plano Spark do Firebase.
* **Zero Dados Pessoais / Chaves Privadas Hardcoded:** Proibido versionar credenciais, segredos ou dados pessoais.
* **Tolerância Zero a Fallbacks Silenciosos:** Proibido mascarar erros ou dados ausentes com dados inventados ou arbitrários.
* **Zero Trust & Menor Privilégio:** Proteção profunda de dados e controle estrito de posse (Anti-IDOR) em `firestore.rules`.

---

### Estrutura de Trabalho

#### 1. Origem da Demanda

Toda tarefa deve partir de:
* necessidade funcional
* correção de erro (bug)
* melhoria técnica / estrutural

Cada tarefa deve conter:
* objetivo claro
* critério de conclusão definido

---

#### 2. Classificação da Tarefa

Antes de iniciar:
* **Bug** → erro ou comportamento incorreto
* **Feature** → nova funcionalidade
* **Refactor** → melhoria interna sem alterar comportamento
* **Tech Debt** → melhoria estrutural e segurança

---

#### 3. Escopo

* Definir exatamente o que será feito antes de editar arquivos.
* Evitar expansão de escopo durante a execução.
* Novas necessidades identificadas devem virar novas tarefas ou issues registradas.

---

### Colaboração & Setup (Regra Central)

#### 4. Setup do Ambiente

O projeto deve ser executável por qualquer pessoa seguindo apenas:
1. Clonar o repositório
2. Instalar dependências (`npm install`)
3. Configurar `.env` a partir de `.env.example`
4. Rodar o projeto (`npm run dev`)

Proibido:
* Etapas ocultas ou comandos manuais não documentados
* Dependência de conhecimento implícito ou contas pessoais

---

#### 5. Configuração e Ambiente

* Nunca versionar:
  * `.env` / `.env.local`
  * chaves privadas e segredos
  * credenciais ou tokens
* Sempre fornecer:
  * `.env.example` completo e atualizado
  * instruções claras de preenchimento
* Dados em mocks/testes devem ser:
  * genéricos e impessoais
  * nunca dados de usuários reais (PII)

---

#### 6. Firebase (Obrigatório & Isolamento)

* **Projeto único autorizado:** `campobrancodev`.
* Antes de qualquer comando de infraestrutura, executar `npm run firebase:check`.
* Todos os comandos CLI e deploys utilizam a flag `--project campobrancodev`.
* **Plano Spark:** Estruturar Firestore e Storage para operar nos limites gratuitos:
  * Minimizar leituras/escritas e evitar listeners sem `unsubscribe`.
  * Prevenir re-execuções descontroladas em hooks (`useEffect`/`useCallback`).

---

#### 7. Dependências & Pragmatismo (KISS / YAGNI)

Priorizar:
* ferramentas gratuitas e open source
* código nativo e funções diretas para tarefas de poucas linhas

Evitar:
* serviços pagos ou que exijam cartão
* bibliotecas redundantes ou excesso de camadas abstratas (over-engineering)

---

### Qualidade, Segurança & Conformidade Legal

#### 8. Automação de Testes (TDD & QA)

* Todo teste unitário ou de integração segue o padrão **AAA (Arrange, Act, Assert)**.
* **Ciclo Red-Green:** Confirmar que o teste falha contra a condição sem a feature ou com o bug antes de validar a correção.
* Proibido "Fake Passing" (testes com asserções triviais apenas para cobertura).
* Testes de frontend utilizam busca semântica por papéis e atributos ARIA (`getByRole`), promovendo acessibilidade.
* Limpeza e isolamento rigoroso entre testes para eliminar intermitência (*flaky tests*).

---

#### 9. Segurança de Aplicação & Anti-IDOR

* Toda proteção reside nas **Firestore Security Rules** (`firestore.rules`).
* Validar que toda leitura e mutação comprove que `request.auth.uid == resource.data.ownerId` (e `request.resource.data.ownerId` na criação).
* Higienizar inputs e saídas dinâmicas para prevenir XSS.
* Nunca logar senhas, tokens ou dados pessoais no `console.log`.

---

#### 10. Conformidade Jurídica & LGPD/CDC

* **Minimização de Dados (LGPD Art. 6º):** Coletar estritamente o necessário para a finalidade declarada.
* **Consentimento Livre (LGPD Art. 8º):** Caixas de seleção desmarcadas por padrão; proibido *opt-out* pré-marcado e *dark patterns*.
* **Direitos do Titular (LGPD Art. 18 / GDPR):** Suporte para exportação (JSON/CSV), retificação e exclusão de dados pelo próprio usuário.
* **Transparência e Consumidor (CDC):** Clareza total de preços e respeito ao direito de arrependimento (Art. 49).

---

#### 11. Protocolo Anti-Fallback

* Proibido redirecionar buscas para o último elemento de array (`items.at(-1)` / `items[length - 1]`).
* Proibido preencher métricas ou dados de negócio com valores numéricos literais inventados (`|| 49.90`, `?? 10`, `||=`, `??=`).
* Proibido gerar dados ou IDs aleatórios (`Math.random()`) ou forçar a data atual em registros históricos ausentes.
* Proibido silenciar falhas com `catch` vazio ou que retorne dados simulados em produção.
* Dados ausentes devem retornar `null`/`undefined` e serem exibidos com clareza na UI (`N/A`, mensagem de indisponibilidade).

---

### Execução e UX

#### 12. Implementação & Código Limpo

* Nomenclatura descritiva, alta coesão e baixo acoplamento (SRP).
* Manter código e comentários em português (Brasil).
* Seguir limites de complexidade cognitiva: preferir funções diretas a abstrações prematuras.

---

#### 13. UX & Interface

* Proibido uso de `alert()`.
* Utilizar:
  * modais estruturados para decisões e erros críticos
  * toasts para feedbacks simples e informativos
* Estados assíncronos obrigatórios:
  * **loading**
  * **sucesso**
  * **erro**

---

### Entrega e Versionamento

#### 14. Versionamento Semântico

Antes de iniciar: registrar a versão atual do `package.json`.

Ao concluir a tarefa:
* **Bug / Ajuste Funcional** → incrementar patch (`0.0.X-beta`)
* **Feature** → incrementar minor (`0.X.0-beta`)
* **Sem alteração funcional** → manter a versão

---

#### 15. Controle do Git & Entrega

* Manter alterações estritamente **locais**.
* **NÃO** realizar `git push` automático. Subir somente sob autorização expressa.
* Registro da entrega deve incluir:
  * O que foi feito e tipo da mudança
  * Impacto no sistema e nos testes
  * Versão anterior e nova versão do `package.json`

---

## Restrições Arquiteturais Absolutas

Estas regras possuem prioridade máxima dentro do projeto e não devem ser reinterpretadas durante a implementação.

### Ambiente Oficial
O único ambiente suportado pelo projeto é:
- **Firebase Spark**
- **Next.js com `output: 'export'`**
- **Aplicação estática hospedada no Firebase Hosting**
- **Execução baseada em cliente (client-side)**

### Proibições Arquiteturais
Não considerar, sugerir, planejar ou implementar soluções baseadas em:
- ambientes com servidor executando código em runtime (Node.js server, SSR, API Routes dinâmicas);
- endpoints HTTP dinâmicos ou Server Actions em produção;
- rotinas agendadas externas ou cron jobs de terceiros;
- processamento backend separado;
- serviços que exigem alteração de plano (Blaze);
- recursos que dependam de cobrança ou cartão de crédito;
- arquiteturas fora do modelo estático definido.

### Regra de Decisão
Ao identificar uma necessidade que demandaria recursos de backend indisponíveis no ambiente oficial:
1. Não propor migração de infraestrutura.
2. Não sugerir serviços alternativos pagos.
3. Não criar abstrações para mascarar esses recursos.
4. Redesenhar a solução considerando exclusivamente as capacidades existentes no Firebase Spark e execução *client-side* (ex: processamento via Web Workers ou sob demanda no navegador do usuário).

### Critério Obrigatório
Toda solução proposta deve responder:
> *"Esta implementação funciona dentro do modelo Firebase Spark + Next.js Static Export?"*

Se a resposta for não:
- a solução deve ser descartada;
- o requisito deve ser reavaliado dentro das limitações existentes;
- nenhuma alternativa fora da arquitetura oficial deve ser apresentada como opção.