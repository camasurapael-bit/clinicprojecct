import { useEffect, useState } from 'react'
import { FileText, StickyNote, FolderOpen, CalendarDays, Clock, Bell } from 'lucide-react'
import { Bento, Tile, Empty } from '../../components/Bento'
import { StatusPill } from '../admin/OverviewTab'
import { supabase } from '../../supabaseClient'
import { fmtDate, toLocalInputValue } from '../../utils/helpers'

/**
 * The client's records hub.
 * Anything the admin uploads/writes and tags with this client's id shows up here
 * AUTOMATICALLY — enforced by RLS on the documents table (client_id = auth.uid()).
 */
export default function RecordsTab({ documents, appointments, slots, setViewDoc, reload }) {
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState([])
  const docs = documents.filter((d) => filter === 'all' || d.kind === filter)
  const today = toLocalInputValue()
  const upcoming = appointments
    .filter((a) => a.appointment_date >= today && (a.status === 'pending' || a.status === 'confirmed'))
    .sort((a, b) => (a.appointment_date + a.start_time).localeCompare(b.appointment_date + b.start_time))
  const openSlots = slots.length

  // Reminders the clinic's daily Edge Function (or admin) has pushed to this client
  useEffect(() => {
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => { if (data) setNotifications(data) })
  }, [])

  return (
    <Bento>
      {notifications.length > 0 && (
        <Tile title="Reminders & notices" icon={Bell} span="md:col-span-2 xl:col-span-4">
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3 rounded-xl bg-amber-50/70 ring-1 ring-amber-100 px-3.5 py-2.5">
                <Bell size={15} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 shrink-0">{n.channel.replace('_', '-')}</span>
              </li>
            ))}
          </ul>
        </Tile>
      )}
      <Tile title={`My documents (${documents.length})`} icon={FolderOpen} span="md:col-span-2 xl:col-span-3"
        action={
          <select className="input !w-auto !py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {['all', 'pdf', 'note', 'txt', 'image'].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        }>
        {docs.length === 0 ? <Empty icon={FolderOpen} text="No documents yet. Files your clinic shares will appear here automatically." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {docs.map((d) => (
              <button key={d.id} onClick={() => setViewDoc(d)}
                className="text-left rounded-xl ring-1 ring-slate-200 bg-slate-50 p-3.5 hover:ring-teal-400 hover:bg-teal-50/40 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white ring-1 ring-slate-200 grid place-items-center text-teal-600 shrink-0 group-hover:text-teal-700">
                    {d.kind === 'pdf' ? <FileText size={19} /> : d.kind === 'note' ? <StickyNote size={19} /> : <FolderOpen size={19} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-teal-800">{d.title}</p>
                    <p className="text-xs text-slate-400">{fmtDate(d.created_at)} · {d.kind.toUpperCase()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Tile>

      <Tile title="Upcoming visits" icon={CalendarDays} span="md:col-span-1 xl:col-span-1">
        {upcoming.length === 0 ? <Empty text="Nothing booked yet." /> : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id} className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-800 truncate">{a.service}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={11} /> {fmtDate(a.appointment_date)} · {a.start_time?.slice(0, 5)}</p>
                <div className="mt-1.5"><StatusPill status={a.status} /></div>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile title="Open booking windows" icon={Clock} span="md:col-span-1 xl:col-span-4">
        {openSlots === 0 ? <Empty text="The clinic has not published available slots yet." /> : (
          <p className="text-sm text-slate-500">
            <span className="font-bold text-teal-700">{openSlots}</span> open slot{openSlots > 1 ? 's' : ''} available across {new Set(slots.map((s) => s.available_date)).size} day(s). Head to <span className="font-semibold text-teal-600">Book</span> to reserve one.
          </p>
        )}
      </Tile>
    </Bento>
  )
}
