CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id uuid, _status text DEFAULT 'confirmed'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _payment record;
  _caller_id uuid := auth.uid();
BEGIN
  SELECT * INTO _payment FROM public.payments WHERE id = _payment_id;

  IF _payment IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF NOT has_role_in_group(_caller_id, _payment.group_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can confirm payments';
  END IF;

  IF _status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.payments
  SET status = _status, confirmed_by = _caller_id, confirmed_at = now()
  WHERE id = _payment_id;

  -- Logic for confirmed payments
  IF _status = 'confirmed' THEN
    
    IF _payment.expense_split_id IS NOT NULL THEN
      -- Case 1: Payment linked to a specific split (Individual payment)
      UPDATE public.expense_splits
      SET status = 'paid', paid_at = now()
      WHERE id = _payment.expense_split_id;
      
    ELSE
      -- Case 2: Batch/Total payment (No specific split linked)
      -- Mark ALL pending splits for this user in this group as paid
      -- Note: In a real-world scenario we might want to match exact amounts, 
      -- but for this app "paying the balance" implies clearing pending debts.
      UPDATE public.expense_splits es
      SET status = 'paid', paid_at = now()
      FROM public.expenses e
      WHERE es.expense_id = e.id
      AND e.group_id = _payment.group_id
      AND es.user_id = _payment.paid_by
      AND es.status = 'pending';
    END IF;

    -- Notify payer
    PERFORM create_notification(
      _payment.paid_by, _payment.group_id,
      'Pagamento confirmado',
      'Seu pagamento de R$ ' || _payment.amount || ' foi confirmado.',
      'payment_confirmed',
      jsonb_build_object('payment_id', _payment_id::text, 'amount', _payment.amount)
    );

  ELSE
    -- Notify rejection
    PERFORM create_notification(
      _payment.paid_by, _payment.group_id,
      'Pagamento recusado',
      'Seu pagamento de R$ ' || _payment.amount || ' foi recusado.',
      'payment_rejected',
      jsonb_build_object('payment_id', _payment_id::text, 'amount', _payment.amount)
    );
  END IF;

  -- Audit
  PERFORM create_audit_log(_payment.group_id, _caller_id, _status, 'payment', _payment_id,
    jsonb_build_object('amount', _payment.amount, 'paid_by', _payment.paid_by::text));
END;
$function$;