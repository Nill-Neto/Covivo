# Covivo — Blueprint de Políticas e Termos (v1)

> Rascunho estruturado para revisão jurídica formal.
> Este documento NÃO substitui parecer de advogado.

## 1) Pacote mínimo de documentos legais
1. Termos de Uso
2. Política de Privacidade (LGPD)
3. Política de Cobrança, Cancelamento e Reativação
4. Política de Disputas e Evidências (SAC)
5. Política de Saída, Remoção e Exclusão de Conta
6. Política de Segurança e Acesso Interno (Ops)

---

## 2) Decisões-base já aceitas para refletir nos textos

## 2.1 Status de aceite das decisões-base
- Status: **ACEITAS pelo produto** e pendentes apenas de formalização jurídica.

- Seat ativo: modelo híbrido (atividade financeira relevante no ciclo).
- Retenção técnica em pseudonimização com pendência: 5 anos (validar juridicamente).
- Escalonamento automático de disputa sem acordo: 48h.
- Reativação do Pro: qualquer admin elegível; override ops só em exceção auditada.
- Gate de release bloqueia deploy se invariante crítico falhar.

---

## 3) Estrutura recomendada por documento

## 3.1 Termos de Uso
- Objeto do serviço.
- Elegibilidade (18+ no v1).
- Papéis e responsabilidades (admin, sponsor, membro).
- Regras de uso e conduta.
- Limitações de responsabilidade.
- Suspensão, downgrade e encerramento.
- Alterações dos termos e aceite de versões.
- Foro e lei aplicável.

## 3.2 Política de Privacidade (LGPD)
- Dados coletados e finalidades.
- Bases legais por tratamento.
- Compartilhamento e operadores.
- Retenção e descarte.
- Direitos do titular e canal de atendimento.
- Medidas de segurança.

## 3.3 Cobrança/Cancelamento/Reativação
- Planos e escopo (Solo/Duo/Max).
- Trial, grace e downgrade.
- Falha de pagamento e notificações.
- Reativação e troca de sponsor.
- Regras de cupons/campanhas (quando ativar).

## 3.4 Disputas e Evidências (SAC)
- Fluxo: contestação -> contraprova -> escalonamento.
- Prazos (48h/72h/7d).
- Evidência mínima exigida.
- Regras de conflito de interesse.
- Formato da decisão auditável.

## 3.5 Saída/Remoção/Exclusão
- Tipos de saída.
- Definição de pendência financeira.
- Data efetiva (fim de ciclo por padrão).
- Snapshot obrigatório.
- Pseudonimização com pendência crítica.

## 3.6 Segurança e Acesso Ops
- RBAC interno (`ops_readonly`, `ops_agent`, `ops_manager`).
- Princípio do menor privilégio.
- MFA para perfis críticos.
- Trilhas auditáveis obrigatórias.

---

## 4) Requisitos de implementação jurídica no produto
- Aceite explícito por documento e versão.
- Registro de timestamp e versão aceita.
- Reaceite obrigatório para mudança material.
- Histórico de versões disponível ao usuário.

---

## 5) Checklist de revisão jurídica (antes de publicar)
- Coerência entre texto legal e comportamento real do sistema.
- Ausência de cláusulas abusivas (CDC).
- Transparência e minimização de dados (LGPD).
- Adequação de retenção e descarte.
- Clareza de responsabilidade em disputas e cobrança.

---

## 6) Próximo passo
Transformar este blueprint em minutas jurídicas formais, revisar com advogado e só então publicar no app.
