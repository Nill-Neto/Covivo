-- Drop function first to ensure clean replace if signature changed (though it hasn't)
DROP FUNCTION IF EXISTS public.get_member_balances(_group_id uuid);

CREATE OR REPLACE FUNCTION public.get_member_balances(_group_id uuid)
 RETURNS TABLE(user_id uuid, total_owed numeric, total_paid numeric, balance numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    es.user_id,
    -- Sum of amounts this user owes (splits)
    coalesce(sum(es.amount), 0) as total_owed,
    -- Sum of amounts this user has paid (splits marked as paid)
    coalesce(sum(CASE WHEN es.status = 'paid' THEN es.amount ELSE 0 END), 0) as total_paid,
    -- Balance = Paid - Owed (Negative means they owe money)
    coalesce(sum(CASE WHEN es.status = 'paid' THEN es.amount ELSE 0 END), 0) -
    coalesce(sum(es.amount), 0) as balance
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  WHERE e.group_id = _group_id
    -- CRITICAL: Only include collective expenses. 
    -- Individual expenses (even if on credit card or paid by admin) should NOT affect the group balance.
    AND e.expense_type = 'collective'
    AND is_member_of_group(auth.uid(), _group_id)
  GROUP BY es.user_id;
$function$;