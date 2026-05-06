-- Recreate expenses triggers explicitly at the end of the migration chain
-- to remove potential ghost trigger versions and enforce predictable order.

-- 1) Credit-card enforcement trigger (fires first by name order).
DROP TRIGGER IF EXISTS trg_enforce_credit_card_expense_rules ON public.expenses;
CREATE TRIGGER trg_enforce_credit_card_expense_rules
BEFORE INSERT OR UPDATE
ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_credit_card_expense_rules();

-- 2) Competence derivation trigger (fires after enforcement by name order).
DROP TRIGGER IF EXISTS trg_set_expense_competence ON public.expenses;
CREATE TRIGGER trg_set_expense_competence
BEFORE INSERT OR UPDATE
ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_expense_competence();
