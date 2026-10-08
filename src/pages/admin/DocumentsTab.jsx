import { useState, useRef } from 'react'
import { Upload, StickyNote, Trash2, Eye, FileText, CloudUpload, Users } from 'lucide-react'
import { Bento, Tile, Empty } from '../../components/Bento'
import { supabase, BUCKET } from '../../supabaseClient'
import { fmtBytes, err } from '../../utils/helpers'

export default function DocumentsTab({ clients, documents, reload, setViewDoc }) {
  const [target, setTarget] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState({ title: '', content: '', client_id: '' })
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef(null)

  async function getClientId() {
    if (target) return target
    if (note.client_id) return note.client_id
    throw new Error('Select a client first.')
  }

  /** Upload files (PDF/image/txt) to PRIVATE storage under {client_id}/ … then insert a
   *  documents row tagged with client_id → instantly visible in that client's portal. */
  async function uploadFiles(files) {
    setError('')
    let clientId
    try { clientId = await getClientId() } catch (e) { setError(e.message); return }
    const { data: { user } } = await supabase.auth.getUser()
    for (const f of files) {
      setBusy(`Uploading ${f.name}…`)
      const ext = f.name.split('.').pop()?.toLowerCase() || 'bin'
      const path = `${clientId}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, '_')}`
      const kind = ext === 'pdf' ? 'pdf' : f.type.startsWith('image/') ? 'image' : 'txt'
      const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || 'application/octet-stream' })
      if (up.error) { setError(err(up.error)); continue }
      const ins = await supabase.from('documents').insert({
        client_id: clientId, uploaded_by: user.id, title: f.name, kind,
        storage_path: path, file_size: f.size, mime_type: f.type || null, visible_to_client: true,
      })
      if (ins.error) setError(err(ins.error))
    }
    setBusy(''); reload()
  }

  async function saveNote(e) {
    e.preventDefault(); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('documents').insert({
      client_id: note.client_id, uploaded_by: user.id,
      title: note.title || 'Untitled note', kind: 'note', content: note.content, visible_to_client: true,
    })
    if (error) { setError(err(error)); return }
    setNote({ title: '', content: '', client_id: '' }); setNoteOpen(false); reload()
  }

  async function removeDoc(doc) {
    if (!confirm(`Delete "${doc.title}"? This also removes the stored file.`)) return
    if (doc.storage_path) await supabase.storage.from(BUCKET).remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    reload()
  }

  return (
    <Bento>
      <Tile title="Upload files for a client" icon={Upload} span="md:col-span-2 xl:col-span-2">
        <div className="space-y-3">
          <div>
            <label className="label">Deliver to client</label>
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— select client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
            </select>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFiles([...e.dataTransfer.files]) }}
            onClick={() => fileInput.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center cursor-pointer transition-colors ${dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-teal-400'}`}
          >
            <CloudUpload size={32} className="text-teal-600" />
            <p className="text-sm font-semibold text-slate-700">{busy || 'Drag & drop files here, or click to browse'}</p>
            <p className="text-xs text-slate-400">PDF · TXT · images — stored privately in Supabase Storage</p>
            <input ref={fileInput} type="file" multiple hidden accept=".pdf,.txt,.md,image/*"
              onChange={(e) => { uploadFiles([...e.target.files]); e.target.value = '' }} />
          </div>
          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
      </Tile>

      <Tile title="Write a note for a client" icon={StickyNote} span="md:col-span-2 xl:col-span-2"
        action={<button className="btn-primary !py-1.5 text-xs" onClick={() => setNoteOpen(!noteOpen)}>{noteOpen ? 'Close' : 'New note'}</button>}>
        {noteOpen ? (
          <form onSubmit={saveNote} className="space-y-3">
            <div>
              <label className="label">Client</label>
              <select className="input" required value={note.client_id} onChange={(e) => setNote({ ...note, client_id: e.target.value })}>
                <option value="">— select client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" required value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} placeholder="e.g. Post-consultation instructions" />
            </div>
            <div>
              <label className="label">Note content</label>
              <textarea className="input font-mono text-[13px]" rows={8} value={note.content} onChange={(e) => setNote({ ...note, content: e.target.value })} placeholder="Write anything — lab reminders, care instructions, prescriptions…" />
            </div>
            <button className="btn-primary">Save & share to client</button>
          </form>
        ) : (
          <Empty icon={StickyNote} text="Create a text note that lands directly in a client's records." />
        )}
      </Tile>

      <Tile title={`Shared documents (${documents.length})`} icon={FileText} span="md:col-span-2 xl:col-span-4">
        {documents.length === 0 ? <Empty text="Nothing uploaded yet." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {documents.map((d) => (
              <div key={d.id} className="rounded-xl ring-1 ring-slate-200 bg-slate-50 p-3 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white ring-1 ring-slate-200 grid place-items-center text-teal-600 shrink-0">
                    {d.kind === 'pdf' ? <FileText size={17} /> : d.kind === 'note' ? <StickyNote size={17} /> : <Upload size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{d.title}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Users size={11} /> {d.profiles?.full_name || d.profiles?.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{d.kind}{d.file_size ? ` · ${fmtBytes(d.file_size)}` : ''}</span>
                  <div className="flex gap-1.5">
                    <button className="btn-ghost !p-1.5" title="Preview" onClick={() => setViewDoc(d)}><Eye size={15} /></button>
                    <button className="btn-ghost !p-1.5 text-rose-600" title="Delete" onClick={() => removeDoc(d)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Tile>
    </Bento>
  )
}
