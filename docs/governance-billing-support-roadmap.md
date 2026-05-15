# Covivo — Plano Mestre (Governança, Cobrança, Suporte, UI)

> Documento de referência para decisões já alinhadas e plano de execução objetivo.

## 1) Decisões consolidadas (alinhadas)

## 1.1 Financeiro e modos
- Motor financeiro base: p2p.
- Modo P2P: credor confirma pagamento.
- Admin só arbitra exceções com justificativa e trilha auditável.
- Modo Centralized v1: tesoureiro humano por despesa (C1).
- Sem pagamento avulso sem split.
- Troca de modo não reescreve histórico; afeta novos eventos.

## 1.2 Papéis
- Admin = governança do grupo.
- Sponsor = responsável pela assinatura do grupo.
- Pagar assinatura não concede poder de admin.
- Invariante obrigatória: todo grupo deve manter >= 1 admin.

## 1.3 Monetização v1
- Freemium.
- Catálogo comercial: Pro Solo / Pro Duo / Pro Max.
- Motor interno único por seats + entitlements (sem bifurcar produto por plano).
- Sponsor único por vez por grupo.
- Split da mensalidade Pro: opcional.
- Exportação PDF/CSV: premium.
- Disputa/arbitragem: free (não vira paywall).
- Trial: 14 dias com fallback automático para Free.

## 1.4 Prazos operacionais
- Ações sensíveis: 48h.
- Vacância admin/sponsor: 72h.
- Sem maioria clara: não executa e escalona.
- Past due: grace de 3 dias.


## 1.5 Decisões críticas aceitas (5 respostas)
- Seat ativo cobrável: **modelo híbrido** (atividade financeira relevante no ciclo).
- Retenção técnica em pseudonimização com pendência crítica: **5 anos** (com validação jurídica formal antes de publicação).
- Escalonamento automático de disputa sem acordo: **48h**.
- Reativação do Pro em `past_due`: **qualquer admin elegível**, com override ops apenas em exceção auditada.
- Gate de release: **bloquear deploy** se qualquer invariante crítico falhar.

---

## 2) Estado atual do produto (confirmado no código)
- Multi-grupo já existe (memberships + activeGroupId + group switcher).
- Portanto, regras novas devem ser por grupo (billing, sponsor, disputa, notificações).

---

## 3) P0 fechado: Sponsor inadimplente (P0.2)

## 3.1 Estados de assinatura por grupo
- `active`
- `past_due`
- `downgraded_free`

## 3.2 Eventos de transição
- `billing_charge_failed`: `active -> past_due`
- `billing_recovered`: `past_due -> active`
- `grace_expired`: `past_due -> downgraded_free`
- `manual_reactivate_by_admin`: `downgraded_free -> active`

## 3.3 Regras de execução
1. Falha de cobrança inicia grace (`grace_started_at` + deadline +3 dias).
2. Durante grace: dunning diário progressivo ao sponsor/admin.
3. Expirou grace: downgrade para Free e notificação para todos os membros.
4. Downgrade pausa apenas recursos Pro; core e histórico continuam.
5. Reativação: qualquer admin elegível pode reativar e se torna novo sponsor.
6. Reativação não altera automaticamente governança.

---

## 4) P0 fechado: Disputa e SAC (P0.3)

## 4.1 Estados da disputa
- `pending_confirmation`
- `contested`
- `counter_evidence_submitted`
- `resolved_local`
- `escalated_sac`
- `resolved_sac`

## 4.2 Fluxo
1. Pagamento enviado -> `pending_confirmation`.
2. Credor contesta com motivo + evidência -> `contested`.
3. Devedor envia contraprova -> `counter_evidence_submitted`.
4. Se credor aceita -> `resolved_local`.
5. Sem acordo na janela -> `escalated_sac`.
6. SAC decide com base em evidência + regra -> `resolved_sac`.

## 4.3 Regra de conflito de interesse
- Admin envolvido em disputa não arbitra.
- Admin único envolvido: escalonamento direto ao SAC.

## 4.4 SLA do SAC
- Triagem: 24h.
- Decisão padrão: 72h.
- Casos complexos: até 7 dias com atualização intermediária.

## 4.5 Protocolo objetivo do SAC
- Entrada permitida: conflito não resolvido localmente, conflito de interesse, travamento crítico.
- Evidência mínima: comprovante, contraprova (se houver), timeline de eventos, contexto do grupo.
- Saída obrigatória auditável: decisão, regra aplicada, operador, timestamp, justificativa.

---

## 5) P0 fechado: Admin mínimo e vacância (P0.1/P0.4)
- Bloquear qualquer ação que deixe grupo sem admin.
- Em vacância: abrir janela de 72h para regularização.
- Se não houver regularização clara: escalonar SAC.
- Objetivo: evitar grupo órfão sem criar votação complexa no v1.

