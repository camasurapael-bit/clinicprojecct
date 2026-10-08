-- ============================================================
-- ClinicOS — Full database schema (Supabase / Postgres)
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ---------- 1. PROFILES (linked to auth.users, with roles) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'client' check (role in ('admin','staff','client')),
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- 2. PATIENTS (client's medical/demographic record) ----------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  gender text,
  contact_number text,
  address text,
  medical_history text,
  created_at timestamptz not null default now()
);

-- ---------- 3. CLINIC AVAILABILITY (admin defines bookable slots) ----------
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  available_date date not null,
  start_time time not null,
  end_time time not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- 4. APPOINTMENTS (client books; admin confirms) ----------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  service text not null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- 5. DOCUMENTS (admin uploads; client sees own via client_id) ----------
-- kind: 'pdf' | 'txt' | 'note' | 'image'
-- storage_path: path inside the PRIVATE 'clinic-documents' bucket
-- content: plain text for notes/txt (PDFs live in storage, path only)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade, -- the client who receives it
  uploaded_by uuid references public.profiles(id),
  title text not null,
  kind text not null default 'txt' check (kind in ('pdf','txt','note','image')),
  content text,                -- text content for txt/note
  storage_path text,           -- storage object path for pdf/image
  file_size bigint,
  mime_type text,
  visible_to_client boolean not null default true,  -- auto-available in client portal
  created_at timestamptz not null default now()
);

-- ---------- 6. HELPER: current user's role ----------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.patients      enable row level security;
alter table public.availability  enable row level security;
alter table public.appointments  enable row level security;
alter table public.documents     enable row level security;

-- PROFILES: users read their own; admins read all
create policy "profiles own read"  on public.profiles for select using (id = auth.uid() or public.my_role() in ('admin','staff'));
create policy "profiles own upsert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles own update" on public.profiles for update using (id = auth.uid() or public.my_role() = 'admin');

-- CLIENTS (new sign-ups) are auto-inserted into profiles by trigger (below)

-- PATIENTS: clients see only their own patient records; staff/admin see all
create policy "patients read"  on public.patients for select using (user_id = auth.uid() or public.my_role() in ('admin','staff'));
create policy "patients write" on public.patients for all using (public.my_role() in ('admin','staff'))
  with check (public.my_role() in ('admin','staff'));
create policy "patients self update" on public.patients for update using (user_id = auth.uid());

-- AVAILABILITY: everyone authenticated can read (needed for booking); admin writes
create policy "availability read"  on public.availability for select using (auth.uid() is not null);
create policy "availability write" on public.availability for all using (public.my_role() in ('admin','staff'))
  with check (public.my_role() in ('admin','staff'));

-- APPOINTMENTS: clients see/create their own; staff/admin manage all
create policy "appointments read" on public.appointments for select
  using (user_id = auth.uid() or public.my_role() in ('admin','staff'));
create policy "appointments insert" on public.appointments for insert
  with check (user_id = auth.uid() or public.my_role() in ('admin','staff'));
create policy "appointments update" on public.appointments for update
  using (user_id = auth.uid() or public.my_role() in ('admin','staff'));
create policy "appointments delete" on public.appointments for delete
  using (public.my_role() = 'admin');

-- DOCUMENTS — the magic:
-- admin/staff: full access. client: only documents WHERE client_id = their own id.
-- So an admin upload tagged with client_id AUTOMATICALLY lands in that client's portal.
create policy "documents read" on public.documents for select
  using (public.my_role() in ('admin','staff') or (client_id = auth.uid() and visible_to_client));
create policy "documents write" on public.documents for all
  using (public.my_role() in ('admin','staff'))
  with check (public.my_role() in ('admin','staff'));

-- ============================================================
-- STORAGE — private bucket 'clinic-documents'
-- ============================================================
insert into storage.buckets (id, name, public) values ('clinic-documents','clinic-documents', false)
on conflict (id) do nothing;

-- Admin/staff can upload; a client can read ONLY objects under their own folder prefix:
-- storage path convention: {client_id}/filename.pdf
create policy "storage admin write" on storage.objects for all
  using (bucket_id = 'clinic-documents' and public.my_role() in ('admin','staff'))
  with check (bucket_id = 'clinic-documents' and public.my_role() in ('admin','staff'));

create policy "storage client read own" on storage.objects for select
  using (bucket_id = 'clinic-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- TRIGGERS
-- ============================================================
-- Auto-create a profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'New User'),
    new.email,
    'client'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Auto-create a patient record linked to a new client profile
create or replace function public.handle_new_client()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'client' then
    insert into public.patients (user_id, full_name)
    values (new.id, new.full_name)
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_client();
