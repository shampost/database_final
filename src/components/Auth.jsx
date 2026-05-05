import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Auth({ onSession }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('signin')
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        setSession(session)
        onSession(session)
      }
      supabase.auth.onAuthStateChange((_event, s) => {
        if (mounted) {
          setSession(s)
          onSession(s)
        }
      })
    }
    init()
    return () => { mounted = false }
  }, [onSession])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
  }

  // If signed in: show compact panel with user email + sign out.
  if (session?.user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>Signed in as <strong>{session.user.email}</strong></span>
        <button type="button" onClick={signOut} disabled={loading}>{loading ? '...' : 'Sign Out'}</button>
      </div>
    )
  }

  // Not signed in: show sign in / sign up form.
  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.6rem', margin: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
        <button type="submit" disabled={loading}>{loading ? '...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}</button>
        <button type="button" disabled={loading} onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          {mode === 'signup' ? 'Switch to Sign In' : 'Switch to Sign Up'}
        </button>
      </div>
      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
      <p style={{ fontSize: '.65rem', margin: 0, color: 'var(--color-text-muted)' }}>
        Secure accounts let you manage your listings and messages.
      </p>
    </form>
  )
}
