import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { Link } from 'react-router-dom'
import ImagePreview from './ImagePreview.jsx'

export default function ListingList({ user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orderBy, setOrderBy] = useState('created_at') // or 'upvotes'
  const [searchTerm, setSearchTerm] = useState('')

  async function load() {
    setLoading(true)
    const column = orderBy === 'upvotes' ? 'upvotes' : 'created_at'
    const { data, error: selectError } = await supabase
      .from('posts')
      .select('id,title,description,price,condition,image_url,created_at,upvotes')
      .order(column, { ascending: false })
      .limit(100)
    if (selectError) setError(selectError.message)
    else setPosts(data || [])
    setLoading(false)
  }

  const visiblePosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return posts
    return posts.filter((post) => {
      const searchable = [post.title, post.description, post.condition]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(query)
    })
  }, [posts, searchTerm])

  function formatPrice(price) {
    if (price == null || Number.isNaN(Number(price))) return 'Price on request'
    const numericPrice = Number(price)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: Number.isInteger(numericPrice) ? 0 : 2
    }).format(numericPrice)
  }

  function initialsFromTitle(title) {
    return (title || 'DU').slice(0, 2).toUpperCase()
  }

  function listingRecord(payload) {
    return {
      id: payload.new.id,
      title: payload.new.title,
      description: payload.new.description,
      price: payload.new.price,
      condition: payload.new.condition,
      image_url: payload.new.image_url,
      created_at: payload.new.created_at,
      upvotes: payload.new.upvotes
    }
  }

  useEffect(() => {
    load()
  }, [orderBy])

  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => [listingRecord(payload), ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => prev.map((post) => (post.id === payload.new.id ? listingRecord(payload) : post)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function upvote(post) {
    const current = post.upvotes || 0
    const { data, error: updError } = await supabase.from('posts').update({ upvotes: current + 1 }).eq('id', post.id).select('id,upvotes')
    if (updError) {
      alert('Upvote failed: ' + updError.message)
    } else if (data && data[0]) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, upvotes: data[0].upvotes } : p))
    }
  }

  if (loading) return <p className="feed-state">Loading campus listings...</p>
  if (error) return <p className="feed-state feed-error">Error: {error}</p>

  return (
    <div className="market-section">
      <div className="market-toolbar glass">
        <div className="toolbar-search">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items, prices, or conditions"
            aria-label="Search listings"
          />
        </div>
        <button
          type="button"
          onClick={() => setOrderBy(orderBy === 'created_at' ? 'upvotes' : 'created_at')}
          className="toolbar-button"
        >
          Sort: {orderBy === 'created_at' ? 'Newest' : 'Top Upvotes'}
        </button>
      </div>

      <div className="toolbar-meta">
        <span>{user ? 'Signed in' : 'Browsing as guest'}</span>
        <span>{visiblePosts.length} results</span>
      </div>

      {visiblePosts.length === 0 && (
        <div className="empty-state glass">
          <h3>No listings found</h3>
          <p>Try a broader search or post the first item.</p>
        </div>
      )}

      <div className="post-grid">
        {visiblePosts.map((p) => (
          <article key={p.id} className="post-card marketplace-card">
            <Link to={`/post/${p.id}`} className="card-media" aria-label={p.title || 'Open listing'}>
              {p.image_url ? (
                <ImagePreview src={p.image_url} alt={p.title} variant="card" title={p.title} />
              ) : (
                <div className="card-placeholder card-placeholder-image">
                  <span className="card-placeholder-mark">{initialsFromTitle(p.title)}</span>
                  <span className="card-placeholder-text">No photo uploaded</span>
                </div>
              )}
            </Link>
            <div className="card-body">
              <div className="card-top">
                <span className="price-pill">{formatPrice(p.price)}</span>
                <span className="condition-pill">{p.condition || 'Unknown'}</span>
              </div>
              <Link to={`/post/${p.id}`} className="post-title">
                {p.title || '(Untitled)'}
              </Link>
              <p className="post-desc">{p.description || 'Student listing ready for campus pickup.'}</p>
              <div className="card-meta">
                <time dateTime={p.created_at}>{new Date(p.created_at).toLocaleDateString()}</time>
                <span>Upvotes {p.upvotes || 0}</span>
              </div>
              <div className="card-actions">
                <button type="button" onClick={() => upvote(p)} className="ghost-button">⬆ Upvote</button>
                <Link to={`/post/${p.id}`} className="secondary-link">View details</Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="feed-actions">
        <button onClick={load}>Refresh</button>
      </div>
    </div>
  )
}