---

## 6) UI obrigatória para reduzir conflito (P1 com partes P0)

## 6.1 UX de clareza
- Diferenciar visualmente admin vs sponsor.
- Mostrar impacto antes de ação crítica.
- Exigir confirmação explícita em ações sensíveis.

## 6.2 UX de billing
- Tela por grupo com: status do plano, sponsor, vencimento, seats ativos e CTA de reativação.
- Mensagem clara de downgrade sem perder histórico.

## 6.3 UX de disputa
- Timeline do caso (contestação, contraprova, escalonamento, decisão).
- Status e prazo visíveis para as partes.

---

## 7) Promoções/cupons/comunicados (adiado de forma controlada)
- Não implementar agora.
- Só abrir após estabilizar governança+billing+SAC e backoffice mínimo.
- Entrará como módulo de campanhas comerciais com regras de elegibilidade e auditoria.

---

## 8) Backoffice interno (plataforma operacional)

## Fase 1 (obrigatória)
- consulta de assinatura por grupo,
- trilha de eventos auditáveis,
- fila simples de casos SAC.

## Fase 2
- métricas de produto/cobrança,
- gestão de comunicados in-app,
- dashboard de risco operacional.

## Fase 3
- campanhas/promoções/cupons,
- automações de suporte,
- antifraude avançado.

---

## 9) Ordem de execução para sair do “ping-pong”
1. P0.1/P0.4 — admin mínimo + vacância.
2. P0.2 — sponsor inadimplente + downgrade.
3. P0.3 — disputa + SAC com trilha auditável.
4. UI mínima obrigatória destes três blocos.
5. Backoffice Fase 1.
6. Só depois: promoções/cupons.

---



## 9.1 Referência jurídica
- Blueprint de políticas e termos: `docs/policies/legal-policy-blueprint.md`.

## 10) Próximo ponto (imediato)
**Implementação técnica controlada (2 sprints)**
- Sprint 1: invariantes (admin mínimo, segregação por grupo), billing states e dunning/grace/downgrade.
- Sprint 2: fluxo de disputa completo, escalonamento SAC, snapshot de saída e trilha auditável fim-a-fim.

---

## 11) Futuro (para não esquecer) — backlog estruturado

## 11.1 Pós-P0 imediato (quando P0 estiver estável)
1. **Exit & Debt Policy Spec (P0 próximo):**
   - saída voluntária com pendências,
   - remoção por admin,
   - exclusão de conta,
   - transferência de responsabilidades,
   - bloqueios e exceções por dívida em aberto.
2. **Quórum e desempate por tamanho de grupo:**
   - regras objetivas por faixa de membros,
   - quando escalar para SAC automaticamente.
3. **Pricing final Solo/Duo/Max:**
   - valores,
   - seat ativo cobrável,
   - cap operacional por plano,
   - política de reajuste.

## 11.2 Backoffice Fase 2 (obrigatório antes de campanhas)
- Dashboard operacional com:
  - past_due por grupo,
  - SLA de casos,
  - tempo médio de resolução,
  - taxa de downgrade por inadimplência.
- Gestão de comunicados in-app:
  - publicação por segmento,
  - agendamento,
  - limitação de frequência.
- Métricas de produto/cobrança:
  - trial->paid,
  - churn por grupo,
  - reativação de sponsor,
  - incidência de disputas.

## 11.3 Campanhas comerciais (só após Fase 2 estável)
- Módulo de promoções/cupons com:
  - tipos (percentual, fixo, trial extra, upgrade temporário),
  - elegibilidade por plano e grupo,
  - validade/limites/combinabilidade,
  - trilha auditável completa.
- Feature flags e rollout gradual:
  - cohort control,
  - kill switch,
  - rollback seguro.

## 11.4 Segurança e conformidade (evolução contínua)
- Endurecimento de RBAC ops (`ops_readonly`, `ops_agent`, `ops_manager`).
- MFA obrigatório para perfis críticos.
- Políticas LGPD formais:
  - minimização de dados,
  - retenção,
  - base legal,
  - trilha de acesso a dados sensíveis.

## 11.5 Runbooks obrigatórios (operações)
- Runbook de sponsor inadimplente.
- Runbook de disputa escalada SAC.
- Runbook de vacância de admin.
- Runbook de incidente de cobrança.
- Runbook de rollback de campanha comercial.

## 11.6 Checkpoint trimestral (governança do produto)
- Revisar:
  - se regras atuais estão reduzindo conflito,
  - se SLA do SAC está sendo cumprido,
  - se monetização está sustentável,
  - se complexidade de UI cresceu além do aceitável.
- Decisão trimestral:
  - manter,
  - ajustar,
  - simplificar.


