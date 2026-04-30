-- Create expense_receipts table
CREATE TABLE public.expense_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view expense receipts"
ON public.expense_receipts FOR SELECT
USING ( is_member_of_group(auth.uid(), (SELECT group_id FROM expenses WHERE id = expense_id)) );

CREATE POLICY "Can insert receipts if admin or creator of individual expense"
ON public.expense_receipts FOR INSERT
WITH CHECK (
  (SELECT has_role_in_group(auth.uid(), group_id, 'admin') FROM expenses WHERE id = expense_id)
  OR
  (SELECT created_by = auth.uid() AND expense_type = 'individual' FROM expenses WHERE id = expense_id)
);

CREATE POLICY "Can update receipts if admin or creator of individual expense"
ON public.expense_receipts FOR UPDATE
USING (
  (SELECT has_role_in_group(auth.uid(), group_id, 'admin') FROM expenses WHERE id = expense_id)
  OR
  (SELECT created_by = auth.uid() AND expense_type = 'individual' FROM expenses WHERE id = expense_id)
);

CREATE POLICY "Can delete receipts if admin or creator of individual expense"
ON public.expense_receipts FOR DELETE
USING (
  (SELECT has_role_in_group(auth.uid(), group_id, 'admin') FROM expenses WHERE id = expense_id)
  OR
  (SELECT created_by = auth.uid() AND expense_type = 'individual' FROM expenses WHERE id = expense_id)
);