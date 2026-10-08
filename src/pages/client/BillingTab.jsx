import { Receipt, Printer } from 'lucide-react'
import { Bento, Tile, Empty, StatCard } from '../../components/Bento'
import { fmtDate } from '../../utils/helpers'

/** Client-facing billing: invoices the clinic issued against this client's account. */
export default function BillingTab({ invoices }) {
  const unpaid = invoices.filter((i) => i.status === 'unpaid')
  const totalDue = unpaid.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)

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
      <p><b>Billed to:</b> You</p>
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
      <StatCard icon={Receipt} label="Outstanding" value={`₱${totalDue.toFixed(2)}`} sub={`${unpaid.length} unpaid invoice${unpaid.length !== 1 ? 's' : ''}`} />
      <div className="bento md:col-span-1 flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-teal-50 text-teal-600 grid place-items-center"><Receipt size={22} /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paid to date</p>
          <p className="text-2xl font-extrabold text-slate-900 leading-tight">₱{totalPaid.toFixed(2)}</p>
        </div>
      </div>

      <Tile title="My invoices" icon={Receipt} span="md:col-span-2 xl:col-span-4">
        {invoices.length === 0 ? <Empty icon={Receipt} text="No invoices yet — bills issued by the clinic will appear here." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-xl ring-1 ring-slate-200 bg-slate-50 p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-slate-700">{inv.invoice_no}</p>
                    <p className="text-xs text-slate-400">{fmtDate(inv.created_at)}</p>
                  </div>
                  <span className={`text-[11px] font-bold uppercase rounded-full px-2.5 py-1 ${inv.status === 'paid' ? 'bg-teal-100 text-teal-700' : inv.status === 'void' ? 'bg-slate-200 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-0.5">
                  {(inv.items || []).slice(0, 3).map((it, i) => (
                    <li key={i} className="flex justify-between gap-2"><span className="truncate">{it.description} ×{it.qty}</span><span>₱{(it.qty * it.price).toFixed(2)}</span></li>
                  ))}
                  {(inv.items || []).length > 3 && <li className="text-slate-400">+ {(inv.items.length - 3)} more item(s)</li>}
                </ul>
                <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-slate-200">
                  <span className="text-lg font-extrabold text-teal-700">₱{Number(inv.total).toFixed(2)}</span>
                  <button className="btn-ghost !py-1.5 text-xs" onClick={() => printInvoice(inv)}><Printer size={14} /> Receipt</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Tile>
    </Bento>
  )
}
