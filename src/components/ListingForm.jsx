import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

// Clean, single component definition for creating posts.
export default function ListingForm({ user }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState('Good')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      setError('Please sign in before posting.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)

    const payload = {
      seller_id: user.id,
      title,
      description,
      price: price ? Number(price) : null,
      condition,
      status: 'active',
      image_url: imageUrl || null,
      upvotes: 0
    }

    const { error: insertError } = await supabase.from('posts').insert(payload)

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(true)
      setTitle('')
      setDescription('')
      setPrice('')
      setCondition('Good')
      setImageUrl('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <h2 style={{ margin: 0 }}>Create Post</h2>
      <input
        required
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <div style={{ display: 'flex', gap: '.6rem' }}>
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ flex: 1 }}>
          {['New', 'Like New', 'Good', 'Fair', 'Poor'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <input
        type="url"
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <button disabled={loading} type="submit">{loading ? 'Saving...' : 'Post Item'}</button>
      {error && <p style={{ color: 'crimson', margin: 0 }}>Error: {error}</p>}
      {success && <p style={{ color: 'var(--color-primary-accent)', margin: 0 }}>Post created!</p>}
    </form>
  )
}
