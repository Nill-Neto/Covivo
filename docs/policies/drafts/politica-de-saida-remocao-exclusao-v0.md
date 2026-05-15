# Política de Saída, Remoção e Exclusão de Conta — Minuta v0 (Covivo)

> Minuta para revisão jurídica e alinhamento com Exit & Debt Policy.

## 1. Tipos de desligamento
- Saída voluntária,
- Remoção por admin,
- Exclusão de conta,
- Tratamento de inatividade conforme regras operacionais.

## 2. Princípios
- Histórico financeiro não é apagado automaticamente por saída.
- Obrigações históricas não são extintas por desligamento.
- Não é permitido deixar grupo sem admin.

## 3. Pendência financeira
Há pendência quando existir split pendente, disputa aberta, pagamento em validação, obrigação do ciclo vigente ou papel crítico sem sucessor.

## 4. Data efetiva de saída (modelo híbrido)
Regra preferencial: saída imediata quando pendências elegíveis estiverem resolvidas.
Regra de segurança: se a resolução não ocorrer no estado/prazo aplicável, a saída é efetivada no fim do ciclo com snapshot e notificação.
A saída não pode ficar indefinidamente bloqueada por inércia de terceiros.

## 5. Snapshot
Saídas com pendência podem gerar snapshot financeiro para preservar integridade contábil e rastreabilidade.

## 6. Remoção por admin
Permitida com pendência apenas com notificação e snapshot; vedada se violar invariante de admin mínimo.

## 7. Exclusão de conta com pendência crítica
Pode ocorrer pseudonimização, com retenção mínima técnica para auditoria, defesa de direitos e cumprimento legal.

### 7.1 Escopo da pseudonimização
- Ocultar/remover dados pessoais de exibição no app (nome completo, avatar e contatos).
- Preservar somente os vínculos técnicos indispensáveis para reconciliação financeira e trilha auditável.
- Restringir consulta dos vínculos técnicos ao ambiente interno autorizado (ops), com registro de acesso.

## 8. Disputa em andamento
Saída com disputa pode ser permitida com escalonamento ao SAC, mantendo o caso ativo até decisão.
