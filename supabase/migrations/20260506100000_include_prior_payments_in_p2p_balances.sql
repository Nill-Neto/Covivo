CREATE OR REPLACE FUNCTION public.get_my_p2p_balances()
RETURNS TABLE(
  other_user_id uuid,
  other_user_full_name text,
  other_user_avatar_url text,
  net_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid := auth.uid();
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  WITH split_paid_amounts AS (
    SELECT
      p.expense_split_id,
      SUM(p.amount)::numeric AS paid_amount
    FROM public.payments p
    WHERE p.expense_split_id IS NOT NULL
      AND p.status IN ('pending', 'confirmed')
    GROUP BY p.expense_split_id
  ),
  effective_splits AS (
    SELECT
      es.id,
      es.user_id,
      es.credor_user_id,
      GREATEST(es.amount - COALESCE(spa.paid_amount, 0), 0)::numeric AS open_amount,
      e.group_id
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
    LEFT JOIN split_paid_amounts spa ON spa.expense_split_id = es.id
    WHERE (_caller_id = es.user_id OR _caller_id = es.credor_user_id)
      AND es.user_id <> es.credor_user_id
  ),
  pending_balances AS (
    SELECT
      CASE WHEN es.user_id = _caller_id THEN es.credor_user_id ELSE es.user_id END AS counterparty_id,
      CASE WHEN es.credor_user_id = _caller_id THEN es.open_amount ELSE -es.open_amount END AS signed_amount,
      es.group_id
    FROM effective_splits es
    WHERE es.open_amount > 0
  ),
  filtered AS (
    SELECT pb.counterparty_id, pb.signed_amount
    FROM pending_balances pb
    WHERE EXISTS (
      SELECT 1
      FROM public.group_members gm_caller
      WHERE gm_caller.group_id = pb.group_id
        AND gm_caller.user_id = _caller_id
        AND gm_caller.active = true
    )
      AND EXISTS (
      SELECT 1
      FROM public.group_members gm_other
      WHERE gm_other.group_id = pb.group_id
        AND gm_other.user_id = pb.counterparty_id
        AND gm_other.active = true
    )
  ),
  aggregated AS (
    SELECT counterparty_id, SUM(signed_amount) AS total_balance
    FROM filtered
    GROUP BY counterparty_id
    HAVING SUM(signed_amount) <> 0
  )
  SELECT a.counterparty_id, p.full_name, p.avatar_url, a.total_balance
  FROM aggregated a
  JOIN public.profiles p ON p.id = a.counterparty_id;
END;
$function$;
