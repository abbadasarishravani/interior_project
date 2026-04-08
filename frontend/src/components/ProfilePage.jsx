import React, { useEffect, useMemo, useState } from 'react'
import {API_BASE} from "../config"

function StarsText({ rating = 0, count = 0 }) {
  const r = Number(rating) || 0
  return (
    <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
      ⭐ {r ? r.toFixed(1) : '0.0'} rating {count ? `(${count} review${count === 1 ? '' : 's'})` : ''}
    </div>
  )
}

export default function ProfilePage({
  user,
  apiBase = '',
  getAuthHeaders = () => ({ 'Content-Type': 'application/json' }),
  preferences = null,
  designerProfile = null,
  onBack,
}) {
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photo, setPhoto] = useState(user?.photo || null)

  const [loadingReviews, setLoadingReviews] = useState(false)
  const [myReviews, setMyReviews] = useState({ mode: 'given', reviews: [] })

  const LIKED_KEY = 'ic_liked_designs'

  const likedDesigns = useMemo(() => {
    try {
      const likedList = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')
      return Array.isArray(likedList) ? likedList : []
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    setPhoto(user?.photo || null)
  }, [user?.photo])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      setLoadingReviews(true)
      try {
        const res = await fetch(`${apiBase}/api/reviews/me`, { headers: getAuthHeaders() })
        const data = await res.json().catch(() => ({ mode: 'given', reviews: [] }))
        if (!res.ok) throw new Error(data?.message || 'Failed to load reviews')
        if (cancelled) return
        setMyReviews({
          mode: data?.mode === 'received' ? 'received' : 'given',
          reviews: Array.isArray(data?.reviews) ? data.reviews : [],
        })
      } catch (e) {
        if (cancelled) return
        alert(e?.message || 'Failed to load reviews')
      } finally {
        if (!cancelled) setLoadingReviews(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, apiBase, getAuthHeaders])

  const handlePhotoFile = async (file) => {
    if (!file) return
    if (!apiBase) {
      alert('API base missing; cannot upload photo.')
      return
    }
    if (file.size > 1_000_000) {
      alert('Please upload an image under 1MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = String(reader.result || '')
      setPhoto(base64)
      setPhotoUploading(true)
      try {
        const res = await fetch(`${apiBase}/api/auth/photo`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ photo: base64 }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Failed to upload photo')
        setPhoto(data?.user?.photo || null)
      } catch (e) {
        alert(e?.message || 'Failed to upload photo')
      } finally {
        setPhotoUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = async () => {
    if (!apiBase) return
    const prev = photo
    setPhoto(null)
    setPhotoUploading(true)
    try {
      const res = await fetch(`${apiBase}/api/auth/photo`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ photo: null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to remove photo')
      setPhoto(null)
    } catch (e) {
      setPhoto(prev || null)
      alert(e?.message || 'Failed to remove photo')
    } finally {
      setPhotoUploading(false)
    }
  }

  const isDesigner = user?.role === 'designer'

  if (!user) {
    return (
      <section className="ic-section" style={{ minHeight: '100vh' }}>
        <div className="ic-dashboard-container">
          <h1>Profile</h1>
          <p>Please log in.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="ic-section" style={{ minHeight: '100vh', paddingTop: '3rem' }}>
      <div className="ic-dashboard-container">
        <div className="ic-dashboard-header" style={{ textAlign: 'left' }}>
          {onBack ? (
            <button type="button" className="ic-btn ghost" onClick={onBack} style={{ marginBottom: '0.9rem' }}>
              ← Back
            </button>
          ) : null}
          <h1 style={{ marginBottom: '0.3rem' }}>My Profile</h1>
          <p style={{ maxWidth: 680 }}>Your account details, reviews, and liked designs.</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.9fr)',
            gap: '1.6rem',
            alignItems: 'start',
            marginTop: '1.2rem',
          }}
        >
          <div className="ic-profile-main">
            <div className="ic-profile-header">
              <div className="ic-profile-avatar">
                {photo ? (
                  <img
                    src={photo}
                    alt="Profile"
                    style={{ width: 90, height: 90, borderRadius: '1.6rem', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: '1.6rem',
                      background: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#111827',
                    }}
                  >
                    {(user?.name || 'U')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join('')}
                  </div>
                )}
              </div>
              <div className="ic-profile-summary">
                <span className="ic-eyebrow">{isDesigner ? 'Designer account' : 'Customer account'}</span>
                <h2 style={{ marginTop: '0.2rem' }}>{user.name}</h2>
                <p className="ic-profile-location" style={{ marginBottom: '0.2rem' }}>
                  {user.email}
                </p>
                {isDesigner ? (
                  <StarsText rating={designerProfile?.rating || 0} count={designerProfile?.reviews || 0} />
                ) : null}
                {isDesigner ? (
                  <p className="ic-profile-desc" style={{ marginTop: '0.55rem' }}>
                    {designerProfile?.description || ''}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="ic-profile-card ic-profile-card" style={{ marginTop: '1.2rem' }}>
              <h3>Profile Photo</h3>
              <p className="ic-profile-desc" style={{ marginTop: '0.2rem' }}>
                Optional upload for both customers and designers.
              </p>
              <input
                type="file"
                accept="image/*"
                disabled={photoUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  handlePhotoFile(file)
                }}
              />
              {photoUploading ? <div style={{ marginTop: '0.5rem', color: '#9ca3af' }}>Uploading…</div> : null}
              {photo ? (
                <button
                  type="button"
                  className="ic-profile-item danger"
                  onClick={handleRemovePhoto}
                  disabled={photoUploading}
                  style={{ marginTop: '0.8rem' }}
                >
                  Remove profile photo
                </button>
              ) : null}
            </div>

            {!isDesigner ? (
              <div className="ic-profile-card" style={{ marginTop: '1.2rem' }}>
                <h3>Preferences</h3>
                <p className="ic-profile-desc" style={{ marginTop: '0.2rem' }}>
                  Style: {preferences?.style || '—'} <br />
                  Space: {preferences?.space || '—'} <br />
                  Budget: {preferences?.minBudget || '—'} to {preferences?.maxBudget || '—'}
                </p>
              </div>
            ) : (
              <div className="ic-profile-card" style={{ marginTop: '1.2rem' }}>
                <h3>Your portfolio</h3>
                {Array.isArray(designerProfile?.portfolioImages) && designerProfile.portfolioImages.length ? (
                  <div className="ic-profile-portfolio" style={{ marginTop: '0.8rem' }}>
                    {designerProfile.portfolioImages.slice(0, 9).map((url) => (
                      <div key={url} className="ic-profile-shot">
                        <img src={url} alt="Portfolio example" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#6b7280' }}>No portfolio images yet.</div>
                )}
              </div>
            )}
          </div>

          <div>
            {!isDesigner ? (
              <div className="ic-profile-card">
                <h3>Liked designs</h3>
                {likedDesigns.length ? (
                  <div className="ic-profile-portfolio" style={{ marginTop: '0.8rem' }}>
                    {likedDesigns.slice(0, 12).map((d) => (
                      <div key={d.likeId} className="ic-profile-shot">
                        <img src={d.imageUrl || 'https://via.placeholder.com/300'} alt={d.title || 'Liked design'} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#6b7280' }}>No liked designs yet.</div>
                )}
              </div>
            ) : null}

            <div className="ic-profile-card" style={{ marginTop: '1.2rem' }}>
              <h3>{loadingReviews ? 'Loading reviews…' : isDesigner ? 'Reviews on your designs' : 'Your reviews'}</h3>
              {loadingReviews ? (
                <div style={{ color: '#6b7280' }}>Loading…</div>
              ) : myReviews.reviews.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.9rem' }}>
                  {myReviews.reviews.map((r) => (
                    <div key={r._id} className="ic-review-item" style={{ background: '#ffffff' }}>
                      <div className="ic-review-top">
                        <strong>{r.rating} / 5</strong>
                        <span className="ic-review-meta" style={{ marginLeft: '0.6rem' }}>
                          {myReviews.mode === 'received'
                            ? r.user?.name
                              ? `by ${r.user.name}`
                              : ''
                            : r.design?.displayName
                              ? `for ${r.design.displayName}`
                              : ''}
                        </span>
                      </div>
                      <div className="ic-review-comment">{r.comment}</div>
                      <div className="ic-review-date">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#6b7280', marginTop: '0.9rem' }}>No reviews found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

