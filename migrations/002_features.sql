-- ============================================================
-- ClinicOS — Migration 002: Walk-ins, Invoices, Reminders
-- Run in Supabase Dashboard → SQL Editor AFTER schema.sql.
-- Idempotent — safe to run more than once.
-- ============================================================

-- ---------- 0. PROFILE EMAIL SYNC ----------
alter table public.profiles add column if not exists email text;
update public.profiles p
set email = au.email
from auth.users au
where p.id = au.id and (p.email is null or p.email = '');

-- ---------- 1. WALK-IN SUPPORT ----------
-- 'online' = booked by client in portal · 'walk-in' = encoded by admin without account
alter table public.appointments add column if not exists appointment_type
  text not null default 'online';

-- patients.user_id is already nullable: walk-in patients have no login account.

-- ---------- 2. INVOICES ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null
    default concat('INV-', to_char(now(), 'YYYYMMDD'), '-',
                   lpad((floor(random() * 100000))::text, 5, '0')),
  appointment_id uuid references public.appointments(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  client_id uuid references public.profiles(id) on delete cascade, -- null for walk-ins
  items jsonb not null default '[]',   -- [{ description, qty, price }]
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,   -- percent
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  payment_method text check (payment_method in ('cash','card','gcash','bank_transfer') or payment_method is null),
  notes text,
  issued_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists invoices_client_idx  on public.invoices (client_id);
create index if not exists invoices_status_idx  on public.invoices (status);

-- ---------- 3. NOTIFICATIONS (in-app reminders log; written by Edge Function) ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app','email','sms')),
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- 4. ROW LEVEL SECURITY ----------
alter table public.invoices     enable row level security;
alter table public.notifications enable row level security;

-- Invoices: admin/staff full access; client reads only their own
create policy "invoices admin write" on public.invoices for all
  using (public.my_role() in ('admin','staff'))
  with check (public.my_role() in ('admin','staff'));
create policy "invoices client read" on public.invoices for select
  using (client_id = auth.uid());

-- Notifications: client reads own; inserts come from admin or the service_role Edge Function
create policy "notifications read" on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications insert" on public.notifications for insert
  with check (public.my_role() in ('admin','staff'));

-- ---------- 5. DAILY REMINDER SCHEDULE (optional, run AFTER deploying the Edge Function) ----------
-- Deploy first:
--   supabase functions deploy send-reminders
--   supabase secrets set RESEND_API_KEY=...            (email — https://resend.com)
--   supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...  (SMS)
-- Then uncomment and run (requires the pg_cron and pg_net extensions, enable them in
-- Database → Extensions). Replace <PROJECT_REF> and <ANON_KEY>:
--
-- select cron.schedule('clinicos-daily-reminders', '0 8 * * *', $$
--   select net.http_post(
--     'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
--     '{}'::jsonb,
--     '{}'::jsonb,
--     jsonb_build_object('Authorization', 'Bearer <ANON_KEY>', 'Content-Type', 'application/json')
--   )
-- $$);
