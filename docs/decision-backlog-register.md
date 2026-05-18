# Covivo — Decision & Backlog Register

> Registro canônico para evitar perda de contexto entre decisões de produto, operação e execução.

## 1) Como usar este arquivo
- Cada decisão recebe um ID (`DEC-xxx`).
- Cada item de execução recebe um ID (`BLG-xxx`).
- Nada entra em execução sem referência cruzada decisão -> backlog.
- Mudanças relevantes exigem atualização deste arquivo + `AI_CONTEXT.md` + `ai/changelog.ndjson`.

---

## 2) Decisões aprovadas (vigentes)

| ID | Tema | Decisão vigente | Status | Dono | Data | Revisão gatilho |
|---|---|---|---|---|---|---|
| DEC-001 | Modelo financeiro base | Motor base P2P; credor confirma pagamento; admin só arbitra exceções auditáveis. | Aprovada | Founding team | 2026-05-15 | Reavaliar ao escalar automações de pagamento |
| DEC-002 | Governança de grupo | Todo grupo deve manter >=1 admin; bloquear ações que violem invariante. | Aprovada | Founding team | 2026-05-15 | Qualquer incidente de grupo órfão |
| DEC-003 | Billing pré-lançamento | Sem cobrança real externa até gateway + jurídico; operar `manual_billing_mode` com simulação técnica de estados. | Aprovada | Founding team | 2026-05-15 | Conexão Stripe + readiness go-live |
| DEC-004 | Estados de assinatura | `active`, `past_due`, `downgraded_free`; downgrade automático só com gateway funcional. | Aprovada | Founding team | 2026-05-15 | Ativação de cobrança real |
| DEC-005 | Disputa/SAC | Manter estados de disputa + trilha auditável mesmo sem SAC formal; fundador opera exceções no pré-lançamento. | Aprovada | Founding team | 2026-05-15 | Montagem de operação SAC dedicada |
| DEC-006 | Convites | Modelo friend-first; convite de grupo opcional e explícito; sem auto-adição como morador. | Aprovada | Founding team | 2026-05-15 | Mudança de estratégia de crescimento |
| DEC-007 | Escopo financeiro expandido | Manter foco moradia com trilha social controlada (`individual`, `coletiva_moradia`, `rateio_amigos`) via rollout por fase. | Aprovada | Founding team | 2026-05-15 | KPIs de confusão/reputação degradarem |
| DEC-008 | Memória multiagente | `AI_CONTEXT.md` + `ai/changelog.ndjson` + protocolo no `AI_RULES.md` são obrigatórios para continuidade. | Aprovada | Founding team | 2026-05-15 | Divergência entre memória e código/docs |

---

## 3) Decisões pendentes (abertas)

| ID | Tema | Pergunta em aberto | Impacto | Prazo alvo | Dono |
|---|---|---|---|---|---|
| DEC-P001 | Convites multi-grupo | Convite opcional deve permitir 1 grupo ou múltiplos na v1? | Médio | Antes de implementar API de convite | Founding team |
| DEC-P002 | Beta charter público | Texto final de promessa de cobrança futura e antecedência mínima de aviso. | Alto (reputação) | Antes de convidar externos | Founding team |
| DEC-P003 | Limite beta | Teto de usuários/grupos antes de Stripe-ready. | Alto (operação) | Antes de ampliar whitelist | Founding team |
| DEC-P004 | Stripe readiness | Checklist final e critérios objetivos de go/no-go para cobrança real. | Alto (produto/receita) | Sem data fixa; por critério | Founding team |

---

## 4) Backlog priorizado (canônico)

## P0 (obrigatório)

| ID | Item | Referência | Dependências | Tamanho |
|---|---|---|---|---|
| BLG-001 | Invariante admin mínimo e vacância (bloqueios + janela 72h + escalonamento) | DEC-002 | Nenhuma | M |
| BLG-002 | Billing states e transições com modo pré-lançamento controlado | DEC-003, DEC-004 | BLG-001 | M |
| BLG-003 | Disputa/SAC com trilha auditável fim-a-fim | DEC-005 | BLG-001 | L |
| BLG-004 | UI mínima de billing/disputa/governança para reduzir conflito | DEC-002..005 | BLG-002, BLG-003 | M |
| BLG-005 | Backoffice Fase 1 (consulta assinatura, trilha, fila SAC) | DEC-003..005 | BLG-002, BLG-003 | M |

## P1 (crescimento controlado)

| ID | Item | Referência | Dependências | Tamanho |
|---|---|---|---|---|
| BLG-101 | Convite friend-first (verificação + `friend_only`) | DEC-006 | BLG-001 | M |
| BLG-102 | Convite opcional de grupo (`friend_plus_group`) com revalidação de admin no aceite | DEC-006 | BLG-101 | M |
| BLG-103 | UX Convites (busca/verificação + CTA + notificação in-app) | DEC-006 | BLG-101 | M |
| BLG-104 | Onboarding de grupo com seção “Convidar amigos para o grupo” | DEC-006 | BLG-101 | S |

## P2 (expansão)

| ID | Item | Referência | Dependências | Tamanho |
|---|---|---|---|---|
| BLG-201 | Tipos de despesa com flag (`individual`, `coletiva_moradia`, `rateio_amigos`) | DEC-007 | BLG-101, BLG-102 | L |
| BLG-202 | Métricas de risco de convites/social split (abuso, confusão, churn onboarding) | DEC-007 | BLG-103 | M |
| BLG-203 | Rollout por coorte + kill switch para expansão social | DEC-007 | BLG-201, BLG-202 | M |

---

## 5) Riscos ativos e gatilhos de revisão

| Risco | Severidade | Sinal de alerta | Ação imediata |
|---|---|---|---|
| Confusão entre amizade e entrada em grupo | Alta | Usuários entram em grupo sem intenção | Pausar rollout convites; reforçar UX e consentimento explícito |
| Promessa de cobrança mal comunicada | Alta | Reclamação de “mudança surpresa” | Congelar expansão beta e publicar aviso padronizado |
| Ausência de readiness Stripe | Alta | Fluxos de inadimplência quebram em produção | Manter sem cobrança real; bloquear go-live |
| Dívida de contexto/documentação | Média | Equipe/IA diverge sobre decisões vigentes | Atualizar este registro e AI memory no mesmo commit |

---

## 6) Definition of Done documental (governança)
- [ ] Decisão nova registrada em “Decisões aprovadas” ou “Decisões pendentes”.
- [ ] Backlog relacionado vinculado por ID.
- [ ] Risco e gatilho de revisão atualizados.
- [ ] Evento material registrado em `ai/changelog.ndjson`.
- [ ] `AI_CONTEXT.md` consistente com este registro.
