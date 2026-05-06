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
    balances AS (
        SELECT
            ur.other_user,
            -- (Total they should have paid me) - (Total they have actually paid me)
            (
                COALESCE((SELECT SUM(s.amount) FROM expense_splits s WHERE s.user_id = ur.other_user AND s.credor_user_id = _user_id), 0)
                -
                COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.pagador_user_id = ur.other_user AND p.recebedor_user_id = _user_id AND p.status = 'confirmed'), 0)
            )
            -
            -- (Total I should have paid them) - (Total I have actually paid them)
            (
                COALESCE((SELECT SUM(s.amount) FROM expense_splits s WHERE s.user_id = _user_id AND s.credor_user_id = ur.other_user), 0)
                -
                COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.pagador_user_id = _user_id AND p.recebedor_user_id = ur.other_user AND p.status = 'confirmed'), 0)
            ) as net_balance
        FROM user_relations ur
        WHERE ur.other_user IS NOT NULL AND ur.other_user <> _user_id
        GROUP BY ur.other_user
    )
    SELECT
        b.other_user,
        p.full_name,
        p.avatar_url,
        b.net_balance
    FROM balances b
    JOIN profiles p ON p.id = b.other_user
    WHERE b.net_balance <> 0;
END;
$function$;