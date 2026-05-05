import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient.js'

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

  if (loading) return <p>Loading post...</p>
  if (error) return <p style={{ color: 'crimson' }}>Error: {error}</p>
  if (!post) return <p>Post not found.</p>

  const isOwner = user && user.id === post.seller_id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button type="button" onClick={() => navigate(-1)} style={{ width: 'fit-content' }}>← Back</button>
      {!editMode && (
        <div className="post-detail glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          <h2 style={{ margin: 0 }}>{post.title || '(Untitled)'}</h2>
          <time style={{ fontSize: '.7rem', color: 'var(--color-text-muted)' }} dateTime={post.created_at}>{new Date(post.created_at).toLocaleString()}</time>
          {post.image_url && <img src={post.image_url} alt={post.title} style={{ maxWidth: '100%', borderRadius: '.4rem' }} />}
          {post.description && <p style={{ margin: 0 }}>{post.description}</p>}
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.85rem' }}>Condition: {post.condition || 'Unknown'}</span>
            {post.price != null && <span style={{ fontSize: '.85rem' }}>Price: ${post.price}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Upvotes: {post.upvotes || 0}</span>
            <button type="button" onClick={upvote}>⬆ Upvote</button>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setEditMode(true)} style={{ background: 'var(--color-surface-alt)' }}>Edit</button>
              <button type="button" onClick={deletePost} style={{ background: 'crimson' }}>Delete</button>
            </div>
          )}
        </div>
      )}
      {editMode && (
        <form onSubmit={saveEdit} className="glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          <h3 style={{ margin: 0 }}>Edit Post</h3>
          <input required name="title" value={form.title} onChange={handleFormChange} placeholder="Title" />
          <textarea name="description" rows={4} value={form.description} onChange={handleFormChange} placeholder="Description" />
          <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleFormChange} placeholder="Price" />
          <select name="condition" value={form.condition} onChange={handleFormChange}>
            {['New','Like New','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
          </select>
          <input name="image_url" type="url" value={form.image_url} onChange={handleFormChange} placeholder="Image URL" />
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button disabled={saving} type="submit">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button type="button" onClick={() => setEditMode(false)} style={{ background: 'var(--color-surface-alt)' }}>Cancel</button>
          </div>
        </form>
      )}
      <section className="comments-section" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <h3 style={{ margin: 0 }}>Comments ({comments.length})</h3>
        <form onSubmit={addComment} style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <textarea rows={3} placeholder={user ? 'Add a comment...' : 'Sign in to comment'} value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={!user || cLoading} />
          <button disabled={!user || cLoading || !commentText.trim()} type="submit">{cLoading ? 'Posting...' : 'Post Comment'}</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {comments.map(c => (
            <div key={c.id} className="comment glass" style={{ padding: '.6rem', borderRadius: '.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              <p style={{ margin: 0 }}>{c.content}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <time style={{ fontSize: '.6rem', color: 'var(--color-text-muted)' }} dateTime={c.created_at}>{new Date(c.created_at).toLocaleString()}</time>
                {user?.id === c.user_id && <button type="button" onClick={() => deleteComment(c.id)} style={{ background: 'crimson' }}>Delete</button>}
              </div>
            </div>
          ))}
          {comments.length === 0 && <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No comments yet.</p>}
        </div>
      </section>
    </div>
  )
}
