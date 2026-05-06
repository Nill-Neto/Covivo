ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS auto_competence_key text,
  ADD COLUMN IF NOT EXISTS manual_competence_key text,
  ADD COLUMN IF NOT EXISTS competence_override_reason text,
  ADD COLUMN IF NOT EXISTS competence_overridden_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS competence_overridden_at timestamptz;

UPDATE public.expenses
SET auto_competence_key = COALESCE(auto_competence_key, competence_key)
WHERE auto_competence_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_manual_competence_key
  ON public.expenses (manual_competence_key)
  WHERE manual_competence_key IS NOT NULL;
