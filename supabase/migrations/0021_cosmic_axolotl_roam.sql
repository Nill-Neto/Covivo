CREATE OR REPLACE FUNCTION public.get_my_p2p_balances(_user_id uuid)
 RETURNS TABLE(other_user_id uuid, other_user_full_name text, other_user_avatar_url text, net_balance numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH user_relations AS (
        -- Collect all users I have pending transactions with
        SELECT user_id as other_user FROM expense_splits WHERE credor_user_id = _user_id AND status = 'pending'
        UNION
        SELECT credor_user_id as other_user FROM expense_splits WHERE user_id = _user_id AND status = 'pending'
    ),
    balances AS (
        SELECT
            ur.other_user,
            COALESCE(
                (SELECT SUM(s.amount) FROM expense_splits s WHERE s.credor_user_id = _user_id AND s.user_id = ur.other_user AND s.status = 'pending'),
                0
            ) -
            COALESCE(
                (SELECT SUM(s.amount) FROM expense_splits s WHERE s.user_id = _user_id AND s.credor_user_id = ur.other_user AND s.status = 'pending'),
                0
            ) as net_balance
        FROM user_relations ur
        WHERE ur.other_user IS NOT NULL AND ur.other_user <> _user_id
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
$function$