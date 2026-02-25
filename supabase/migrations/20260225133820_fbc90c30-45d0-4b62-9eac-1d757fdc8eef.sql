
-- Add expense_type to recurring_expenses (collective = admin only, individual = user's own)
ALTER TABLE public.recurring_expenses
ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'collective';

-- Drop old RLS policies
DROP POLICY IF EXISTS "Admin can create recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Admin can delete recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Admin can update recurring expenses" ON public.recurring_expenses;
DROP POLICY IF EXISTS "Members can view recurring expenses" ON public.recurring_expenses;

-- SELECT: Members can view collective recurrences in their group + own individual recurrences
CREATE POLICY "View recurring expenses"
ON public.recurring_expenses FOR SELECT TO authenticated
USING (
  is_member_of_group(auth.uid(), group_id)
  AND (
    expense_type = 'collective'
    OR created_by = auth.uid()
  )
);

-- INSERT: Admin can create collective; any member can create individual (own only)
CREATE POLICY "Create recurring expenses"
ON public.recurring_expenses FOR INSERT TO authenticated
WITH CHECK (
  is_member_of_group(auth.uid(), group_id)
  AND created_by = auth.uid()
  AND (
    (expense_type = 'collective' AND has_role_in_group(auth.uid(), group_id, 'admin'))
    OR expense_type = 'individual'
  )
);

-- UPDATE: Admin can update collective; creator can update own individual
CREATE POLICY "Update recurring expenses"
ON public.recurring_expenses FOR UPDATE TO authenticated
USING (
  is_member_of_group(auth.uid(), group_id)
  AND (
    (expense_type = 'collective' AND has_role_in_group(auth.uid(), group_id, 'admin'))
    OR (expense_type = 'individual' AND created_by = auth.uid())
  )
);

-- DELETE: Admin can delete collective; creator can delete own individual
CREATE POLICY "Delete recurring expenses"
ON public.recurring_expenses FOR DELETE TO authenticated
USING (
  is_member_of_group(auth.uid(), group_id)
  AND (
    (expense_type = 'collective' AND has_role_in_group(auth.uid(), group_id, 'admin'))
    OR (expense_type = 'individual' AND created_by = auth.uid())
  )
);
