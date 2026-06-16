# Contribuindo para o Campo Branco

Obrigado por considerar contribuir para o Campo Branco!

## Como contribuir

1.  Faça um Fork do projeto.
2.  Crie uma Branch para sua Feature (`git checkout -b feature/MinhaFeature`).
3.  Faça o Commit de suas mudanças (`git commit -m 'Adicionando uma nova feature'`).
4.  Faça o Push para a Branch (`git push origin feature/MinhaFeature`).
5.  Abra um Pull Request.

## Padrões de Código e Arquitetura Pragmática

O Campo Branco prioriza **simplicidade, colaboração rápida e execução correta**. Nossa arquitetura evita o "over-engineering". Siga estas regras de ouro:

1. **A Regra Mestra:** Se a arquitetura está dificultando você escrever código simples para resolver uma dor real, ela está errada.
2. **Mutações (Escritas):** Não escreva direto no Firestore (`updateDoc`, `deleteDoc`) dentro de componentes React. Use/crie funções simples em `lib/contracts/mutations/`.
3. **Queries (Leituras):** A UI pode (e deve) ler o banco diretamente via `onSnapshot` ou `getDocs`. Não crie burocracia para ler dados.
4. **Services (`lib/services`):** Use apenas para encapsular operações densas do Firebase (ex: transações atômicas). Se for simples, o contrato resolve sem service.
5. **Regras de Negócio Puras:** Lógicas comportamentais isoladas (ex: "quem pode assumir mapa") vivem em `lib/domain/` como funções puras sem Firebase, garantindo cobertura pelo Jest.
6. **Concorrência:** Se uma operação puder sofrer corrida (ex: cliques simultâneos designando mapa), use `runTransaction`.
7. **Testes Críticos:** Quebrou o fluxo E2E (Playwright) de Designar/Devolver? O PR não sobe.
8. **Não tente prever o futuro (YAGNI):** Só separe Bounded Contexts ou crie abstrações quando a dor no código atual justificar.

- Utilizamos Tailwind CSS.
- Siga as regras do ESLint (Next.js config).

## Reportando Bugs

Se você encontrar um bug, por favor abra uma issue detalhando o problema, como reproduzi-lo e o comportamento esperado.
