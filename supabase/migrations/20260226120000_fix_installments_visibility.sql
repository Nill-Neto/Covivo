-- Drop the restrictive policy that only allowed viewing own installments
DROP POLICY IF EXISTS "expense_installments_select_own" ON "public"."expense_installments";

-- Create a new, broader policy for viewing installments
CREATE POLICY "expense_installments_select_visible" ON "public"."expense_installments"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_installments.expense_id
    AND (
      -- Case 1: I created the expense
      e.created_by = auth.uid()
      -- Case 2: It is my installment (I paid with my card)
      OR expense_installments.user_id = auth.uid()
      -- Case 3: It is a collective expense and I am a group member
      OR (e.expense_type = 'collective' AND is_member_of_group(auth.uid(), e.group_id))
      -- Case 4: I am included in the split (e.g. individual expense for me)
      OR EXISTS (
        SELECT 1 FROM expense_splits es
        WHERE es.expense_id = e.id AND es.user_id = auth.uid()
      )
    )
  )
);