# Política de Segurança e Acesso Interno (Ops) — versão editorial v1 (Covivo)

> Minuta para revisão jurídica e validação de segurança da informação.

## 1. Objetivo
Esta política define as regras de segurança e controle de acesso ao ambiente interno de operação do Covivo (BackOffice/Ops), com foco em proteção de dados, prevenção de abuso e rastreabilidade de ações críticas.

## 2. Escopo
Esta política se aplica a:
- equipe interna autorizada do Covivo;
- terceiros autorizados com função operacional específica;
- sistemas e interfaces de BackOffice.

Não se aplica ao uso comum do aplicativo por usuários finais, que é regido pelos Termos de Uso e políticas externas correspondentes.

## 3. Princípios
A operação interna observará, no mínimo:
- menor privilégio;
- necessidade de acesso;
- segregação de funções;
- rastreabilidade completa;
- revisão periódica de permissões;
- proteção de dados por padrão.

## 4. Perfis internos e autorização
O acesso Ops é separado dos papéis de usuário do app (admin/sponsor/membro de grupo).

Papéis internos:
- **ops_readonly**: consulta operacional sem ação modificadora;
- **ops_agent**: tratamento de casos operacionais e SAC conforme alçada;
- **ops_manager**: ações críticas e aprovações excepcionais.

Qualquer ação fora da alçada do perfil deve ser bloqueada.

## 5. Regras de acesso
- Acesso ao BackOffice apenas com credenciais individuais.
- Acesso compartilhado é proibido.
- MFA obrigatório para perfis críticos e recomendado para todos os perfis Ops.
- Sessões devem expirar automaticamente após período de inatividade.

## 6. Ações críticas e trilha auditável
Toda ação crítica em Ops deve gerar registro auditável contendo, no mínimo:
- operador responsável;
- data/hora;
- ação executada;
- entidade afetada (grupo/caso/assinatura);
- regra aplicada;
- justificativa.

Sem justificativa obrigatória, a ação crítica deve ser bloqueada.

## 7. Conflito de interesse operacional
Agente Ops com potencial conflito de interesse não deve decidir o caso.
Nestes cenários, o caso deve ser reatribuído para outro agente elegível.

## 8. Dados pessoais e minimização
No ambiente Ops, o acesso a dados pessoais deve ser limitado ao estritamente necessário para a finalidade operacional do caso.
Quando possível, dados sensíveis devem ser mascarados em exibição padrão.

## 9. Extração e exportação de dados
Exportações de dados em volume ou com PII devem seguir controles reforçados:
- autorização por perfil adequado;
- justificativa registrada;
- escopo mínimo necessário;
- rastreamento do evento.

## 10. Incidentes de segurança
Suspeitas de acesso indevido, vazamento, abuso de privilégio ou manipulação indevida devem ser registradas e escaladas conforme fluxo de resposta a incidente.

## 11. Revisão de acessos
Permissões Ops devem ser revisadas periodicamente e imediatamente após mudança de função, desligamento ou encerramento de contrato.

## 12. Integração com outras políticas
Esta política deve ser lida em conjunto com:
- Política de Privacidade;
- Política de Disputas e SAC;
- Termos de Uso;
- Regras internas de segurança da informação.

## 13. Alterações e vigência
Esta política pode ser atualizada periodicamente. Alterações materiais devem ser comunicadas aos envolvidos e podem exigir novo aceite interno.
