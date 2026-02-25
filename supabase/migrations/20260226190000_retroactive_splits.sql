-- Função para recalcular rateios do ciclo atual quando alguém entra
CREATE OR REPLACE FUNCTION public.handle_new_group_member_retroactive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _group_closing_day int;
  _cycle_start date;
  _cycle_end date;
  _expense record;
  _total_members int;
  _new_split_amount numeric;
  _splitting_rule text;
BEGIN
  -- 1. Buscar configurações do grupo
  SELECT closing_day, splitting_rule::text INTO _group_closing_day, _splitting_rule
  FROM public.groups WHERE id = NEW.group_id;

  -- Apenas para regra de divisão IGUALITÁRIA (Percentage é muito complexo para automático)
  IF _splitting_rule != 'equal' THEN
    RETURN NEW;
  END IF;

  -- 2. Calcular datas do ciclo atual
  -- Se hoje é dia 15 e fecha dia 10 -> Ciclo começou dia 10 deste mês
  -- Se hoje é dia 5 e fecha dia 10 -> Ciclo começou dia 10 do mês passado
  IF EXTRACT(DAY FROM CURRENT_DATE) >= _group_closing_day THEN
    _cycle_start := make_date(extract(year from current_date)::int, extract(month from current_date)::int, _group_closing_day);
  ELSE
    _cycle_start := make_date(extract(year from (current_date - interval '1 month'))::int, extract(month from (current_date - interval '1 month'))::int, _group_closing_day);
  END IF;
  
  -- Fim do ciclo é 1 mês depois do início
  _cycle_end := _cycle_start + interval '1 month';

  -- 3. Contar quantos membros ativos existem AGORA (incluindo o novo)
  SELECT count(*) INTO _total_members 
  FROM public.group_members 
  WHERE group_id = NEW.group_id AND active = true;

  -- Evitar divisão por zero (segurança)
  IF _total_members < 1 THEN RETURN NEW; END IF;

  -- 4. Iterar sobre todas as despesas COLETIVAS dentro do ciclo vigente
  FOR _expense IN
    SELECT id, amount
    FROM public.expenses
    WHERE group_id = NEW.group_id
      AND expense_type = 'collective'
      AND purchase_date >= _cycle_start
      AND purchase_date < _cycle_end
  LOOP
    -- Calcular novo valor por pessoa (Valor Total / Novo nº de pessoas)
    _new_split_amount := round(_expense.amount / _total_members, 2);

    -- A. Inserir split para o NOVO usuário
    -- Verifica se já não existe para não duplicar
    IF NOT EXISTS (SELECT 1 FROM public.expense_splits WHERE expense_id = _expense.id AND user_id = NEW.user_id) THEN
        INSERT INTO public.expense_splits (expense_id, user_id, amount, status)
        VALUES (_expense.id, NEW.user_id, _new_split_amount, 'pending');
    END IF;

    -- B. Atualizar o valor para TODOS os outros usuários daquela despesa
    -- Nota: Isso altera até splits já pagos. No sistema de saldos, quem pagou a mais ficará com crédito.
    UPDATE public.expense_splits
    SET amount = _new_split_amount
    WHERE expense_id = _expense.id;

  END LOOP;

  RETURN NEW;
END;
$$;

-- Criar o gatilho (Trigger)
DROP TRIGGER IF EXISTS on_group_member_added_retroactive ON public.group_members;

CREATE TRIGGER on_group_member_added_retroactive
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_group_member_retroactive();