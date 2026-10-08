import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './pages/Auth'
import AdminDashboard from './pages/AdminDashboard'
import ClientPortal from './pages/ClientPortal'
import { cx } from './utils/helpers'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
      else setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data || null)
    setLoading(false)
  }

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-600 animate-pulse" />
          <p className="text-sm text-slate-500">Loading ClinicOS…</p>
        </div>
      </div>
    )

  if (!session) return <BrowserRouter><Auth /></BrowserRouter>

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff'
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Routes>
          <Route path="/admin" element={isAdmin ? <AdminDashboard session={session} profile={profile} /> : <Navigate to="/" replace />} />
          <Route path="/*" element={<ClientPortal session={session} profile={profile} isAdmin={isAdmin} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
