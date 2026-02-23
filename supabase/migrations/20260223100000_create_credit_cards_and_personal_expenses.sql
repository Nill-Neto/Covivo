-- Create credit_cards table
create table if not exists public.credit_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  brand text not null,
  limit_amount numeric,
  closing_day integer not null,
  due_day integer not null,
  created_at timestamp with time zone default now() not null
);

alter table public.credit_cards enable row level security;

create policy "Users can view their own credit cards"
  on public.credit_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert their own credit cards"
  on public.credit_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own credit cards"
  on public.credit_cards for update
  using (auth.uid() = user_id);

create policy "Users can delete their own credit cards"
  on public.credit_cards for delete
  using (auth.uid() = user_id);


-- Create personal_expenses table
create table if not exists public.personal_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  amount numeric not null,
  payment_method text not null,
  purchase_date date not null,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  installments integer default 1 not null,
  created_at timestamp with time zone default now() not null
);

alter table public.personal_expenses enable row level security;

create policy "Users can view their own personal expenses"
  on public.personal_expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own personal expenses"
  on public.personal_expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own personal expenses"
  on public.personal_expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own personal expenses"
  on public.personal_expenses for delete
  using (auth.uid() = user_id);


-- Create personal_expense_installments table
create table if not exists public.personal_expense_installments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  personal_expense_id uuid references public.personal_expenses(id) on delete cascade not null,
  installment_number integer not null,
  amount numeric not null,
  bill_month integer not null,
  bill_year integer not null,
  created_at timestamp with time zone default now() not null
);

alter table public.personal_expense_installments enable row level security;

create policy "Users can view their own personal expense installments"
  on public.personal_expense_installments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own personal expense installments"
  on public.personal_expense_installments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own personal expense installments"
  on public.personal_expense_installments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own personal expense installments"
  on public.personal_expense_installments for delete
  using (auth.uid() = user_id);