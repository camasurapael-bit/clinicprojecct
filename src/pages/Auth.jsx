import { useState } from 'react'
import { HeartPulse } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { err } from '../utils/helpers'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } },
        })
        if (error) throw error
        alert('Account created! Check your email to confirm, then log in.')
        setMode('login')
      }
    } catch (e2) { setError(err(e2)) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-teal-50 via-slate-100 to-cyan-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-teal-600 grid place-items-center text-white"><HeartPulse size={22} /></div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">ClinicOS</h1>
        </div>
        <div className="bento p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="text-sm text-slate-500 mt-1 mb-5">{mode === 'login' ? 'Log in to book appointments and view records.' : 'Sign up as a patient in seconds.'}</p>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full name</label>
                <input className="input" required value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Juan Dela Cruz" />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
            <button className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
            </button>
          </form>
          <p className="text-sm text-center text-slate-500 mt-5">
            {mode === 'login' ? "No account yet? " : 'Already registered? '}
            <button className="font-semibold text-teal-600 hover:underline" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">Online appointment & records system · powered by Supabase</p>
      </div>
    </div>
  )
}
