import { CalendarCheck, Hourglass, Users, FolderOpen, ArrowRight, CalendarClock } from 'lucide-react'
import { Bento, StatCard, Tile, Empty } from '../../components/Bento'
import { fmtDate, fmtTime, toLocalInputValue } from '../../utils/helpers'

export default function OverviewTab({ appointments, documents, clients, stats, onGo }) {
  const today = toLocalInputValue()
  const todayList = appointments.filter((a) => a.appointment_date === today && a.status !== 'cancelled')
  const recentDocs = documents.slice(0, 5)

  return (
    <Bento>
      <StatCard icon={CalendarCheck} label="Today" value={stats.today} sub="appointments scheduled" />
      <StatCard icon={Hourglass} label="Pending" value={stats.pending} sub="awaiting confirmation" accent="amber" />
      <StatCard icon={Users} label="Clients" value={stats.clients} sub="registered patients" accent="sky" />
      <StatCard icon={FolderOpen} label="Documents" value={stats.docs} sub="shared to clients" accent="violet" />

      <Tile title="Today's schedule" icon={CalendarClock} span="md:col-span-1 xl:col-span-2"
        action={<button className="text-xs font-semibold text-teal-600 hover:underline" onClick={() => onGo('Appointments')}>View all</button>}>
        {todayList.length === 0 ? <Empty text="No appointments today." /> : (
          <ul className="space-y-2">
            {todayList.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5">
                <div className="text-center shrink-0">
                  <p className="text-sm font-extrabold text-teal-700">{a.start_time?.slice(0, 5)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{a.patients?.full_name || a.profiles?.full_name || 'Patient'}</p>
                  <p className="text-xs text-slate-400 truncate">{a.service}</p>
                </div>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile title="Recently shared documents" icon={FolderOpen} span="md:col-span-1 xl:col-span-2"
        action={<button className="text-xs font-semibold text-teal-600 hover:underline" onClick={() => onGo('Documents')}>Manage</button>}>
        {recentDocs.length === 0 ? <Empty text="No documents uploaded yet." /> : (
          <ul className="space-y-2">
            {recentDocs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5">
                <div className="h-8 w-8 rounded-lg bg-violet-50 text-violet-600 grid place-items-center shrink-0"><FolderOpen size={15} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.title}</p>
                  <p className="text-xs text-slate-400 truncate">→ {d.profiles?.full_name || d.profiles?.email || 'client'}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{d.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      <Tile title="Quick actions" icon={ArrowRight} span="md:col-span-2 xl:col-span-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Book for a client', tab: 'Appointments' },
            { label: 'Upload a document', tab: 'Documents' },
            { label: 'Set available slots', tab: 'Availability' },
            { label: 'Browse patients', tab: 'Patients' },
          ].map((q) => (
            <button key={q.tab} onClick={() => onGo(q.tab)}
              className="rounded-xl border border-dashed border-teal-300 bg-teal-50/50 px-3 py-4 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors text-center">
              {q.label}
            </button>
          ))}
        </div>
      </Tile>
    </Bento>
  )
}

export function StatusPill({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-teal-100 text-teal-700',
    completed: 'bg-sky-100 text-sky-700',
    cancelled: 'bg-rose-100 text-rose-700',
  }
  return <span className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 ${map[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>
}
