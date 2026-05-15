# Covivo — Blueprint de Políticas e Termos (v1)

> Documento de apoio para **formular minutas** (texto base) antes da revisão jurídica.
> Não substitui advogado.

## Como usar este arquivo
1. Copiar os blocos de “Texto base sugerido”.
2. Ajustar com nomes, contatos, prazos e detalhes reais da operação.
3. Enviar para revisão jurídica formal.
4. Publicar no app com versionamento e aceite explícito.

---

## 1) Termos de Uso — estrutura + texto base sugerido

## 1.1 Objeto
**Texto base sugerido:**
> O Covivo é uma plataforma digital para organização financeira pessoal e de grupos, incluindo registro de despesas, divisão de valores, comprovação de pagamentos e gestão de assinaturas por grupo.

## 1.2 Elegibilidade
**Texto base sugerido:**
> Para uso da plataforma, o usuário declara possuir capacidade civil para contratar, nos termos da legislação aplicável, sendo o uso destinado a maiores de 18 anos nesta versão do serviço.

## 1.3 Papéis e responsabilidades
**Texto base sugerido:**
> O papel de administrador refere-se à governança do grupo. O papel de sponsor refere-se à responsabilidade de pagamento da assinatura do grupo. O pagamento da assinatura não concede, por si só, privilégios administrativos adicionais.

## 1.4 Condutas e limitações
**Texto base sugerido:**
> O usuário compromete-se a fornecer informações verídicas, não utilizar comprovantes falsos e não praticar fraudes, abusos de plano ou qualquer uso incompatível com a finalidade do serviço.

## 1.5 Suspensão, downgrade e encerramento
**Texto base sugerido:**
> Em caso de inadimplência do plano do grupo, o Covivo poderá aplicar downgrade para o plano gratuito, mantendo operações essenciais e histórico financeiro conforme políticas aplicáveis.

## 1.6 Alterações de termos
**Texto base sugerido:**
> O Covivo poderá atualizar estes Termos periodicamente. Alterações materiais serão comunicadas e poderão exigir novo aceite para continuidade do uso.

---

## 2) Política de Privacidade (LGPD) — estrutura + texto base sugerido

## 2.1 Dados e finalidades
**Texto base sugerido:**
> Coletamos dados cadastrais, dados de uso e dados financeiros necessários para execução das funcionalidades de organização financeira, segurança, prevenção a fraude, atendimento e cumprimento de obrigações legais.

## 2.2 Base legal
**Texto base sugerido:**
> O tratamento ocorre com fundamento nas bases legais da LGPD aplicáveis ao contexto, incluindo execução de contrato, legítimo interesse, cumprimento de obrigação legal/regulatória e, quando aplicável, consentimento.

## 2.3 Retenção
**Texto base sugerido:**
> Os dados são retidos pelo período necessário para as finalidades informadas, observados prazos legais e necessidades de auditoria/defesa de direitos. Em situações de pseudonimização com pendência crítica, vínculos técnicos mínimos poderão ser mantidos por prazo definido em política específica.

## 2.4 Direitos do titular
**Texto base sugerido:**
> O titular poderá solicitar confirmação, acesso, correção, anonimização, portabilidade, eliminação (quando cabível) e demais direitos previstos na LGPD, por meio do canal oficial de privacidade.

---

## 3) Política de Cobrança, Cancelamento e Reativação — estrutura + texto base sugerido

## 3.1 Planos
**Texto base sugerido:**
> O serviço poderá oferecer planos Free e Pro (Solo, Duo e Max), com regras de elegibilidade e limites publicadas na página de planos vigente.

## 3.2 Trial e grace
**Texto base sugerido:**
> O período de trial e o período de grace, quando aplicáveis, seguem as regras operacionais vigentes. Encerrado o grace sem regularização, poderá ocorrer downgrade para o plano gratuito.

## 3.3 Reativação
**Texto base sugerido:**
> A reativação do plano do grupo poderá ser realizada por administrador elegível, conforme regras da plataforma. A reativação não altera automaticamente papéis de governança do grupo.

