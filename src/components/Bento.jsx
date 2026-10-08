import { cx } from '../utils/helpers'

/**
 * Bento grid wrapper — responsive by default:
 * 1 column on mobile, 2 on laptop (md), 4 on desktop (xl).
 */
export function Bento({ children, className }) {
  return <div className={cx('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-min', className)}>{children}</div>
}

export function StatCard({ icon: Icon, label, value, sub, accent = 'teal' }) {
  const accents = {
    teal: 'bg-teal-50 text-teal-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bento flex items-center gap-4 md:col-span-1">
      <div className={cx('h-12 w-12 shrink-0 rounded-2xl grid place-items-center', accents[accent] || accents.teal)}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export function Tile({ title, icon: Icon, action, className, children, span = '' }) {
  return (
    <div className={cx('bento', span || 'md:col-span-2 xl:col-span-2', className)}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
          {Icon && <Icon size={18} className="text-teal-600" />} {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Empty({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
      {Icon && <Icon size={32} className="mb-2" />}
      <p className="text-sm">{text}</p>
    </div>
  )
}
