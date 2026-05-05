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
    <main className="market-shell">
      <header className="market-hero glass">
        <div className="hero-branding">
          <div className="brand-mark" aria-hidden="true">DU</div>
          <div>
            <p className="section-kicker">Dominican University Marketplace</p>
          </div>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="hero-text">
              Photo-first listings, clear prices, and a cleaner way to trade dorm essentials, tech, books, and campus gear.
            </p>
            <div className="hero-chips" aria-label="Marketplace highlights">
              <span className="hero-chip">Sell Fast</span>
              <span className="hero-chip">Campus pickups</span>
              <span className="hero-chip">Upfront Pricing</span>
            </div>
          </div>
          <section className="auth-panel glass">
            <Auth onSession={(s) => setSession(s)} />
            {!session && <p className="helper-copy">Sign in to list items. Browsing stays open.</p>}
          </section>
        </div>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <section className="market-grid">
              <section className="form-panel glass">
                <ListingForm user={session?.user} />
              </section>
              <section className="posts-section">
                <ListingList user={session?.user} />
              </section>
            </section>
          }
        />
        <Route path="/post/:id" element={<PostPage user={session?.user} />} />
      </Routes>
    </main>
  )
}

export default App
