-- Drop function to be safe from signature conflicts
DROP FUNCTION IF EXISTS public.get_admin_dashboard_data(text, uuid);
DROP FUNCTION IF EXISTS public.get_admin_dashboard_data(uuid, text);

-- Recreate it with the correct signature and robust logic
CREATE OR REPLACE FUNCTION get_admin_dashboard_data(
    _group_id UUID,
    _competence_key TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'members', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'user_id', m.user_id,
                    'active', m.active,
                    'profile', prof.profile_data,
                    'role', r.role,
                    'balance', b.balance,
                    'previous_debt', b.previous_debt,
                    'current_cycle_owed', b.current_cycle_owed,
                    'current_cycle_paid', b.current_cycle_paid,
                    'accrued_debt', b.accrued_debt
                )
            )
            FROM group_members m
            LEFT JOIN get_admin_member_competence_balances(_group_id, _competence_key) b ON m.user_id = b.user_id
            LEFT JOIN (SELECT id, json_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url) as profile_data FROM profiles) prof ON prof.id = m.user_id
            LEFT JOIN (SELECT user_id, role FROM user_roles WHERE group_id = _group_id) r ON r.user_id = m.user_id
            WHERE m.group_id = _group_id AND m.active = true
        ), '[]'::json),
        'pendingPaymentsCount', (SELECT COUNT(*) FROM payments WHERE group_id = _group_id AND status = 'pending'),
        'exMembersDebt', (
            SELECT COALESCE(SUM(s.amount), 0)
            FROM expense_splits s
            JOIN expenses e ON s.expense_id = e.id
            WHERE e.group_id = _group_id
            AND s.status = 'pending'
            AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.user_id = s.user_id AND gm.group_id = _group_id AND gm.active = true)
        ),
        'departuresCount', (
            SELECT COUNT(*)
            FROM audit_log
            WHERE group_id = _group_id
            AND action = 'remove_member'
            AND created_at >= date_trunc('month', to_date(_competence_key, 'YYYY-MM'))
            AND created_at < date_trunc('month', to_date(_competence_key, 'YYYY-MM')) + interval '1 month'
        ),
        'redistributedCount', (
             SELECT COALESCE(SUM((details->>'redistributed_pending_splits')::int), 0)
             FROM audit_log
             WHERE group_id = _group_id
             AND action = 'remove_member'
             AND created_at >= date_trunc('month', to_date(_competence_key, 'YYYY-MM'))
             AND created_at < date_trunc('month', to_date(_competence_key, 'YYYY-MM')) + interval '1 month'
        ),
        'lowStockCount', (SELECT COUNT(*) FROM inventory_items WHERE group_id = _group_id AND quantity <= min_quantity),
        'cycleSplits', COALESCE((
            SELECT json_agg(s)
            FROM expense_splits s
            JOIN expenses e ON s.expense_id = e.id
            WHERE e.group_id = _group_id AND e.expense_type = 'collective' AND e.competence_key = _competence_key
        ), '[]'::json),
        'pendingSplits', COALESCE((
            SELECT json_agg(s)
            FROM expense_splits s
            JOIN expenses e ON s.expense_id = e.id
            WHERE e.group_id = _group_id AND e.expense_type = 'collective' AND s.status = 'pending'
        ), '[]'::json),
        'memberPaymentsByCompetence', COALESCE((
            SELECT json_object_agg(
                paid_by, competence_payments
            )
            FROM (
                SELECT
                    paid_by,
                    json_object_agg(competence_key, total_amount) as competence_payments
                FROM (
                    SELECT paid_by, competence_key, SUM(amount) as total_amount
                    FROM payments
                    WHERE group_id = _group_id AND status = 'confirmed' AND paid_by IS NOT NULL
                    GROUP BY paid_by, competence_key
                ) as user_competence_payments
                GROUP BY paid_by
            ) as user_payments
        ), '{}'::json),
        'nonCriticalWarnings', '[]'::json
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;