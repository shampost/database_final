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
    <form onSubmit={handleSubmit} className="listing-form">
      <div className="panel-heading">
        <p className="section-kicker">Sell an item</p>
        <h2>Post a listing</h2>
        <p className="panel-note">Keep it simple: a clear title, price, condition, and a photo if you have one.</p>
      </div>
      <input
        required
        placeholder="Item name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        placeholder="Short description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <div className="form-row">
        <input
          required
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <select value={condition} onChange={(e) => setCondition(e.target.value)}>
          {['New', 'Like New', 'Good', 'Fair', 'Poor'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <input
        type="url"
        placeholder="Direct image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <p className="field-note">
        Paste the image file URL itself.
      </p>
      <button disabled={loading} type="submit">{loading ? 'Saving...' : 'Post Item'}</button>
      {error && <p className="form-error">Error: {error}</p>}
      {success && <p className="form-success">Post created!</p>}
    </form>
  )
}
