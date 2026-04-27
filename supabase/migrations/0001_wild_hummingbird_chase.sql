-- Drop the old function with the wrong return type
DROP FUNCTION IF EXISTS public.get_admin_member_competence_balances(uuid, text);

-- Create the new function with the correct return type, including the 'balance' column
CREATE OR REPLACE FUNCTION get_admin_member_competence_balances(
    _group_id UUID,
    _competence_key TEXT
)
RETURNS TABLE (
    user_id UUID,
    previous_debt NUMERIC,
    current_cycle_owed NUMERIC,
    current_cycle_paid NUMERIC,
    accrued_debt NUMERIC,
    balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH all_splits AS (
        SELECT
            s.user_id,
            e.competence_key,
            s.amount
        FROM expense_splits s
        JOIN expenses e ON s.expense_id = e.id
        WHERE e.group_id = _group_id AND e.expense_type = 'collective'
    ),
    all_payments AS (
        SELECT
            p.paid_by as user_id,
            p.competence_key,
            p.amount
        FROM payments p
        WHERE p.group_id = _group_id AND p.status = 'confirmed' AND p.paid_by IS NOT NULL
    ),
    previous_totals AS (
        SELECT
            gm.user_id,
            (
                COALESCE((SELECT SUM(s.amount) FROM all_splits s WHERE s.user_id = gm.user_id AND s.competence_key < _competence_key), 0)
                -
                COALESCE((SELECT SUM(p.amount) FROM all_payments p WHERE p.user_id = gm.user_id AND p.competence_key < _competence_key), 0)
            ) as total_previous_debt
        FROM group_members gm
        WHERE gm.group_id = _group_id
    ),
    current_cycle_totals AS (
        SELECT
            gm.user_id,
            COALESCE((SELECT SUM(s.amount) FROM all_splits s WHERE s.user_id = gm.user_id AND s.competence_key = _competence_key), 0) as owed,
            COALESCE((SELECT SUM(p.amount) FROM all_payments p WHERE p.user_id = gm.user_id AND p.competence_key = _competence_key), 0) as paid
        FROM group_members gm
        WHERE gm.group_id = _group_id
    )
    SELECT
        gm.user_id,
        pt.total_previous_debt as previous_debt,
        cct.owed as current_cycle_owed,
        cct.paid as current_cycle_paid,
        (pt.total_previous_debt + cct.owed - cct.paid) as accrued_debt,
        -(pt.total_previous_debt + cct.owed - cct.paid) as balance
    FROM group_members gm
    LEFT JOIN previous_totals pt ON gm.user_id = pt.user_id
    LEFT JOIN current_cycle_totals cct ON gm.user_id = cct.user_id
    WHERE gm.group_id = _group_id;
END;
$$ LANGUAGE plpgsql;