# Contribuindo para o Campo Branco

Obrigado por considerar contribuir para o Campo Branco! O projeto utiliza uma arquitetura pensada para ser robusta no backend, resiliente a concorrência e livre de falhas de consistência lógica.

## 🚀 Como começar em 5 minutos

1. Faça o Fork e clone o projeto.
2. Certifique-se de ter o **Java JDK 21+** instalado.
3. Roda o setup automatizado para instalar dependências e testar seu ambiente local:
   ```bash
   npm run setup
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 🧱 Arquitetura e Regras de Segurança

Para manter o projeto sustentável a longo prazo e compatível com múltiplos contribuidores simultâneos, seguimos regras estritas travadas por design:

```
[ UI Componentes ]
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

### 🚫 Regras importantes:
* **UI não acessa escritas no Firestore diretamente**: Não utilize `updateDoc`, `deleteDoc` ou `setDoc` dentro de componentes React. Toda mutação deve ser importada e executada a partir de `lib/contracts/mutations/`.
* **Queries (Leituras) são livres**: A UI pode e deve assinar dados em tempo real ou ler o banco diretamente usando `onSnapshot` ou `getDocs`.
* **Regras de Domínio Puras**: Lógicas puras de negócio (ex: "se o território pode ser designado") devem morar isoladas em `lib/domain/` sem dependência de APIs externas ou do Firestore, facilitando cobertura de testes de regressão simples com Jest.

---

## 🧪 Testes e Emuladores

* **Roda testes unitários**: `npm run test:unit`
* **Roda emulador de banco**: `npm run emulator`
* **Roda testes de integração no emulador**: `npm run test:integration`
* **Roda testes E2E com Playwright**: `npm run test:e2e`

---

## ⚠️ Antes de enviar seu Pull Request

1. Roda a verificação estrita local: `npm run setup`.
2. Certifique-se de que os testes locais e o linter (`npm run lint`) passam.
3. Não envie mock data estático para mascarar comportamentos que deveriam passar por transações reais no Firestore.
