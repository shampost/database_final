import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { Link } from 'react-router-dom'

export default function ListingList({ user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orderBy, setOrderBy] = useState('created_at') // or 'upvotes'

  async function load() {
    setLoading(true)
    const column = orderBy === 'upvotes' ? 'upvotes' : 'created_at'
    const { data, error: selectError } = await supabase
      .from('posts')
      .select('id,title,created_at,upvotes')
      .order(column, { ascending: false })
      .limit(100)
    if (selectError) setError(selectError.message)
    else setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [orderBy])

  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => [
          { id: payload.new.id, title: payload.new.title, created_at: payload.new.created_at, upvotes: payload.new.upvotes },
          ...prev
        ])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => prev.map(p => p.id === payload.new.id ? { id: payload.new.id, title: payload.new.title, created_at: payload.new.created_at, upvotes: payload.new.upvotes } : p))
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

  if (loading) return <p>Loading posts...</p>
  if (error) return <p style={{ color: 'crimson' }}>Error: {error}</p>

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Home Feed</h2>
        <button type="button" onClick={() => setOrderBy(orderBy === 'created_at' ? 'upvotes' : 'created_at')} style={{ background: 'var(--color-surface-alt)' }}>
          Sort: {orderBy === 'created_at' ? 'Newest' : 'Top Upvotes'}
        </button>
      </div>
      {posts.length === 0 && <p style={{ color: 'var(--color-text-muted)', marginTop: '.75rem' }}>No posts yet.</p>}
      <div className="post-grid" style={{ marginTop: '1rem' }}>
        {posts.map((p) => (
          <article key={p.id} className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <Link to={`/post/${p.id}`} className="post-title" style={{ textDecoration: 'none' }}>{p.title || '(Untitled)'}</Link>
            <time style={{ fontSize: '.65rem', color: 'var(--color-text-muted)' }} dateTime={p.created_at}>{new Date(p.created_at).toLocaleString()}</time>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.8rem' }}>Upvotes: {p.upvotes || 0}</span>
              <button type="button" onClick={() => upvote(p)} style={{ padding: '.35rem .6rem' }}>⬆ Upvote</button>
            </div>
          </article>
        ))}
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button onClick={load}>Refresh</button>
      </div>
    </div>
  )
}
