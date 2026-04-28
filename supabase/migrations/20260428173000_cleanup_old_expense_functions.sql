-- Drop all known versions of the old function to avoid conflicts and ambiguity.
-- Version with 14 parameters
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, text, text, numeric, text, text, date, text, uuid, uuid, text, uuid, integer, date);

-- Version with 15 parameters
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, text, text, numeric, text, text, date, text, uuid, uuid, text, uuid, integer, date, uuid[]);

-- Version with 16 parameters (the one that was causing conflicts)
DROP FUNCTION IF EXISTS public.create_expense_with_splits(uuid, uuid, text, text, numeric, text, text, date, text, uuid, uuid, text, uuid, integer, date, uuid[]);
