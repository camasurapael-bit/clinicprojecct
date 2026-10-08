import { useState } from 'react'
import { Plus, Check, X, CheckCircle2 } from 'lucide-react'
import { Bento, Tile, Empty } from '../../components/Bento'
import { StatusPill } from './OverviewTab'
import { supabase } from '../../supabaseClient'
import { fmtDate, err, toLocalInputValue } from '../../utils/helpers'

export default function AppointmentsTab({ appointments, clients, reload, notify }) {
  const [showForm, setShowForm] = useState(false)
  const [walkIn, setWalkIn] = useState(false) // encode appointments for patients with no account
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    client_id: '', service: 'General Consultation', appointment_date: toLocalInputValue(),
    start_time: '09:00', end_time: '10:00', notes: '', walkin_name: '', walkin_contact: '',
  })
  const [error, setError] = useState('')

  const filtered = appointments.filter((a) => filter === 'all' || a.status === filter)

  async function book(e) {
    e.preventDefault(); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    let patientId = null
    let userId = null

    if (walkIn) {
      // WALK-IN: no Supabase account — create a patient row with user_id = null
      const { data: np, error: npErr } = await supabase.from('patients').insert({
        full_name: form.walkin_name, contact_number: form.walkin_contact || null,
      }).select('id').single()
      if (npErr) { setError(err(npErr)); return }
      patientId = np.id
    } else {
      const client = clients.find((c) => c.id === form.client_id)
      // Find or create the linked patient record for this client
      const { data: p } = await supabase.from('patients').select('id').eq('user_id', form.client_id).maybeSingle()
      if (p) patientId = p.id
      else {
        const { data: np, error: npErr } = await supabase.from('patients')
          .insert({ user_id: form.client_id, full_name: client?.full_name || 'Client' }).select('id').single()
        if (npErr) { setError(err(npErr)); return }
        patientId = np.id
      }
      userId = form.client_id
    }

    const { walkin_name, walkin_contact, ...fields } = form
    const { error: insErr } = await supabase.from('appointments').insert({
      patient_id: patientId, user_id: userId, ...fields,
      status: 'confirmed', appointment_type: walkIn ? 'walk-in' : 'online',
    })
    if (insErr) { setError(err(insErr)); return }
    setShowForm(false); notify(); reload()
  }

  async function setStatus(id, status) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    reload()
  }

  return (
    <Bento>
      <Tile title={`All appointments (${appointments.length})`} span="md:col-span-2 xl:col-span-3"
        action={
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn-primary !py-1.5 text-xs" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New</button>
          </div>
        }>
        {showForm && (
          <form onSubmit={book} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 rounded-xl bg-teal-50/60 ring-1 ring-teal-100 p-4">
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={!walkIn} onChange={() => setWalkIn(false)} />
                Registered client
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={walkIn} onChange={() => setWalkIn(true)} />
                Walk-in (no account)
              </label>
            </div>
            {walkIn ? (
              <>
                <div>
                  <label className="label">Walk-in patient name</label>
                  <input className="input" required value={form.walkin_name} onChange={(e) => setForm({ ...form, walkin_name: e.target.value })} placeholder="Juan Dela Cruz" />
                </div>
                <div>
                  <label className="label">Contact number (for SMS reminder)</label>
                  <input className="input" value={form.walkin_contact} onChange={(e) => setForm({ ...form, walkin_contact: e.target.value })} placeholder="+63 9xx xxx xxxx" />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="label">Client</label>
                <select className="input" required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">— select a registered client —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Service</label>
              <input className="input" required value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Start</label>
              <input className="input" type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="label">End</label>
              <input className="input" type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
            <div className="sm:col-span-2 flex gap-2">
              <button className="btn-primary">Book appointment</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}
        {filtered.length === 0 ? <Empty text="No appointments found." /> : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-3">Client</th><th className="py-2 pr-3">Service</th>
                  <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Type</th><th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{a.patients?.full_name || a.profiles?.full_name || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{a.service}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{fmtDate(a.appointment_date)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{a.start_time?.slice(0, 5)}–{a.end_time?.slice(0, 5)}</td>
                    <td className="py-2.5 pr-3"><StatusPill status={a.status} /></td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-[11px] font-bold uppercase rounded-full px-2 py-0.5 ${a.appointment_type === 'walk-in' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{a.appointment_type || 'online'}</span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        {a.status === 'pending' && <button title="Confirm" className="btn-ghost !p-1.5 text-teal-600" onClick={() => setStatus(a.id, 'confirmed')}><Check size={15} /></button>}
                        {a.status !== 'completed' && a.status !== 'cancelled' && <button title="Mark completed" className="btn-ghost !p-1.5 text-sky-600" onClick={() => setStatus(a.id, 'completed')}><CheckCircle2 size={15} /></button>}
                        {a.status !== 'cancelled' && <button title="Cancel" className="btn-ghost !p-1.5 text-rose-600" onClick={() => setStatus(a.id, 'cancelled')}><X size={15} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </Bento>
  )
}
