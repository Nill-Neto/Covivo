CREATE OR REPLACE FUNCTION public.get_group_balances_v2(_group_id uuid)
 RETURNS TABLE(user_id uuid, total_owed numeric, total_paid numeric, balance numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH 
  -- 1. Funded: Quanto cada usuário pagou originalmente nas despesas coletivas (CRÉDITO)
  funded AS (
    SELECT created_by as user_id, sum(amount) as amount
    FROM expenses 
    WHERE group_id = _group_id AND expense_type = 'collective'
    GROUP BY created_by
  ),
  -- 2. My Share: A parte de cada usuário nos rateios (DÉBITO)
  my_share AS (
    SELECT es.user_id, sum(es.amount) as amount
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = _group_id AND e.expense_type = 'collective'
    GROUP BY es.user_id
  ),
  -- 3. Paid Out: Reembolsos feitos via Pagamentos Confirmados (CRÉDITO)
  -- Quem pagou (paid_by) ganha crédito por ter acertado a dívida
  paid_out AS (
    SELECT paid_by as user_id, sum(amount) as amount
    FROM payments
    WHERE group_id = _group_id AND status = 'confirmed'
    GROUP BY paid_by
  ),
  -- 4. Received: Reembolsos recebidos (DÉBITO NO SALDO A RECEBER)
  -- Quem criou a despesa original recebe o pagamento, logo seu saldo 'a receber' diminui
  received AS (
    SELECT e.created_by as user_id, sum(p.amount) as amount
    FROM payments p
    JOIN expense_splits es ON p.expense_split_id = es.id
    JOIN expenses e ON es.expense_id = e.id
    WHERE p.group_id = _group_id AND p.status = 'confirmed'
    GROUP BY e.created_by
  )
  SELECT 
    gm.user_id,
    -- Visualização: Total da 'Minha Parte' acumulada
    coalesce(s.amount, 0) as total_owed,
    
    -- Visualização: Total que eu já paguei de reembolsos
    coalesce(p.amount, 0) as total_paid,
    
    -- CÁLCULO FINAL DO SALDO:
    -- (O que paguei na loja) - (Minha parte) + (O que paguei p/ admin) - (O que recebi de outros)
    (
      coalesce(f.amount, 0) -   -- Funded (+)
      coalesce(s.amount, 0) +   -- Share (-)
      coalesce(p.amount, 0) -   -- Paid Out (+)
      coalesce(r.amount, 0)     -- Received (-)
    ) as balance
  FROM group_members gm
  LEFT JOIN funded f ON f.user_id = gm.user_id
  LEFT JOIN my_share s ON s.user_id = gm.user_id
  LEFT JOIN paid_out p ON p.user_id = gm.user_id
  LEFT JOIN received r ON r.user_id = gm.user_id
  WHERE gm.group_id = _group_id AND gm.active = true;
$function$;