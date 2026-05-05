import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'
import ImagePreview from './ImagePreview.jsx'

export default function PostPage({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: '', condition: 'Good', image_url: '' })
  const [saving, setSaving] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [cLoading, setCLoading] = useState(false)

  async function loadPost() {
    setLoading(true)
    const { data, error: selError } = await supabase.from('posts').select('*').eq('id', id).single()
    if (selError) setError(selError.message)
    else {
      setPost(data)
      setForm({
        title: data.title || '',
        description: data.description || '',
        price: data.price != null ? String(data.price) : '',
        condition: data.condition || 'Good',
        image_url: data.image_url || ''
      })
    }
    setLoading(false)
  }

  async function loadComments() {
    const { data, error: cErr } = await supabase.from('comments').select('id,content,created_at,user_id').eq('post_id', id).order('created_at', { ascending: true })
    if (!cErr) setComments(data || [])
  }

  useEffect(() => {
    loadPost()
    loadComments()
    // Subscribe only to comments for this post using filtered realtime events.
    const channel = supabase
      .channel(`comments-post-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${id}` }, (payload) => {
        setComments(prev => {
          if (prev.some(c => c.id === payload.new.id)) return prev // avoid duplicate if optimistic already added
          return [...prev, { id: payload.new.id, content: payload.new.content, created_at: payload.new.created_at, user_id: payload.new.user_id }]
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${id}` }, (payload) => {
        setComments(prev => prev.filter(c => c.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function upvote() {
    if (!post) return
    const current = post.upvotes || 0
    const { data, error: updError } = await supabase.from('posts').update({ upvotes: current + 1 }).eq('id', post.id).select('*')
    if (!updError && data && data[0]) setPost(data[0])
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!post) return
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description,
      price: form.price ? Number(form.price) : null,
      condition: form.condition,
      image_url: form.image_url || null
    }
    const { data, error: updError } = await supabase.from('posts').update(payload).eq('id', post.id).select('*')
    if (updError) alert('Update failed: ' + updError.message)
    else if (data && data[0]) {
      setPost(data[0])
      setEditMode(false)
    }
    setSaving(false)
  }

  async function deletePost() {
    if (!post) return
    if (!window.confirm('Delete this post?')) return
    const { error: delError } = await supabase.from('posts').delete().eq('id', post.id)
    if (delError) alert('Delete failed: ' + delError.message)
    else navigate('/')
  }

  async function addComment(e) {
    e.preventDefault()
    if (!user) { alert('Sign in to comment.'); return }
    if (!commentText.trim()) return
    setCLoading(true)
    const payload = { post_id: Number(id), user_id: user.id, content: commentText.trim() }
    const { error: insErr, data } = await supabase.from('comments').insert(payload).select('id,content,created_at,user_id')
    if (insErr) {
      alert('Comment failed: ' + insErr.message)
    } else if (data && data[0]) {
      // Optimistic append; realtime may also fire, guarded by duplicate check.
      setComments(prev => prev.some(c => c.id === data[0].id) ? prev : [...prev, data[0]])
      setCommentText('')
    }
    setCLoading(false)
  }

  async function deleteComment(cid) {
    const c = comments.find(c => c.id === cid)
    if (!c) return
    if (user?.id !== c.user_id) { alert('You can only delete your own comments.'); return }
    const { error: delErr } = await supabase.from('comments').delete().eq('id', cid)
    if (delErr) alert('Delete failed: ' + delErr.message)
  }

  function formatPrice(price) {
    if (price == null || Number.isNaN(Number(price))) return 'Price on request'
    const numericPrice = Number(price)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: Number.isInteger(numericPrice) ? 0 : 2
    }).format(numericPrice)
  }

  if (loading) return <p className="feed-state">Loading post...</p>
  if (error) return <p className="feed-state feed-error">Error: {error}</p>
  if (!post) return <p className="feed-state">Post not found.</p>

  const isOwner = user && user.id === post.seller_id

  return (
    <div className="detail-shell">
      <button type="button" onClick={() => navigate(-1)} className="back-button">← Back to feed</button>
      {!editMode && (
        <div className="detail-grid">
          <section className="detail-panel glass">
            <div className="detail-media">
              {post.image_url ? (
                <ImagePreview src={post.image_url} alt={post.title} />
              ) : (
                <div className="card-placeholder detail-placeholder">
                  <span className="card-placeholder-mark">DU</span>
                  <span className="card-placeholder-text">No photo uploaded</span>
                </div>
              )}
            </div>
            <div className="detail-copy">
              <p className="section-kicker">Listing detail</p>
              <h2>{post.title || '(Untitled)'}</h2>
              <div className="detail-price-row">
                <span className="price-pill price-pill-large">{formatPrice(post.price)}</span>
                <span className="condition-pill">{post.condition || 'Unknown'}</span>
              </div>
              {post.description && <p className="detail-description">{post.description}</p>}
              <div className="card-meta detail-meta">
                <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString()}</time>
                <span>Upvotes {post.upvotes || 0}</span>
              </div>
            </div>
            <div className="detail-actions">
              <button type="button" onClick={upvote}>⬆ Upvote</button>
              {isOwner && (
                <>
                  <button type="button" onClick={() => setEditMode(true)} className="secondary-button">Edit</button>
                  <button type="button" onClick={deletePost} className="danger-button">Delete</button>
                </>
              )}
            </div>
          </section>
          <section className="comments-section glass">
            <div className="panel-heading compact">
              <p className="section-kicker">Conversation</p>
              <h3>Comments ({comments.length})</h3>
            </div>
            <form onSubmit={addComment} className="comment-form">
              <textarea rows={3} placeholder={user ? 'Add a comment...' : 'Sign in to comment'} value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!user || cLoading} />
              <button disabled={!user || cLoading || !commentText.trim()} type="submit">{cLoading ? 'Posting...' : 'Post Comment'}</button>
            </form>
            <div className="comment-list">
              {comments.map(c => (
                <div key={c.id} className="comment glass">
                  <p>{c.content}</p>
                  <div className="comment-footer">
                    <time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString()}</time>
                    {user?.id === c.user_id && <button type="button" onClick={() => deleteComment(c.id)} className="danger-button">Delete</button>}
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="empty-copy">No comments yet.</p>}
            </div>
          </section>
        </div>
      )}
      {editMode && (
        <form onSubmit={saveEdit} className="glass edit-panel">
          <div className="panel-heading compact">
            <p className="section-kicker">Edit listing</p>
            <h3>Edit Post</h3>
          </div>
          <input required name="title" value={form.title} onChange={handleFormChange} placeholder="Item name" />
          <textarea name="description" rows={4} value={form.description} onChange={handleFormChange} placeholder="Description" />
          <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleFormChange} placeholder="Price" />
          <select name="condition" value={form.condition} onChange={handleFormChange}>
            {['New','Like New','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
          </select>
          <input name="image_url" type="url" value={form.image_url} onChange={handleFormChange} placeholder="Direct image URL" />
          <p className="field-note">Use a direct image file URL. Unsplash photo pages like /photos/... are not image files.</p>
          <div className="auth-actions">
            <button disabled={saving} type="submit">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button type="button" onClick={() => setEditMode(false)} className="secondary-button">Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
