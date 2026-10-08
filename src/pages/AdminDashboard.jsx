import { useEffect, useState } from 'react'
import {
  LayoutDashboard, CalendarDays, FolderOpen, Clock, Users, Receipt,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { Bento, StatCard, Tile, Empty } from '../components/Bento'
import DocumentViewer from '../components/DocumentViewer'
import { supabase, BUCKET } from '../supabaseClient'
import { fmtDate, fmtTime, fmtBytes, kindOf, err } from '../utils/helpers'

import OverviewTab from './admin/OverviewTab'
import AppointmentsTab from './admin/AppointmentsTab'
import AvailabilityTab from './admin/AvailabilityTab'
import PatientsTab from './admin/PatientsTab'
import DocumentsTab from './admin/DocumentsTab'
import InvoicesTab from './admin/InvoicesTab'

const NAV = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Appointments', icon: CalendarDays },
  { label: 'Documents', icon: FolderOpen },
  { label: 'Availability', icon: Clock },
  { label: 'Patients', icon: Users },
  { label: 'Invoices', icon: Receipt },
]

export default function AdminDashboard({ session, profile }) {
  const [tab, setTab] = useState('Overview')
  const [clients, setClients] = useState([])
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [documents, setDocuments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [stats, setStats] = useState({ today: 0, pending: 0, clients: 0, docs: 0 })
  const [viewDoc, setViewDoc] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function loadAll() {
    const [c, p, a, d, i] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role, created_at').eq('role', 'client').order('full_name'),
      supabase.from('patients').select('id, user_id, full_name, contact_number').order('full_name'),
      supabase.from('appointments').select('*, patients(full_name), profiles(full_name, email)').order('appointment_date', { ascending: true }),
      supabase.from('documents').select('*, profiles!documents_client_id_fkey(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, patients(full_name)').order('created_at', { ascending: false }),
    ])
    if (!c.error) setClients(c.data || [])
    if (!p.error) setPatients(p.data || [])
    if (!a.error) setAppointments(a.data || [])
    if (!d.error) setDocuments(d.data || [])
    if (!i.error) setInvoices(i.data || [])
    const today = new Date().toISOString().slice(0, 10)
    const list = a.data || []
    setStats({
      today: list.filter((x) => x.appointment_date === today && x.status !== 'cancelled').length,
      pending: list.filter((x) => x.status === 'pending').length,
      clients: (c.data || []).length,
      docs: (d.data || []).length,
    })
    // (invoice revenue surfaces inside the Invoices tab)
  }

  useEffect(() => { loadAll() }, [refreshKey])

  const shared = {
    clients, patients, appointments, documents, invoices,
    reload: () => setRefreshKey((k) => k + 1), setViewDoc, notify: loadAll,
  }

  return (
    <DashboardLayout
      profile={profile}
      nav={NAV} active={tab} onNav={setTab}
      title={`Admin · ${tab}`}
      subtitle="Manage appointments, documents and clients — everything syncs live to Supabase."
    >
      {tab === 'Overview' && <OverviewTab {...shared} profile={profile} onGo={setTab} />}
      {tab === 'Appointments' && <AppointmentsTab {...shared} />}
      {tab === 'Documents' && <DocumentsTab {...shared} />}
      {tab === 'Availability' && <AvailabilityTab {...shared} />}
      {tab === 'Patients' && <PatientsTab {...shared} />}
      {tab === 'Invoices' && <InvoicesTab {...shared} />}
      <DocumentViewer doc={viewDoc} onClose={() => setViewDoc(null)} />
    </DashboardLayout>
  )
}
