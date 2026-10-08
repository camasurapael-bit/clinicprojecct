// ClinicOS — send-reminders Edge Function (Deno)
// Sends appointment reminders for TOMORROW'S appointments:
//   1. in-app notification (always, stored in `notifications`)
//   2. email via Resend       (set secret RESEND_API_KEY, optional REMINDER_FROM_EMAIL)
//   3. SMS via Twilio         (set secrets TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)
//
// Deploy:
//   supabase functions deploy send-reminders
//   supabase secrets set RESEND_API_KEY=...
// Manual test: curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders \
//                -H "Authorization: Bearer <ANON_KEY>"
// Schedule daily (see migrations/002_features.sql section 5).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Appointments happening tomorrow that are still active
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: appts, error } = await admin
      .from('appointments')
      .select(`id, appointment_date, start_time, service, appointment_type,
               user_id, patients(full_name, contact_number), profiles(email, full_name)`)
      .eq('appointment_date', tomorrow)
      .in('status', ['pending', 'confirmed'])
    if (error) throw error

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('REMINDER_FROM_EMAIL') || 'ClinicOS <onboarding@resend.dev>'
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')

    let emails = 0, sms = 0

    for (const a of appts ?? []) {
      const name = a.patients?.full_name || a.profiles?.full_name || 'there'
      const when = `${a.appointment_date} at ${a.start_time?.slice(0, 5)}`
      const title = 'Appointment reminder'
      const body = `Hi ${name} — this is a reminder for your ${a.service} on ${when}. Please arrive 10 minutes early.`

      // 1) in-app notification
      if (a.user_id) {
        await admin.from('notifications').insert({
          user_id: a.user_id, appointment_id: a.id, channel: 'in_app', title, body,
        })
      }

      // 2) email (Resend)
      const email = a.profiles?.email
      if (resendKey && email) {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromEmail, to: [email], subject: title,
            html: `<div style="font-family:Inter,sans-serif"><h2>${title}</h2><p>${body}</p></div>`,
          }),
        })
        if (r.ok) {
          emails++
          if (a.user_id) await admin.from('notifications').insert({
            user_id: a.user_id, appointment_id: a.id, channel: 'email', title, body,
          })
        }
      }

      // 3) SMS (Twilio)
      const phone = a.patients?.contact_number
      if (twilioSid && twilioToken && twilioFrom && phone) {
        const r = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: twilioFrom, To: phone, Body: body }),
          },
        )
        if (r.ok) {
          sms++
          if (a.user_id) await admin.from('notifications').insert({
            user_id: a.user_id, appointment_id: a.id, channel: 'sms', title, body,
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, reminded: appts?.length ?? 0, emails, sms }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
