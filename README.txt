ClinicOS — Online Appointment & Records System
===============================================

A Supabase-backed clinic management app with a bento-grid UI:
clients book appointments; admins upload/store files (PDF, TXT, images)
and write notes that AUTOMATICALLY appear in the client's records portal.
Fully responsive — mobile, laptop, desktop.

──────────────────────────────────────────────
QUICK START
──────────────────────────────────────────────
1. Unzip and install:
     cd clinicos
     npm install

2. Configure Supabase keys:
     cp .env.example .env
   Then open Supabase Dashboard → Project Settings → API
   and paste your **anon public** key into VITE_SUPABASE_ANON_KEY.
   (The URL is already filled in. The anon key is safe for the browser.)

3. Create the database schema:
   Open Supabase Dashboard → SQL Editor → New query,
   paste the entire contents of schema.sql, and click RUN.

4. Make the first admin account:
   - Sign up in the app with your own email (this creates a "client").
   - In Supabase Dashboard → Table Editor → profiles,
     find your row and change role from 'client' to 'admin'.
   - Log out & back in → you now see the Admin console at /admin.

5. Run:
     npm run dev      → http://localhost:5173

──────────────────────────────────────────────
HOW AUTO-SHARING DOCUMENTS WORKS
──────────────────────────────────────────────
- Admin picks a client, drops files (or writes a note).
- Files upload to a PRIVATE storage bucket under the path
    {client_user_id}/filename
- A row is inserted into `documents` with client_id = that client.
- Row Level Security means the client can SELECT only rows where
  documents.client_id = auth.uid() — so the file appears instantly
  in their "My Records" tab and nowhere else. No sync code needed.

──────────────────────────────────────────────
FEATURES
──────────────────────────────────────────────
ADMIN: overview stats, appointment management (confirm/complete/cancel,
book on behalf of clients), WALK-IN appointment encoding (patients without
accounts), drag & drop uploads, notes editor, PDF/image preview, availability
publishing, client directory, INVOICING (line items, tax/discount, mark paid,
printable receipt, works for walk-ins too).
CLIENT: slot booking from published availability, appointment tracking,
document records with in-app PDF/text viewer, BILLING tab (own invoices +
printable receipts), in-app reminders feed, profile editing.

REMINDERS (SMS / email / in-app)
──────────────────────────────────────────────
supabase/functions/send-reminders sends reminders for TOMORROW'S
appointments: always an in-app notification, plus email via Resend and
SMS via Twilio when their secrets are set. Deploy + schedule it with:

  npm i -g supabase && supabase login
  supabase functions deploy send-reminders
  supabase secrets set RESEND_API_KEY=...                      # email (optional)
  supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... \
                        TWILIO_FROM_NUMBER=+1...               # SMS (optional)

Then uncomment section 5 of migrations/002_features.sql to schedule it
daily at 08:00 with pg_cron.

MIGRATIONS (run in order in Supabase SQL Editor)
──────────────────────────────────────────────
  1. schema.sql                  — base tables, RLS, storage, triggers
  2. migrations/002_features.sql — walk-ins, invoices, notifications

WALK-IN PATIENTS
──────────────────────────────────────────────
Admin can encode appointments/invoices for patients with no Supabase
account (checkbox "Walk-in" in the appointments tab). Walk-in patients
are stored in `patients` with a null user_id and can never see the
portal — their records are admin-only until they sign up.

──────────────────────────────────────────────
SECURITY NOTES
──────────────────────────────────────────────
- The Postgres database password you shared is SERVER-SIDE ONLY
  (psql / Supabase dashboard). It is NOT used by this app and is NOT
  in any project file. Please rotate it: Dashboard → Settings →
  Database → Reset database password.
- The frontend only ever uses the public anon key; all access is
  governed by the RLS policies in schema.sql.
