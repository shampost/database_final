import { useState } from 'react'
import './App.css'
import Auth from './components/Auth.jsx'
import ListingForm from './components/ListingForm.jsx'
import ListingList from './components/ListingList.jsx'
import PostPage from './components/PostPage.jsx'
import { Routes, Route } from 'react-router-dom'

function App() {
  const [session, setSession] = useState(null)

  return (
    <main className="market-container">
      <header className="market-header">
        <h1>Quad Exchange</h1>
        <p>Discover, trade, and upgrade your campus essentials.</p>
      </header>
      <section className="auth-panel glass">
        <Auth onSession={(s) => setSession(s)} />
        {!session && (
          <p style={{ color: 'var(--color-text-muted)', margin: '0', fontSize: '.7rem' }}>
            Sign in to list items. Browsing is open to everyone.
          </p>
        )}
      </section>
      <Routes>
        <Route path="/" element={
          <>
            <section className="form-panel glass">
              <ListingForm user={session?.user} />
            </section>
            <hr className="divider" />
            <section className="posts-section">
              <ListingList user={session?.user} />
            </section>
          </>
        } />
        <Route path="/post/:id" element={<PostPage user={session?.user} />} />
      </Routes>
    </main>
  )
}

export default App
