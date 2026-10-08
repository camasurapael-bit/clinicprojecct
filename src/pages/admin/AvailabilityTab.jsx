import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { Bento, Tile, Empty } from '../../components/Bento'
import { supabase } from '../../supabaseClient'
import { fmtDate, err, toLocalInputValue } from '../../utils/helpers'

export default function AvailabilityTab({ reload }) {
  const [slots, setSlots] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ available_date: toLocalInputValue(), start_time: '09:00', end_time: '17:00' })
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase.from('availability').select('*').order('available_date').order('start_time')
    if (!error) setSlots(data || [])
    setLoaded(true)
  }
  if (!loaded) load()

  async function addSlot(e) {
    e.preventDefault(); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('availability').insert({ ...form, created_by: user.id })
    if (error) { setError(err(error)); return }
    setForm({ ...form }); load(); reload()
  }

  async function removeSlot(id) {
    await supabase.from('availability').delete().eq('id', id)
    load(); reload()
  }

  // group by date
  const byDate = slots.reduce((acc, s) => { (acc[s.available_date] ||= []).push(s); return acc }, {})

  return (
    <Bento>
      <Tile title="Add bookable window" icon={Plus} span="md:col-span-1 xl:col-span-1">
        <form onSubmit={addSlot} className="space-y-3">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={form.available_date} onChange={(e) => setForm({ ...form, available_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From</label>
              <input className="input" type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="label">To</label>
              <input className="input" type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="btn-primary w-full">Publish availability</button>
          <p className="text-xs text-slate-400">Clients can only book inside published windows.</p>
        </form>
      </Tile>

      <Tile title="Published availability" icon={Clock} span="md:col-span-1 xl:col-span-3">
        {slots.length === 0 ? <Empty text="No availability published yet." /> : (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {Object.entries(byDate).map(([date, list]) => (
              <div key={date}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{fmtDate(date)}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-2 rounded-full bg-teal-50 ring-1 ring-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-700">
                      <Clock size={13} /> {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      <button onClick={() => removeSlot(s.id)} className="text-teal-400 hover:text-rose-600" title="Remove"><Trash2 size={13} /></button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Tile>
    </Bento>
  )
}
