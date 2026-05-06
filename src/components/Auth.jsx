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
      // Grab the current session first so refreshes do not kick the user out.
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

  if (session?.user) {
    return (
      <div className="auth-signed-in">
        <div className="auth-status">
          <span className="auth-badge">Active</span>
          <span className="auth-caption">Signed in as <strong>{session.user.email}</strong></span>
        </div>
        <button type="button" onClick={signOut} disabled={loading}>{loading ? '...' : 'Sign Out'}</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-fields">
        <input
          type="email"
          required
          placeholder="Campus email"
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
      <div className="auth-actions">
        <button type="submit" disabled={loading}>{loading ? '...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}</button>
        <button type="button" disabled={loading} onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          {mode === 'signup' ? 'Switch to Sign In' : 'Switch to Sign Up'}
        </button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <p className="auth-footnote">Secure accounts let you manage your listings and messages.</p>
    </form>
  )
}
