import { useState } from 'react'
import { Receipt, Plus, Trash2, CheckCircle2, Ban, Printer } from 'lucide-react'
import { Bento, Tile, Empty } from '../../components/Bento'
import { supabase } from '../../supabaseClient'
import { fmtDate, err } from '../../utils/helpers'

const Money = ({ v }) => <span>₱{Number(v || 0).toFixed(2)}</span>

export default function InvoicesTab({ invoices, patients, appointments, reload }) {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    patient_id: '', appointment_id: '', tax_rate: 0, discount: 0,
    payment_method: 'cash', notes: '',
  })
  const [items, setItems] = useState([{ description: '', qty: 1, price: 0 }])

  const filtered = invoices.filter((i) => filter === 'all' || i.status === filter)
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0)
  const total = Math.max(0, subtotal + subtotal * (Number(form.tax_rate) || 0) / 100 - (Number(form.discount) || 0))

  async function createInvoice(e) {
    e.preventDefault(); setError('')
    const patient = patients.find((p) => p.id === form.patient_id)
    if (!patient) { setError('Select a patient.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('invoices').insert({
      appointment_id: form.appointment_id || null,
      patient_id: patient.id,
      client_id: patient.user_id || null,          // null = walk-in (no account)
      items: items.filter((it) => it.description),
      subtotal, tax_rate: Number(form.tax_rate) || 0,
      discount: Number(form.discount) || 0, total,
      status: 'unpaid', payment_method: form.payment_method,
      notes: form.notes, issued_by: user.id,
    })
    if (error) { setError(err(error)); return }
    setItems([{ description: '', qty: 1, price: 0 }])
    setForm({ patient_id: '', appointment_id: '', tax_rate: 0, discount: 0, payment_method: 'cash', notes: '' })
    setShowForm(false); reload()
  }

  async function setStatus(inv, status) {
    const patch = { status }
    if (status === 'paid') patch.paid_at = new Date().toISOString()
    await supabase.from('invoices').update(patch).eq('id', inv.id)
    reload()
  }

  function printInvoice(inv) {
    const rows = (inv.items || []).map((it) =>
      `<tr><td>${it.description}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">₱${Number(it.price).toFixed(2)}</td><td style="text-align:right">₱${(it.qty * it.price).toFixed(2)}</td></tr>`).join('')
    const w = window.open('', '_blank', 'width=480,height=640')
    w.document.write(`<html><head><title>${inv.invoice_no}</title><style>
      body{font-family:Inter,sans-serif;padding:32px;color:#1e293b}h1{font-size:18px;margin:0 0 2px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
      th,td{padding:6px 8px;border-bottom:1px solid #e2e8f0}th{text-align:left;font-size:11px;text-transform:uppercase;color:#64748b}
      .tot{display:flex;justify-content:flex-end;margin-top:12px}.tot table{width:auto}
      .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700}
      .paid{background:#ccfbf1;color:#0f766e}.unpaid{background:#fef3c7;color:#b45309}</style></head><body>
      <h1>ClinicOS</h1><p style="margin:0;color:#64748b;font-size:12px">${inv.invoice_no} · ${fmtDate(inv.created_at)}</p>
      <p><b>Billed to:</b> ${inv.patients?.full_name || 'Walk-in patient'}</p>
      <table><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>${rows}</table>
      <div class="tot"><table>
        <tr><td>Subtotal</td><td style="text-align:right">₱${Number(inv.subtotal).toFixed(2)}</td></tr>
        <tr><td>Tax (${inv.tax_rate}%)</td><td style="text-align:right">₱${(Number(inv.subtotal) * inv.tax_rate / 100).toFixed(2)}</td></tr>
        <tr><td>Discount</td><td style="text-align:right">-₱${Number(inv.discount).toFixed(2)}</td></tr>
        <tr><td><b>Total</b></td><td style="text-align:right"><b>₱${Number(inv.total).toFixed(2)}</b></td></tr>
      </table></div>
      <p style="margin-top:20px">Status: <span class="badge ${inv.status}">${inv.status.toUpperCase()}</span></p>
      </body></html>`)
    w.document.close(); w.print()
  }

  return (
    <Bento>
      <Tile title={`Invoices (${invoices.length})`} icon={Receipt} span="md:col-span-2 xl:col-span-4"
        action={
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {['all', 'unpaid', 'paid', 'void'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn-primary !py-1.5 text-xs" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New invoice</button>
          </div>
        }>
        {showForm && (
          <form onSubmit={createInvoice} className="mb-5 rounded-xl bg-teal-50/60 ring-1 ring-teal-100 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Patient (registered or walk-in)</label>
                <select className="input" required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                  <option value="">— select patient —</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.user_id ? '' : ' · walk-in'}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Link to appointment (optional)</label>
                <select className="input" value={form.appointment_id} onChange={(e) => setForm({ ...form, appointment_id: e.target.value })}>
                  <option value="">— none —</option>
                  {appointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {fmtDate(a.appointment_date)} · {a.patients?.full_name || a.profiles?.full_name || 'Patient'} · {a.service}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Line items</label>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2">
                    <input className="input flex-1" placeholder="Service / item description" required={idx === 0}
                      value={it.description} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                    <input className="input sm:!w-20" type="number" min="1" placeholder="Qty" value={it.qty}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, qty: +e.target.value } : x))} />
                    <input className="input sm:!w-28" type="number" min="0" step="0.01" placeholder="Price" value={it.price}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, price: +e.target.value } : x))} />
                    {items.length > 1 && <button type="button" className="btn-ghost !p-2 text-rose-600 self-start" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 size={15} /></button>}
                  </div>
                ))}
              </div>
              <button type="button" className="text-xs font-semibold text-teal-600 hover:underline mt-1.5" onClick={() => setItems([...items, { description: '', qty: 1, price: 0 }])}>+ Add item</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="label">Tax %</label><input className="input" type="number" min="0" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
              <div><label className="label">Discount ₱</label><input className="input" type="number" min="0" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
              <div>
                <label className="label">Payment method</label>
                <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  {['cash', 'card', 'gcash', 'bank_transfer'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="rounded-xl bg-white ring-1 ring-teal-200 px-3 py-2 flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase text-slate-400">Total</span>
                <span className="text-lg font-extrabold text-teal-700"><Money v={total} /></span>
              </div>
            </div>
            <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-primary">Create invoice</button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}
        {filtered.length === 0 ? <Empty text="No invoices yet." /> : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="py-2 pr-3">Invoice #</th><th className="py-2 pr-3">Patient</th>
                  <th className="py-2 pr-3">Date</th><th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3">Status</th><th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-slate-700">{inv.invoice_no}</td>
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">
                      {inv.patients?.full_name || 'Walk-in'}
                      {!inv.client_id && <span className="ml-1.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">walk-in</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{fmtDate(inv.created_at)}</td>
                    <td className="py-2.5 pr-3 text-right font-bold text-slate-800"><Money v={inv.total} /></td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-[11px] font-bold uppercase rounded-full px-2.5 py-1 ${inv.status === 'paid' ? 'bg-teal-100 text-teal-700' : inv.status === 'void' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        {inv.status === 'unpaid' && <>
                          <button title="Mark paid" className="btn-ghost !p-1.5 text-teal-600" onClick={() => setStatus(inv, 'paid')}><CheckCircle2 size={15} /></button>
                          <button title="Void" className="btn-ghost !p-1.5 text-slate-400" onClick={() => setStatus(inv, 'void')}><Ban size={15} /></button>
                        </>}
                        <button title="Print / PDF" className="btn-ghost !p-1.5" onClick={() => printInvoice(inv)}><Printer size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </Bento>
  )
}
