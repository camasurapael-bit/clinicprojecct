import { useEffect, useState } from 'react'
import { Users, Search, FileText, CalendarDays } from 'lucide-react'
import { Bento, Tile, Empty, StatCard } from '../../components/Bento'
import { StatusPill } from './OverviewTab'
import { supabase } from '../../supabaseClient'
import { fmtDate, err } from '../../utils/helpers'

export default function PatientsTab({ clients, appointments, setViewDoc }) {
  const [q, setQ] = useState('')
  const [docsByClient, setDocsByClient] = useState({})
  const [apptsByClient, setApptsByClient] = useState({})

  useEffect(() => {
    async function load() {
      const [d, a] = await Promise.all([
        supabase.from('documents').select('id, client_id, title, kind, created_at'),
        supabase.from('appointments').select('id, user_id, service, appointment_date, status'),
      ])
      if (!d.error) setDocsByClient(groupBy(d.data || [], 'client_id'))
      if (!a.error) setApptsByClient(groupBy(a.data || [], 'user_id'))
    }
    load()
  }, [])

  const filtered = clients.filter((c) =>
    (c.full_name || '').toLowerCase().includes(q.toLowerCase()) || (c.email || '').toLowerCase().includes(q.toLowerCase()))

  return (
    <Bento>
      <StatCard icon={Users} label="Registered clients" value={clients.length} />
      <div className="bento md:col-span-1 xl:col-span-3 flex items-center">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search clients by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 && <Tile title="Clients" span="md:col-span-2 xl:col-span-4"><Empty icon={Users} text="No clients found." /></Tile>}

      {filtered.map((c) => {
        const docs = docsByClient[c.id] || []
        const appts = apptsByClient[c.id] || []
        return (
          <Tile key={c.id} title={c.full_name || 'Unnamed client'} icon={Users} span="md:col-span-1 xl:col-span-2">
            <p className="text-xs text-slate-400 mb-3">{c.email}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wide rounded-full bg-violet-50 text-violet-700 px-2.5 py-1">{docs.length} docs</span>
              <span className="text-[11px] font-bold uppercase tracking-wide rounded-full bg-sky-50 text-sky-700 px-2.5 py-1">{appts.length} appointments</span>
              <span className="text-[11px] font-bold uppercase tracking-wide rounded-full bg-slate-100 text-slate-500 px-2.5 py-1">joined {fmtDate(c.created_at)}</span>
            </div>
            {appts.length > 0 && (
              <ul className="space-y-1.5">
                {appts.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <CalendarDays size={12} className="text-teal-500 shrink-0" />
                    <span className="truncate flex-1">{fmtDate(a.appointment_date)} · {a.service}</span>
                    <StatusPill status={a.status} />
                  </li>
                ))}
              </ul>
            )}
            {docs.length > 0 && (
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5"><FileText size={12} /> Latest: {docs[0]?.title}</p>
            )}
          </Tile>
        )
      })}
    </Bento>
  )
}

function groupBy(list, key) {
  return list.reduce((acc, item) => { (acc[item[key]] ||= []).push(item); return acc }, {})
}
