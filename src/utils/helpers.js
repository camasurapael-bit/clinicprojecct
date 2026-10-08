export const cx = (...c) => c.filter(Boolean).join(' ')

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'

export const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

export const fmtBytes = (b) => {
  if (b == null) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/** Map a mime type to a document `kind` used by the documents table. */
export const kindOf = (mime = '') =>
  mime.includes('pdf') ? 'pdf' : mime.startsWith('image/') ? 'image' : 'txt'

export const startOfDay = (d = new Date()) => {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}

export const toLocalInputValue = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const err = (e) => e?.message || String(e)
