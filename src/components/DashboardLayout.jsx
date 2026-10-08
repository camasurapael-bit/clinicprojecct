import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, X, HeartPulse } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { cx } from '../utils/helpers'

export default function DashboardLayout({ profile, nav, active, onNav, title, subtitle, actions, children }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff'

  async function logout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const NavButtons = ({ onClickClose }) => (
    <nav className="flex flex-col gap-1">
      {nav.map((n) => (
        <button key={n.label}
          onClick={() => { onNav(n.label); onClickClose?.() }}
          className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left',
            active === n.label ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}>
          <n.icon size={18} /> {n.label}
        </button>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3">
        <button className="btn-ghost !p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-teal-600 grid place-items-center text-white"><HeartPulse size={16} /></div>
          <span className="font-bold text-slate-900">ClinicOS</span>
        </div>
        <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">{profile?.role}</span>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 bg-white p-4 sticky top-0 h-screen">
          <div className="flex items-center gap-2 px-2 py-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-teal-600 grid place-items-center text-white"><HeartPulse size={18} /></div>
            <div>
              <p className="font-extrabold leading-tight text-slate-900">ClinicOS</p>
              <p className="text-xs text-slate-400">{isAdmin ? 'Admin console' : 'Client portal'}</p>
            </div>
          </div>
          <NavButtons />
          <div className="mt-auto">
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 mb-2">
              <p className="text-sm font-semibold text-slate-800 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
            </div>
            <button onClick={logout} className="btn-ghost w-full"><LogOut size={16} /> Sign out</button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="lg:hidden fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-slate-900/40" />
            <div className="relative w-72 max-w-[80%] bg-white h-full p-4 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-extrabold text-slate-900">ClinicOS</span>
                <button className="btn-ghost !p-2" onClick={() => setOpen(false)}><X size={18} /></button>
              </div>
              <NavButtons onClickClose={() => setOpen(false)} />
              <button onClick={logout} className="btn-ghost w-full mt-6"><LogOut size={16} /> Sign out</button>
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>

          {/* Mobile horizontal tab pills */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1 [scrollbar-width:none]">
            {nav.map((n) => (
              <button key={n.label} onClick={() => onNav(n.label)}
                className={cx('whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 inline-flex items-center gap-1.5',
                  active === n.label ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white text-slate-600 ring-slate-200')}>
                <n.icon size={14} />{n.label}
              </button>
            ))}
          </div>

          {children}
        </main>
      </div>
    </div>
  )
}
