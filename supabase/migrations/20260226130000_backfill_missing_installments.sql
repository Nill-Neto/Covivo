-- Function to backfill missing installments for credit card expenses
CREATE OR REPLACE FUNCTION public.backfill_missing_installments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exp RECORD;
  card RECORD;
  bill_date DATE;
  closing_day INT;
  i INT;
  inst_amount NUMERIC;
BEGIN
  -- Loop through credit card expenses that have NO installments
  FOR exp IN
    SELECT * FROM public.expenses e
    WHERE e.payment_method = 'credit_card'
    AND NOT EXISTS (
      SELECT 1 FROM public.expense_installments ei WHERE ei.expense_id = e.id
    )
  LOOP
    -- Get card closing day (default to 1 if card deleted or not found)
    SELECT * INTO card FROM public.credit_cards WHERE id = exp.credit_card_id;
    closing_day := COALESCE(card.closing_day, 1);

    -- Calculate base bill date
    bill_date := exp.purchase_date;
    IF EXTRACT(DAY FROM exp.purchase_date) >= closing_day THEN
      bill_date := bill_date + interval '1 month';
    END IF;

    -- Default installments to 1 if invalid
    IF exp.installments IS NULL OR exp.installments < 1 THEN
      exp.installments := 1;
    END IF;

    inst_amount := round(exp.amount / exp.installments, 2);

    -- Create installments
    FOR i IN 1..exp.installments LOOP
      INSERT INTO public.expense_installments (
        user_id,
        expense_id,
        installment_number,
        amount,
        bill_month,
        bill_year,
        created_at
      ) VALUES (
        exp.created_by,
        exp.id,
        i,
        inst_amount,
        EXTRACT(MONTH FROM bill_date)::INT,
        EXTRACT(YEAR FROM bill_date)::INT,
        exp.created_at
      );

      -- Move to next month
      bill_date := bill_date + interval '1 month';
    END LOOP;
  END LOOP;
END;
$$;

-- Run the backfill immediately
SELECT public.backfill_missing_installments();