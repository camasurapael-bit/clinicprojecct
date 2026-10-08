import { useEffect, useState } from 'react'
import { CalendarPlus, FolderOpen, UserRound, Receipt } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { Bento } from '../components/Bento'
import BookingTab from './client/BookingTab'
import RecordsTab from './client/RecordsTab'
import ProfileTab from './client/ProfileTab'
import BillingTab from './client/BillingTab'

const NAV = [
  { label: 'Book', icon: CalendarPlus },
  { label: 'My Records', icon: FolderOpen },
  { label: 'Billing', icon: Receipt },
  { label: 'My Profile', icon: UserRound },
]

export default function ClientPortal({ session, profile, isAdmin }) {
  const [tab, setTab] = useState('Book')
  const [appointments, setAppointments] = useState([])
  const [documents, setDocuments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [slots, setSlots] = useState([])
  const [viewDoc, setViewDoc] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function load() {
    const [a, d, i, s] = await Promise.all([
      supabaseFrom('appointments'),
      supabaseFrom('documents'),
      // RLS automatically scopes this to the signed-in client's own invoices
      supabase.from('invoices').select('*, patients(full_name)').order('created_at', { ascending: false }),
      supabase.from('availability').select('*').gte('available_date', new Date().toISOString().slice(0, 10)).order('available_date').order('start_time'),
    ])
    if (!a.error) setAppointments(a.data || [])
    if (!d.error) setDocuments(d.data || [])
    if (!i.error) setInvoices(i.data || [])
    if (!s.error) setSlots(s.data || [])
  }
  async function supabaseFrom(table) {
    return supabase.from(table).select('*').order('created_at', { ascending: false })
  }

  useEffect(() => { load() }, [refreshKey])

  return (
    <DashboardLayout
      profile={profile}
      nav={NAV} active={tab} onNav={setTab}
      title={tab === 'Book' ? 'Book an appointment' : tab === 'My Records' ? 'My records' : tab}
      subtitle={isAdmin ? 'You are viewing the client portal from an admin account.' : 'Your appointments, records and documents — all in one place.'}
    >
      {tab === 'Book' && <BookingTab appointments={appointments} slots={slots} profile={profile} reload={() => setRefreshKey((k) => k + 1)} />}
      {tab === 'My Records' && <RecordsTab documents={documents} appointments={appointments} slots={slots} setViewDoc={setViewDoc} reload={() => setRefreshKey((k) => k + 1)} />}
      {tab === 'Billing' && <BillingTab invoices={invoices} />}
      {tab === 'My Profile' && <ProfileTab session={session} profile={profile} reload={() => setRefreshKey((k) => k + 1)} />}
      <DocumentViewerLazy doc={viewDoc} onClose={() => setViewDoc(null)} />
    </DashboardLayout>
  )
}

import DocumentViewer from '../components/DocumentViewer'
function DocumentViewerLazy(props) { return <DocumentViewer {...props} /> }
