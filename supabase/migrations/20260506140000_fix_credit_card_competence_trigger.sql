-- Deterministic rule for credit-card expenses:
-- competence follows card closing day (>= closes to next competence), independent of group closing day.
-- Do not mutate purchase_date.

CREATE OR REPLACE FUNCTION public.enforce_credit_card_expense_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _card_closing_day int;
  _effective_closing_day int;
  _base_date date;
  _comp_date date;
  _last_day int;
BEGIN
  IF NEW.payment_method <> 'credit_card' THEN
    RETURN NEW;
  END IF;

  NEW.paid_to_provider := true;

  IF NEW.credit_card_id IS NULL THEN
    RAISE EXCEPTION 'Cartão de crédito é obrigatório para despesas em cartão';
  END IF;

  _base_date := COALESCE(NEW.purchase_date, CURRENT_DATE);

  SELECT closing_day INTO _card_closing_day
  FROM public.credit_cards
  WHERE id = NEW.credit_card_id;

  IF _card_closing_day IS NULL THEN
    RAISE EXCEPTION 'Não foi possível carregar o fechamento do cartão selecionado';
  END IF;

  _last_day := EXTRACT(DAY FROM (date_trunc('month', _base_date)::date + INTERVAL '1 month - 1 day'))::int;
  _effective_closing_day := LEAST(GREATEST(_card_closing_day, 1), _last_day);

  _comp_date := date_trunc('month', _base_date)::date;
  IF EXTRACT(DAY FROM _base_date)::int >= _effective_closing_day THEN
    _comp_date := (_comp_date + INTERVAL '1 month')::date;
  END IF;

  NEW.competence_key := to_char(_comp_date, 'YYYY-MM');
  NEW.competence_year := EXTRACT(YEAR FROM _comp_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _comp_date)::int;

  RETURN NEW;
END;
$$;
