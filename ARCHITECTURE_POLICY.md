# Política de Arquitetura – Prioridade da Segurança e Compatibilidade Firebase Spark

> **Em caso de conflito entre funcionalidade e restrições de infraestrutura, a segurança tem prioridade absoluta.**
>
> Se uma funcionalidade não puder ser implementada de forma segura usando apenas Firebase Spark e recursos internos, a funcionalidade deve ser limitada, simplificada ou removida, nunca comprometendo a segurança.

## Princípios Gerais (ordem de decisão)
1. **Segurança** – Manter a proteção de dados e a integridade do sistema.
2. **Integridade e consistência dos dados** – Garantir que as regras e transações preservem a coerência.
3. **Compatibilidade obrigatória com Firebase Spark** – Nenhuma dependência externa ou necessidade de upgrade para Blaze.
4. **Ausência de dependências externas** – Proibir serviços que exigem contas ou custos adicionais.
5. **Simplicidade operacional** – Preferir soluções simples, fáceis de manter e monitorar.
6. **Funcionalidades e conveniência** – Implementar apenas o que pode ser entregue dentro das restrições acima.

## Diretrizes de Decisão
- **Limitar uso** em vez de migrar para Blaze.
- **Limitar frequência** (rate limiting) usando Firestore ao invés de Redis ou serviços externos.
- **Processamento manual** ao invés de filas externas.
- **Operações síncronas simples** ao invés de arquiteturas distribuídas complexas.
- **Reduzir retenção de dados** ao invés de contratar armazenamento adicional.
- **Limitar uploads** ao invés de depender de serviços externos de processamento.
- **Paginação e limites de consulta** ao invés de caches avançados.

## Regra Derivada
> **Quando uma funcionalidade segura exigir recursos indisponíveis no Firebase Spark, a prioridade é reduzir o escopo da funcionalidade, impor limites mais rígidos ou removê‑la, nunca expandir a infraestrutura ou comprometer a segurança.**

## Exemplos de Aplicação
| Situação                     | Decisão compatível                                   |
| ---------------------------- | ---------------------------------------------------- |
| Rate limit muito pesado      | Reduzir limites e usar Firestore                     |
| Muitos uploads               | Limitar tamanho, quantidade ou frequência            |
| Muitos logs                  | Reduzir retenção ou granularidade                    |
| Consultas caras              | Restringir filtros ou volume retornado               |
| Compartilhamentos excessivos | Impor cotas por usuário                              |
| Processamento em lote        | Dividir em operações menores executadas pelo usuário |

Esta política deve ser consultada antes de propor ou implementar novas funcionalidades, garantindo que **a segurança** seja a prioridade máxima, seguida pela integridade dos dados e compatibilidade com o Firebase Spark.
