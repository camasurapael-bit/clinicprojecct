import { useEffect, useState } from 'react'
import { FileText, X, Download, StickyNote, File as FileIcon } from 'lucide-react'
import { supabase, BUCKET } from '../supabaseClient'
import { fmtBytes } from '../utils/helpers'

/**
 * Unified document viewer modal.
 * - kind 'note'/'txt' with `content` → inline text (notes editor output)
 * - kind 'pdf'/'image' with `storage_path` → signed URL render (iframe/img)
 */
export default function DocumentViewer({ doc, onClose }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    async function run() {
      if (!doc?.storage_path) return
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 600)
      if (!live) return
      if (error) setError(error.message)
      else setUrl(data.signedUrl)
    }
    run()
    return () => { live = false }
  }, [doc])

  if (!doc) return null
  const isText = doc.kind === 'note' || doc.kind === 'txt'
  const isPdf = doc.kind === 'pdf'

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 grid place-items-center">
            {isText ? <StickyNote size={18} /> : isPdf ? <FileText size={18} /> : <FileIcon size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 truncate">{doc.title}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{doc.kind}{doc.file_size ? ` · ${fmtBytes(doc.file_size)}` : ''}</p>
          </div>
          {url && <a href={url} target="_blank" rel="noreferrer" className="btn-ghost !px-3"><Download size={16} /><span className="hidden sm:inline">Download</span></a>}
          <button className="btn-ghost !px-3" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="overflow-auto p-4 sm:p-5 flex-1">
          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">{error}</p>}
          {isText && <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{doc.content || '(empty note)'}</pre>}
          {!isText && !url && !error && <p className="text-sm text-slate-400">Loading preview…</p>}
          {!isText && isPdf && url && (
            <iframe title={doc.title} src={url} className="w-full h-[60vh] sm:h-[70vh] rounded-xl border border-slate-200" />
          )}
          {!isText && !isPdf && url && <img src={url} alt={doc.title} className="max-h-[65vh] rounded-xl mx-auto" />}
        </div>
      </div>
    </div>
  )
}
