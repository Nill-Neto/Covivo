CREATE OR REPLACE FUNCTION public.get_my_p2p_balances()
 RETURNS TABLE(other_user_id uuid, other_user_full_name text, other_user_avatar_url text, net_balance numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _user_id uuid := auth.uid();
BEGIN
    RETURN QUERY
    WITH user_relations AS (
        -- Collect all users I have transactions with
        SELECT s.user_id as other_user FROM expense_splits s WHERE s.credor_user_id = _user_id
        UNION
        SELECT s.credor_user_id as other_user FROM expense_splits s WHERE s.user_id = _user_id
        UNION
        SELECT p.recebedor_user_id as other_user FROM payments p WHERE p.pagador_user_id = _user_id
        UNION
        SELECT p.pagador_user_id as other_user FROM payments p WHERE p.recebedor_user_id = _user_id
    ),
    pending_debts AS (
        -- Money I owe to others from UNPAID splits
        SELECT s.credor_user_id as other_user, SUM(s.amount) as total
        FROM expense_splits s
        WHERE s.user_id = _user_id AND s.status = 'pending'
        GROUP BY s.credor_user_id
    ),
    pending_credits AS (
        -- Money others owe me from UNPAID splits
        SELECT s.user_id as other_user, SUM(s.amount) as total
        FROM expense_splits s
        WHERE s.credor_user_id = _user_id AND s.status = 'pending'
        GROUP BY s.user_id
    ),
    unapplied_payments_sent AS (
        -- Overpayments I sent that became credit
        SELECT p.recebedor_user_id as other_user, SUM((p.allocation_breakdown->>'unapplied_amount')::numeric) as total
        FROM payments p
        WHERE p.pagador_user_id = _user_id
          AND p.status = 'confirmed'
          AND p.allocation_breakdown->>'unapplied_amount' IS NOT NULL
          AND (p.allocation_breakdown->>'unapplied_amount')::numeric > 0.01
        GROUP BY p.recebedor_user_id
    ),
    unapplied_payments_received AS (
        -- Overpayments I received that are now my debt
        SELECT p.pagador_user_id as other_user, SUM((p.allocation_breakdown->>'unapplied_amount')::numeric) as total
        FROM payments p
        WHERE p.recebedor_user_id = _user_id
          AND p.status = 'confirmed'
          AND p.allocation_breakdown->>'unapplied_amount' IS NOT NULL
          AND (p.allocation_breakdown->>'unapplied_amount')::numeric > 0.01
        GROUP BY p.pagador_user_id
    )
    SELECT
        ur.other_user,
        p.full_name,
        p.avatar_url,
        (
            COALESCE((SELECT total FROM pending_credits pc WHERE pc.other_user = ur.other_user), 0)
            - COALESCE((SELECT total FROM pending_debts pd WHERE pd.other_user = ur.other_user), 0)
            + COALESCE((SELECT total FROM unapplied_payments_sent ups WHERE ups.other_user = ur.other_user), 0)
            - COALESCE((SELECT total FROM unapplied_payments_received upr WHERE upr.other_user = ur.other_user), 0)
        ) as net_balance
    FROM user_relations ur
    JOIN profiles p ON p.id = ur.other_user
    WHERE ur.other_user IS NOT NULL AND ur.other_user <> _user_id;
END;
$function$;