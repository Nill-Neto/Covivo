CREATE OR REPLACE FUNCTION public.compute_card_competence(_purchase_date date, _card_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _base_date date := COALESCE(_purchase_date, CURRENT_DATE);
  _card_closing_day int;
  _effective_closing_day int;
  _comp_date date;
BEGIN
  IF _card_id IS NULL THEN
    RAISE EXCEPTION 'Cartão de crédito é obrigatório para calcular competência de cartão';
  END IF;

  SELECT cc.closing_day
    INTO _card_closing_day
    FROM public.credit_cards cc
   WHERE cc.id = _card_id;

  IF _card_closing_day IS NULL THEN
    RAISE EXCEPTION 'Não foi possível resolver closing_day do cartão (card_id=%)', _card_id;
  END IF;

  _effective_closing_day := LEAST(
    GREATEST(_card_closing_day, 1),
    EXTRACT(DAY FROM (date_trunc('month', _base_date)::date + INTERVAL '1 month - 1 day'))::int
  );

  _comp_date := date_trunc('month', _base_date)::date;
  IF EXTRACT(DAY FROM _base_date)::int >= _effective_closing_day THEN
    _comp_date := (_comp_date + INTERVAL '1 month')::date;
  END IF;

  RETURN to_char(_comp_date, 'YYYY-MM');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_expense_with_splits_v2(
  _group_id uuid,
  _created_by uuid,
  _title text,
  _description text DEFAULT NULL,
  _amount numeric DEFAULT 0,
  _category text DEFAULT 'other',
  _expense_type text DEFAULT 'collective',
  _due_date date DEFAULT NULL,
  _receipt_url text DEFAULT NULL,
  _recurring_expense_id uuid DEFAULT NULL,
  _target_user_id uuid DEFAULT NULL,
  _payment_method text DEFAULT 'cash',
  _credit_card_id uuid DEFAULT NULL,
  _installments integer DEFAULT 1,
  _purchase_date date DEFAULT NULL,
  _participant_user_ids uuid[] DEFAULT NULL,
  _competence_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _expense_id uuid;
  _caller_id uuid := _created_by;
  _member record;
  _participant_id uuid;
  _member_count int;
  _split_amount numeric(12,2);
  _group_rule text;
  _final_purchase_date date;
  _per_installment numeric(12,2);
  _closing_day int;
  _bill_month int;
  _bill_year int;
  _bill_base date;
  _effective_participants uuid[];
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário criador da despesa não pode ser nulo';
  END IF;

  _final_purchase_date := COALESCE(_purchase_date, CURRENT_DATE);
  _effective_participants := COALESCE(_participant_user_ids, ARRAY[]::uuid[]);

  IF _payment_method = 'credit_card' THEN
    _competence_key := public.compute_card_competence(_final_purchase_date, _credit_card_id);
  END IF;

  IF NOT has_role_in_group(_caller_id, _group_id, 'admin') AND _expense_type = 'collective' THEN
    RAISE EXCEPTION 'Apenas administradores podem criar despesas coletivas';
  END IF;

  IF _expense_type = 'collective' THEN
    IF array_length(_effective_participants, 1) IS NULL THEN
      SELECT array_agg(gm.user_id ORDER BY gm.user_id)
      INTO _effective_participants
      FROM public.group_members gm
      WHERE gm.group_id = _group_id
        AND gm.active = true
        AND gm.participates_in_splits = true;
    ELSE
      SELECT array_agg(gm.user_id ORDER BY gm.user_id)
      INTO _effective_participants
      FROM public.group_members gm
      WHERE gm.group_id = _group_id
        AND gm.active = true
        AND gm.user_id = ANY(_effective_participants);
    END IF;

    IF array_length(_effective_participants, 1) IS NULL THEN
      RAISE EXCEPTION 'Despesa coletiva deve ter ao menos 1 participante';
    END IF;
  ELSE
    IF array_length(_effective_participants, 1) IS NULL THEN
      _effective_participants := ARRAY[COALESCE(_target_user_id, _caller_id)];
    END IF;

    IF array_length(_effective_participants, 1) <> 1 THEN
      RAISE EXCEPTION 'Despesa individual deve ter exatamente 1 participante';
    END IF;
  END IF;

  INSERT INTO public.expenses (
    group_id, created_by, title, description, amount, category,
    expense_type, due_date, receipt_url, recurring_expense_id,
    payment_method, credit_card_id, installments, purchase_date, competence_key
  ) VALUES (
    _group_id, _caller_id, _title, _description, _amount, _category,
    _expense_type, _due_date, _receipt_url, _recurring_expense_id,
    _payment_method, _credit_card_id, _installments, _final_purchase_date, _competence_key
  ) RETURNING id INTO _expense_id;

  IF _expense_type = 'individual' THEN
    INSERT INTO expense_splits (expense_id, user_id, amount, credor_user_id)
    VALUES (_expense_id, _effective_participants[1], _amount, _caller_id);
  ELSE
    SELECT count(*) INTO _member_count
    FROM unnest(_effective_participants) AS participant_id;

    IF _member_count < 1 THEN
      RAISE EXCEPTION 'Despesa coletiva deve ter ao menos 1 participante';
    END IF;

    SELECT splitting_rule::text INTO _group_rule FROM public.groups WHERE id = _group_id;

    IF _group_rule = 'equal' OR array_length(_participant_user_ids, 1) IS NOT NULL THEN
      _split_amount := round(_amount / _member_count, 2);
      FOREACH _participant_id IN ARRAY _effective_participants LOOP
        INSERT INTO expense_splits (expense_id, user_id, amount, credor_user_id)
        VALUES (_expense_id, _participant_id, _split_amount, _caller_id);
      END LOOP;
    ELSE
      FOR _member IN
        SELECT gm.user_id, COALESCE(gm.split_percentage, 0) AS pct
        FROM public.group_members gm
        WHERE gm.group_id = _group_id
          AND gm.active = true
          AND gm.participates_in_splits = true
          AND gm.user_id = ANY(_effective_participants)
      LOOP
        _split_amount := round(_amount * _member.pct / 100, 2);
        INSERT INTO expense_splits (expense_id, user_id, amount, credor_user_id)
        VALUES (_expense_id, _member.user_id, _split_amount, _caller_id);
      END LOOP;
    END IF;
  END IF;

  IF _payment_method = 'credit_card' AND _credit_card_id IS NOT NULL AND _installments > 0 THEN
    SELECT closing_day INTO _closing_day FROM public.credit_cards WHERE id = _credit_card_id;
    IF _closing_day IS NULL THEN
      RAISE EXCEPTION 'Não foi possível resolver closing_day do cartão (card_id=%)', _credit_card_id;
    END IF;

    _bill_base := _final_purchase_date;
    IF EXTRACT(DAY FROM _final_purchase_date) >= _closing_day THEN
      _bill_base := _bill_base + interval '1 month';
    END IF;
    _per_installment := round(_amount / _installments, 2);
    FOR i IN 1.._installments LOOP
      _bill_month := EXTRACT(MONTH FROM _bill_base + ((i-1) * interval '1 month'));
      _bill_year := EXTRACT(YEAR FROM _bill_base + ((i-1) * interval '1 month'));
      INSERT INTO public.expense_installments (user_id, expense_id, installment_number, amount, bill_month, bill_year)
      VALUES (_caller_id, _expense_id, i, _per_installment, _bill_month, _bill_year);
    END LOOP;
  END IF;

  RETURN _expense_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_expense_competence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _group_closing_day int;
  _effective_closing_day int;
  _base_date date;
  _comp_key text;
  _comp_date date;
BEGIN
  _base_date := COALESCE(NEW.purchase_date, CURRENT_DATE);

  IF NEW.payment_method = 'credit_card' THEN
    _comp_key := public.compute_card_competence(_base_date, NEW.credit_card_id);
    NEW.competence_key := _comp_key;
    NEW.competence_year := split_part(_comp_key, '-', 1)::int;
    NEW.competence_month := split_part(_comp_key, '-', 2)::int;
    RETURN NEW;
  END IF;

  IF NEW.competence_key IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.competence_key IS DISTINCT FROM OLD.competence_key) THEN
    BEGIN
      NEW.competence_year := split_part(NEW.competence_key, '-', 1)::int;
      NEW.competence_month := split_part(NEW.competence_key, '-', 2)::int;
      RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
    END;
  END IF;

  SELECT g.closing_day
    INTO _group_closing_day
    FROM public.groups g
   WHERE g.id = NEW.group_id;

  _effective_closing_day := LEAST(
    GREATEST(COALESCE(_group_closing_day, 1), 1),
    EXTRACT(DAY FROM (date_trunc('month', _base_date)::date + INTERVAL '1 month - 1 day'))::int
  );

  _comp_date := date_trunc('month', _base_date)::date;
  IF EXTRACT(DAY FROM _base_date)::int >= _effective_closing_day THEN
    _comp_date := (_comp_date + INTERVAL '1 month')::date;
  END IF;

  NEW.competence_year := EXTRACT(YEAR FROM _comp_date)::int;
  NEW.competence_month := EXTRACT(MONTH FROM _comp_date)::int;
  NEW.competence_key := to_char(_comp_date, 'YYYY-MM');

  RETURN NEW;
END;
$$;
