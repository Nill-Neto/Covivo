ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS credit_card_id uuid NULL REFERENCES public.credit_cards(id),
  ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS purchase_date date NOT NULL DEFAULT CURRENT_DATE;

COMMENT ON COLUMN public.expenses.payment_method IS 'Forma de pagamento usada para registrar a despesa';
COMMENT ON COLUMN public.expenses.credit_card_id IS 'Cartão usado quando payment_method = credit_card';
COMMENT ON COLUMN public.expenses.installments IS 'Quantidade de parcelas para cartões';
COMMENT ON COLUMN public.expenses.purchase_date IS 'Data da compra';