---

## 12) Exit & Debt Policy v1 (consolidado)

## 12.1 Tipos de saída
1. Saída voluntária.
2. Remoção por admin.
3. Exclusão de conta.
4. Inatividade prolongada (tratada como caso operacional).

## 12.2 Regras-mãe
- Histórico financeiro nunca apaga.
- Dívida histórica nunca some por saída.
- Troca de membership não altera fatos financeiros passados.
- Toda saída com pendência gera snapshot auditável.
- Nenhuma ação pode deixar o grupo sem admin.

## 12.3 Definição de pendência financeira
Conta como pendência quando existir qualquer um:
- split pendente,
- disputa aberta,
- pagamento enviado pendente de confirmação,
- obrigação já gerada no ciclo vigente,
- responsabilidade crítica (admin/sponsor) sem sucessor válido.

## 12.4 Data efetiva de saída (modelo híbrido)
- Regra preferencial: saída imediata quando pendências elegíveis estiverem resolvidas.
- Regra de segurança: se não houver resolução elegível no prazo/estado do caso, aplica-se saída no fim do ciclo financeiro atual com snapshot e notificação.
- Trava antiabuso: ninguém pode ficar indefinidamente preso por inércia de terceiros.

## 12.5 Saída voluntária
- Sem pendência: pode efetivar.
- Com pendência: agenda fim de ciclo + snapshot + notificação.
- Após saída efetiva: usuário não entra em novas obrigações do grupo.

## 12.6 Remoção por admin
- Permitida com pendência apenas com snapshot e notificação.
- Proibida se violar invariante de admin mínimo.

## 12.7 Exclusão de conta
- Sem pendência crítica: fluxo padrão.
- Com pendência crítica: pseudonimização com retenção mínima técnica para auditoria/cobrança.

### 12.7.1 Pseudonimização (escopo mínimo)
- Remover/ocultar PII de exibição: nome completo, avatar e contatos em superfícies de usuário.
- Preservar vínculo técnico interno: IDs, referências financeiras históricas e trilhas de decisão/auditoria.
- Limitar acesso ao vínculo técnico ao ambiente ops, com RBAC e log de acesso.
- Aplicar retenção técnica conforme política vigente (base atual: 5 anos, sujeita à validação jurídica final).

## 12.8 Disputa em andamento
- Saída permitida com escalonamento automático para SAC.
- Caso continua até resolução formal.

## 12.9 Campos mínimos do snapshot de saída
- snapshot_id, group_id, user_id, captured_at,
- saldos por contraparte,
- disputas abertas,
- pagamentos pendentes,
- papel no momento da saída,
- data efetiva planejada.

---

## 13) Pacote de testes críticos (antes de produção)

## 13.1 Casos de autorização
1. Admin tenta remover último admin -> deve bloquear.
2. Membro sem papel admin tenta remover outro membro -> deve negar.
3. Admin de grupo A tenta ação crítica no grupo B -> deve negar.

## 13.2 Casos de sponsor inadimplente
1. Falha de cobrança -> `active -> past_due`.
2. Grace expira sem pagamento -> `past_due -> downgraded_free`.
3. Downgrade não afeta histórico/core, só recursos Pro.
4. Reativação por admin elegível -> `downgraded_free -> active` + troca de sponsor.

## 13.3 Casos de disputa
1. Contestação abre estado `contested` com motivo obrigatório.
2. Contraprova move para `counter_evidence_submitted`.
3. Sem acordo na janela -> `escalated_sac` automático.
4. Admin único envolvido em disputa -> escalonamento direto SAC.

## 13.4 Casos de saída
1. Saída sem pendência -> efetivação conforme regra.
2. Saída com pendência -> snapshot obrigatório + fim de ciclo.
3. Remoção com pendência sem snapshot -> deve bloquear.
4. Exclusão com pendência crítica -> pseudonimiza, não apaga vínculos financeiros.

## 13.5 Casos de consistência contábil
1. Após saída, usuário não deve receber novos splits.
2. Dívida histórica permanece vinculada corretamente.
3. Não pode haver recálculo retroativo de fatos consolidados.

## 13.6 Casos de auditoria
1. Toda ação crítica grava actor, regra aplicada, timestamp, justificativa.
2. Decisão SAC precisa estar íntegra e consultável.

## 13.7 Casos de multi-grupo
1. Evento de billing/disputa em grupo A não afeta grupo B.
2. Notificações segmentadas por grupo correto.

## 13.8 Gate de release (go/no-go)
- 0 falhas em invariantes críticos:
  - admin mínimo,
  - histórico imutável,
  - segregação por grupo,
  - trilha auditável obrigatória.
- Se qualquer invariante falhar: release bloqueado.
