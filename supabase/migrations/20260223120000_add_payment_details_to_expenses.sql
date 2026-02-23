-- Add new columns to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES public.credit_cards(id),
ADD COLUMN IF NOT EXISTS installments integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS purchase_date date DEFAULT CURRENT_DATE;

-- Update the RPC function to accept new parameters
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  _group_id uuid,
  _title text,
  _description text DEFAULT NULL::text,
  _amount numeric DEFAULT 0,
  _category text DEFAULT 'other'::text,
  _expense_type text DEFAULT 'collective'::text,
  _due_date date DEFAULT NULL::date,
  _receipt_url text DEFAULT NULL::text,
  _recurring_expense_id uuid DEFAULT NULL::uuid,
  _target_user_id uuid DEFAULT NULL::uuid,
  -- New parameters
  _payment_method text DEFAULT 'cash',
  _credit_card_id uuid DEFAULT NULL::uuid,
  _installments integer DEFAULT 1,
  _purchase_date date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _expense_id uuid;
  _caller_id uuid := auth.uid();
  _member record;
  _member_count int;
  _split_amount numeric(12,2);
  _group_rule text;
  _final_purchase_date date;
BEGIN
  -- Default purchase date to today if null
  _final_purchase_date := COALESCE(_purchase_date, CURRENT_DATE);

  -- Auth check
  IF NOT has_role_in_group(_caller_id, _group_id, 'admin') AND _expense_type = 'collective' THEN
    RAISE EXCEPTION 'Only admins can create collective expenses';
  END IF;

  -- Input validation
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF length(_title) > 200 THEN
    RAISE EXCEPTION 'Title too long';
  END IF;

  -- Create expense
  INSERT INTO public.expenses (
    group_id, created_by, title, description, amount, category, 
    expense_type, due_date, receipt_url, recurring_expense_id,
    payment_method, credit_card_id, installments, purchase_date
  )
  VALUES (
    _group_id, _caller_id, _title, _description, _amount, _category, 
    _expense_type, _due_date, _receipt_url, _recurring_expense_id,
    _payment_method, _credit_card_id, _installments, _final_purchase_date
  )
  RETURNING id INTO _expense_id;

  -- Create splits
  IF _expense_type = 'individual' AND _target_user_id IS NOT NULL THEN
    -- Individual expense: assign to specific user
    INSERT INTO expense_splits (expense_id, user_id, amount)
    VALUES (_expense_id, _target_user_id, _amount);
  ELSE
    -- Collective expense: split among active members
    SELECT splitting_rule::text INTO _group_rule FROM public.groups WHERE id = _group_id;

    IF _group_rule = 'equal' THEN
      SELECT count(*) INTO _member_count
      FROM public.group_members WHERE group_id = _group_id AND active = true;

      _split_amount := round(_amount / _member_count, 2);

      FOR _member IN
        SELECT user_id FROM public.group_members WHERE group_id = _group_id AND active = true
      LOOP
        INSERT INTO expense_splits (expense_id, user_id, amount)
        VALUES (_expense_id, _member.user_id, _split_amount);
      END LOOP;
    ELSE
      -- Percentage-based split
      FOR _member IN
        SELECT user_id, coalesce(split_percentage, 0) as pct
        FROM public.group_members WHERE group_id = _group_id AND active = true
      LOOP
        _split_amount := round(_amount * _member.pct / 100, 2);
        INSERT INTO expense_splits (expense_id, user_id, amount)
        VALUES (_expense_id, _member.user_id, _split_amount);
      END LOOP;
    END IF;
  END IF;

  -- Audit log
  PERFORM create_audit_log(_group_id, _caller_id, 'create', 'expense', _expense_id,
    jsonb_build_object('title', _title, 'amount', _amount, 'type', _expense_type));

  RETURN _expense_id;
END;
$function$;