## 3.4 Promoções e cupons
**Texto base sugerido:**
> Cupons e campanhas promocionais, quando disponibilizados, terão condições próprias de elegibilidade, prazo, cumulatividade e revogação, sempre publicadas de forma transparente.

---

## 4) Política de Disputas e Evidências (SAC) — estrutura + texto base sugerido

## 4.1 Fluxo padrão
**Texto base sugerido:**
> O fluxo de disputa observará as etapas de contestação, contraprova e eventual escalonamento ao SAC quando não houver resolução local no prazo definido.

## 4.2 Evidência mínima
**Texto base sugerido:**
> Para análise de disputa, poderão ser exigidos comprovantes, contraprovas, registros de interação e metadados operacionais necessários à decisão objetiva do caso.

## 4.3 Conflito de interesse
**Texto base sugerido:**
> Agentes com conflito de interesse no caso não poderão atuar na decisão da disputa.

## 4.4 Resultado e trilha auditável
**Texto base sugerido:**
> Toda decisão de disputa será registrada com identificação do operador, regra aplicada, justificativa e data/hora, preservando rastreabilidade.

---

## 5) Política de Saída, Remoção e Exclusão de Conta — estrutura + texto base sugerido

## 5.1 Princípios
**Texto base sugerido:**
> A saída de um membro não apaga automaticamente histórico financeiro prévio nem obrigações já consolidadas, observadas as regras de encerramento do ciclo e auditoria.

## 5.2 Snapshot de saída
**Texto base sugerido:**
> Em saídas com pendência, a plataforma poderá gerar snapshot financeiro para preservar integridade contábil e rastreabilidade das obrigações remanescentes.

## 5.3 Exclusão com pendência crítica
**Texto base sugerido:**
> Quando houver pendência crítica, a conta poderá ser pseudonimizada, preservando apenas dados técnicos mínimos necessários para auditoria, defesa de direitos e cumprimento legal.

---

## 6) Política de Segurança e Acesso Interno (Ops) — estrutura + texto base sugerido

## 6.1 RBAC interno
**Texto base sugerido:**
> O acesso ao BackOffice é restrito por papéis internos, independentes dos papéis de usuário da plataforma, com aplicação do princípio do menor privilégio.

## 6.2 Auditoria e prevenção
**Texto base sugerido:**
> Ações críticas no ambiente interno são registradas em trilha auditável e poderão ser monitoradas para prevenção de abuso e incidentes de segurança.

---

## 7) Requisitos de implementação no produto (obrigatórios)
- Aceite explícito por documento e por versão.
- Registro de timestamp, versão e identificador do usuário/grupo.
- Reaceite obrigatório em mudanças materiais.
- Histórico de versões acessível no app/site.

---

## 8) Checklist para handoff jurídico
- O texto promete exatamente o que o sistema faz (sem lacunas).
- Cláusulas de cobrança, downgrade e saída coerentes com fluxos reais.
- Política de privacidade alinhada à LGPD e retenção real praticada.
- Disputa/SAC com critérios objetivos e auditáveis.
- Linguagem clara e compreensível ao usuário final.

---

## 9) Status das decisões-base já aceitas (produto)
- Seat ativo: modelo híbrido (atividade financeira relevante no ciclo).
- Retenção técnica em pseudonimização com pendência crítica: 5 anos (sujeito à validação jurídica formal).
- Escalonamento automático de disputa sem acordo: 48h.
- Reativação do Pro: qualquer admin elegível; override ops apenas em exceção auditada.
- Gate de release bloqueia deploy se invariante crítico falhar.


## 10) Minutas v0 criadas a partir deste blueprint
- `docs/policies/drafts/termos-de-uso-v0.md`
- `docs/policies/drafts/politica-de-privacidade-v0.md`
- `docs/policies/drafts/politica-de-cobranca-cancelamento-reativacao-v0.md`
- `docs/policies/drafts/politica-de-disputas-evidencias-sac-v0.md`
- `docs/policies/drafts/politica-de-saida-remocao-exclusao-v0.md`
- `docs/policies/drafts/politica-de-seguranca-e-acesso-ops-v0.md`
