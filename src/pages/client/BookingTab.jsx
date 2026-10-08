import { useState } from 'react'
import { CalendarPlus, CheckCircle2, CalendarDays, Clock } from 'lucide-react'
import { Tile, Empty } from '../../components/Bento'
import { StatusPill } from '../admin/OverviewTab'
import { supabase } from '../../supabaseClient'
import { fmtDate, err } from '../../utils/helpers'

export default function BookingTab({ appointments, slots, profile, reload }) {
  const [form, setForm] = useState({ service: 'General Consultation', available_date: '', slot_id: null, start_time: '', end_time: '', notes: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // group available slots by date
  const byDate = slots.reduce((acc, s) => { (acc[s.available_date] ||= []).push(s); return acc }, {})
  const dates = Object.keys(byDate).sort()
  const activeDate = form.available_date || dates[0] || ''

  async function book(e) {
    e.preventDefault(); setError('')
    if (!form.slot_id) { setError('Pick a time slot first.'); return }
    // ensure a patient record exists for this user
    let patientId
    const { data: p } = await supabase.from('patients').select('id').eq('user_id', profile.id).maybeSingle()
    if (p) patientId = p.id
    else {
      const { data: np, error: npErr } = await supabase.from('patients')
        .insert({ user_id: profile.id, full_name: profile.full_name || 'Client' }).select('id').single()
      if (npErr) { setError(err(npErr)); return }
      patientId = np.id
    }
    const { error } = await supabase.from('appointments').insert({
      patient_id: patientId, user_id: profile.id, service: form.service,
      appointment_date: activeDate, start_time: form.start_time, end_time: form.end_time,
      notes: form.notes, status: 'pending',
    })
    if (error) { setError(err(error)); return }
    setDone(true); setForm({ ...form, slot_id: null, start_time: '', end_time: '', notes: '' }); reload()
  }

  const upcoming = appointments
    .filter((a) => a.status === 'pending' || a.status === 'confirmed')
    .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time))

  return (
    <div className="space-y-4">
      {done && (
        <div className="bento !bg-teal-50 !ring-teal-200 flex items-center gap-3">
          <CheckCircle2 className="text-teal-600 shrink-0" size={22} />
          <div>
            <p className="font-bold text-teal-800 text-sm">Appointment requested!</p>
            <p className="text-xs text-teal-700">The clinic will confirm it shortly. Track it below or in My Records.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <Tile title="1 · Pick a date & time slot" icon={CalendarClock} span="xl:col-span-2">
          {dates.length === 0 ? <Empty icon={CalendarDays} text="No slots published yet — the clinic hasn't opened bookings. Check back soon." /> : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 [scrollbar-width:none]">
                {dates.map((d) => (
                  <button key={d} onClick={() => { setForm({ ...form, available_date: d, slot_id: null, start_time: '', end_time: '' }) }}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-center ring-1 transition-colors ${activeDate === d ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-400'}`}>
                    <span className="block text-[11px] font-semibold uppercase">{fmtDate(d).split(',')[0]}</span>
                    <span className="block text-sm font-extrabold">{fmtDate(d)}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {byDate[activeDate]?.map((s) => {
                  const selected = form.slot_id === s.id
                  return (
                    <button key={s.id} type="button"
                      onClick={() => setForm({ ...form, slot_id: s.id, start_time: s.start_time, end_time: s.end_time, available_date: activeDate })}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors ${selected ? 'bg-teal-600 text-white ring-teal-600' : 'bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100'}`}>
                      <Clock size={14} /> {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </Tile>

        <Tile title="2 · Your details" icon={CalendarPlus} span="xl:col-span-1">
          <form onSubmit={book} className="space-y-3">
            <div>
              <label className="label">Service</label>
              <select className="input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                {['General Consultation', 'Dental Cleaning', 'Physical Exam', 'Laboratory Tests', 'Vaccination', 'Follow-up Visit'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Selected slot</label>
              <div className="input flex items-center !bg-slate-50 text-slate-600">
                {form.slot_id ? `${fmtDate(activeDate)} · ${form.start_time?.slice(0, 5)}–${form.end_time?.slice(0, 5)}` : '— pick a slot —'}
              </div>
            </div>
            <div>
              <label className="label">Reason / notes</label>
              <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Describe your concern (optional)" />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button className="btn-primary w-full">Request appointment</button>
          </form>
        </Tile>
      </div>

      <Tile title="My upcoming appointments" icon={CalendarDays}>
        {upcoming.length === 0 ? <Empty text="No upcoming appointments." /> : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{a.service}</p>
                  <p className="text-xs text-slate-400">{fmtDate(a.appointment_date)} · {a.start_time?.slice(0, 5)}–{a.end_time?.slice(0, 5)}</p>
                </div>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </div>
  )
}
