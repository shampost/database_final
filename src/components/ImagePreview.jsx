import { useState } from 'react'

function isLikelyDirectImageUrl(url) {
  return /\.(avif|gif|jpe?g|png|webp|svg)(\?|#|$)/i.test(url)
}

export default function ImagePreview({ src, alt, title, variant = 'detail' }) {
  const [failed, setFailed] = useState(false)

  if (!src) {
    if (variant === 'card') {
      return (
        <div className="card-placeholder card-placeholder-image">
          <span className="card-placeholder-mark">{(title || 'DU').slice(0, 2).toUpperCase()}</span>
          <span className="card-placeholder-text">No photo uploaded</span>
        </div>
      )
    }
    return null
  }

  if (failed) {
    if (variant === 'card') {
      return (
        <div className="card-placeholder card-placeholder-image">
          <span className="card-placeholder-mark">{(title || 'DU').slice(0, 2).toUpperCase()}</span>
          <span className="card-placeholder-text">Photo unavailable</span>
        </div>
      )
    }

    return (
      <div className="image-fallback">
        <strong>Image could not be displayed</strong>
        <span>
          Paste a direct image link, such as one ending in .jpg, .png, or .webp.
        </span>
        <a href={src} target="_blank" rel="noreferrer">
          Open link
        </a>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt || 'Listing image'}
      onError={() => setFailed(true)}
      className={variant === 'card' ? 'card-image' : 'detail-image'}
      data-direct-image={isLikelyDirectImageUrl(src) ? 'true' : 'false'}
    />
  )
}