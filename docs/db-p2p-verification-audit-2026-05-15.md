# DB Verification Audit — P2P expenses/payments consistency (2026-05-15)

## Scope requested
Validate, across expense/payment-related tables, whether required columns for the P2P model exist and whether legacy rows (pre-P2P) are correctly populated.

## Important execution limitation
This environment does **not** have Supabase CLI (`supabase: command not found`) and does not include a privileged Postgres connection string/service role credentials for direct production queries.

Therefore, this audit includes:
1. schema/code/migration verification from repository sources;
2. executable SQL checks to run in your DB console immediately.

---

## 1) What is already present in repo (schema intent)

### 1.1 Competence fields and backfill path exist
Repository contains explicit migration validation references for:
- `20260417120000_add_payment_competence_fields.sql`
- `20260417120001_add_payment_competence_date.sql`
- `20260417143000_set_competence_triggers_expenses_payments.sql`
indicating competence normalization for expenses/payments and triggers. 

### 1.2 Existing diagnostics already point to your suspected root cause
There is a diagnostic SQL specifically for null competence data:
- `supabase/scripts/diagnostics/0028_verify_if_any_records_still_have_null_competence_data.sql`

It checks null competence coverage in:
- `expenses`
- `payments`
- `personal_expenses`
- `expense_installments`
- `personal_expense_installments`

This aligns directly with your suspicion that pre-P2P rows may be missing required values.

### 1.3 App logic relies on P2P-sensitive fields
Frontend queries and derived calculations consume `expense_splits`, `payments`, `expenses.expense_type`, `expenses.group_id`, competence keys and payment statuses, meaning partial legacy population can break visibility/aggregation behavior.

---

## 2) SQL checks you should run now (copy/paste)

### 2.1 Column presence + nullability for core tables
```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'expenses',
    'expense_splits',
    'payments',
    'expense_installments',
    'personal_expenses',
    'personal_expense_installments'
  )
ORDER BY table_name, ordinal_position;
```

### 2.2 Null competence audit (existing diagnostic)
```sql
SELECT
  (SELECT count(*) FROM public.expenses WHERE competence_year IS NULL) as expenses_null,
  (SELECT count(*) FROM public.payments WHERE competence_year IS NULL) as payments_null,
  (SELECT count(*) FROM public.personal_expenses WHERE competence_year IS NULL) as personal_expenses_null,
  (SELECT count(*) FROM public.expense_installments WHERE competence_year IS NULL) as exp_inst_null,
  (SELECT count(*) FROM public.personal_expense_installments WHERE competence_year IS NULL) as pers_inst_null;
```

### 2.3 Legacy rows likely to fail P2P interpretation
```sql
-- splits without expense link integrity (should be zero)
SELECT count(*) AS splits_without_expense
FROM public.expense_splits es
LEFT JOIN public.expenses e ON e.id = es.expense_id
WHERE e.id IS NULL;

-- payments referencing split id that does not exist (should be zero)
SELECT count(*) AS payments_with_broken_split_ref
FROM public.payments p
LEFT JOIN public.expense_splits es ON es.id = p.expense_split_id
WHERE p.expense_split_id IS NOT NULL
  AND es.id IS NULL;

-- collective expenses without splits (likely problematic in p2p)
SELECT count(*) AS collective_without_splits
FROM public.expenses e
LEFT JOIN public.expense_splits es ON es.expense_id = e.id
WHERE e.expense_type = 'collective'
GROUP BY e.id
HAVING count(es.id) = 0;
```

### 2.4 Pre-P2P payments not attached to split
```sql
SELECT id, user_id, expense_split_id, amount, status, created_at, competence_year, competence_month
FROM public.payments
WHERE expense_split_id IS NULL
ORDER BY created_at DESC
LIMIT 200;
```

Interpretation:
- If many historical rows appear here, old centralized flow likely bypassed split linkage.
- These rows can be valid only if your logic explicitly supports non-split legacy payments.

### 2.5 Status compatibility check
```sql
SELECT status, count(*)
FROM public.payments
GROUP BY status
ORDER BY count(*) DESC;

SELECT status, count(*)
FROM public.expense_splits
GROUP BY status
ORDER BY count(*) DESC;
```

---

## 3) Most likely root cause (probable)
Given current repository evidence, the highest-probability causes are:
1. legacy payments created before P2P with `expense_split_id IS NULL`;
2. missing competence backfill in part of historic rows;
3. collective expenses that do not have consistent split generation.

Any of the above can produce “not considered correctly” behavior in dashboards and pending calculations.

---

## 4) Recommended corrective path
1. Run queries from section 2 and export results.
2. If legacy null/invalid rows exist, create a one-time migration script:
   - backfill competence fields;
   - map legacy payments to synthetic/derived split relations where possible;
   - quarantine unmatchable rows with explicit `legacy_unmapped` marker.
3. Add integrity guardrails:
   - DB constraints/triggers for new writes;
   - diagnostic CI SQL check (non-zero = fail).
4. Patch read logic to include explicit legacy fallback while migration is incomplete.

---

## 5) Go/No-go criterion for “P2P-consistent data”
- `expenses_null = 0`, `payments_null = 0`, installment/personal null counts = 0.
- no broken FK-like references in splits/payments.
- all collective expenses have split coverage.
- explicit policy for `payments.expense_split_id IS NULL` legacy rows (migrated or handled).
