import { useState } from 'react'
import { UserRound, Save } from 'lucide-react'
import { Tile } from '../../components/Bento'
import { supabase } from '../../supabaseClient'
import { fmtDate, err } from '../../utils/helpers'

export default function ProfileTab({ session, profile, reload }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault(); setError(''); setSaved(false)
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone }).eq('id', profile.id)
    if (error) { setError(err(error)); return }
    setSaved(true); reload()
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      <Tile title="Personal information" icon={UserRound}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email (login)</label>
            <input className="input !bg-slate-50" value={profile?.email || session?.user?.email || ''} disabled />
          </div>
          <div>
            <label className="label">Contact number</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+63 9xx xxx xxxx" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {saved && <p className="text-sm text-teal-600 font-semibold">Saved!</p>}
          <button className="btn-primary"><Save size={15} /> Save changes</button>
        </form>
      </Tile>

      <Tile title="Account details" icon={UserRound}>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-slate-500">Role</dt><dd className="font-semibold text-slate-800 capitalize">{profile?.role}</dd>
          </div>
          <div className="flex justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-slate-500">Member since</dt><dd className="font-semibold text-slate-800">{fmtDate(profile?.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-slate-500">User ID</dt><dd className="font-mono text-xs text-slate-500 break-all">{profile?.id}</dd>
          </div>
        </dl>
      </Tile>
    </div>
  )
}
