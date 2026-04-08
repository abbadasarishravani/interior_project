import React, { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE } from "../config"

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (!ref.current) return
      if (ref.current.contains(e.target)) return
      onOutside?.()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onOutside])
}

export default function Profile({
  user = null,
  apiBase = '',
  getAuthHeaders = () => ({ 'Content-Type': 'application/json' }),
  onLogout,
  onViewProfile,
  onMyDesigns,
  preferences = null,
  onGoToProfile,
}) {
  const [open, setOpen] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [myReviews, setMyReviews] = useState({ mode: 'given', reviews: [] })
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photo, setPhoto] = useState(user?.photo || null)
  const [likedDesigns, setLikedDesigns] = useState([])
  const wrapperRef = useRef(null)

  useOutsideClick(wrapperRef, () => setOpen(false))

  useEffect(() => {
    setPhoto(user?.photo || null)
  }, [user?.photo])

  const initials = useMemo(() => {
    const name = String(user?.name || '').trim()
    if (!name) return 'U'
    const parts = name.split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase()).join('')
  }, [user?.name])

  const LIKED_KEY = 'ic_liked_designs'

  const loadLikedDesigns = () => {
    try {
      const likedList = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')
      setLikedDesigns(Array.isArray(likedList) ? likedList : [])
    } catch {
      setLikedDesigns([])
    }
  }

  const handlePhotoFile = async (file) => {
    if (!file) return
    if (!apiBase) {
      alert('API base missing; cannot upload photo.')
      return
    }

    // Keep it lightweight: allow small-ish images only.
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
        setPhoto(user?.photo || null)
        alert(e?.message || 'Failed to upload photo')
      } finally {
        setPhotoUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = async () => {
    if (!apiBase) {
      alert('API base missing; cannot remove photo.')
      return
    }
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

  const loadMyReviews = async () => {
    if (!user) return
    setLoadingReviews(true)
    try {
      const res = await fetch(`${apiBase}/api/reviews/me`, { headers: getAuthHeaders() })
      const data = await res.json().catch(() => ({ mode: 'given', reviews: [] }))
      if (!res.ok) throw new Error(data?.message || 'Failed to load reviews')
      setMyReviews({
        mode: data?.mode === 'received' ? 'received' : 'given',
        reviews: Array.isArray(data?.reviews) ? data.reviews : [],
      })
    } catch (e) {
      alert(e?.message || 'Failed to load reviews')
    } finally {
      setLoadingReviews(false)
    }
  }

  const openReviews = async () => {
    setOpen(false)
    if (onGoToProfile) {
      onGoToProfile()
      return
    }
    setShowReviews(true)
    if (user?.role === 'customer') loadLikedDesigns()
    await loadMyReviews()
  }

  return (
    <>
      <div className="ic-profile-menu" ref={wrapperRef}>
        <button
          className="ic-profile-icon"
          onClick={() => setOpen((s) => !s)}
          aria-label="Open profile menu"
        >
          {photo ? (
            <img
              src={photo}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span className="ic-profile-initials">{initials}</span>
          )}
        </button>

        {open && (
          <div className="ic-profile-dropdown">
            {user ? (
              <>
                <div className="ic-profile-summary">
                  <div className="ic-profile-summary-name">{user.name}</div>
                  <div className="ic-profile-summary-email">{user.email}</div>
                  <div className="ic-profile-summary-role">{user.role}</div>
                </div>

                <div
                  style={{
                    padding: '0.6rem 1rem 0.9rem',
                    borderBottom: '1px solid rgba(229,231,235,0.9)',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.35rem' }}>
                    Upload/Edit profile photo (optional)
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={photoUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      handlePhotoFile(file)
                    }}
                  />
                  {photoUploading ? (
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.35rem' }}>
                      Uploading…
                    </div>
                  ) : null}

                  {photo ? (
                    <button
                      type="button"
                      className="ic-profile-item danger"
                      onClick={handleRemovePhoto}
                      disabled={photoUploading}
                      style={{ marginTop: '0.6rem' }}
                    >
                      Remove profile photo
                    </button>
                  ) : null}
                </div>

                {user.role === 'designer' ? (
                  <button
                    className="ic-profile-item"
                    onClick={() => {
                      setOpen(false)
                      if (onGoToProfile) onGoToProfile()
                      else onViewProfile?.()
                    }}
                  >
                    View Profile
                  </button>
                ) : null}

                {user.role === 'designer' ? (
                  <button
                    className="ic-profile-item"
                    onClick={() => {
                      setOpen(false)
                      onMyDesigns?.()
                    }}
                  >
                    Build Profile
                  </button>
                ) : null}

                <button className="ic-profile-item" onClick={openReviews}>
                  {user.role === 'customer' ? 'My Profile' : 'My Reviews'}
                </button>

                <button
                  className="ic-profile-item danger"
                  onClick={() => {
                    setOpen(false)
                    onLogout?.()
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="ic-profile-loggedout">Log in to see your profile and reviews.</div>
            )}
          </div>
        )}
      </div>

      {showReviews && (
        <div className="ic-modal-backdrop" onClick={() => setShowReviews(false)}>
          <div className="ic-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ic-modal-head">
              <h3>
                {user?.role === 'customer'
                  ? 'Your Profile'
                  : myReviews.mode === 'received'
                    ? 'Reviews on my designs'
                    : 'My reviews'}
              </h3>
              <button className="ic-modal-close" onClick={() => setShowReviews(false)}>
                ✕
              </button>
            </div>

            <div className="ic-modal-body">
              {user?.role === 'customer' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 800, color: '#111827', marginBottom: '0.35rem' }}>
                    Preferences
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    <div>Style: {preferences?.style || '—'}</div>
                    <div>Space: {preferences?.space || '—'}</div>
                    <div>
                      Budget: {preferences?.minBudget || '—'} to {preferences?.maxBudget || '—'}
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', fontWeight: 800, color: '#111827', marginBottom: '0.35rem' }}>
                    Liked designs
                  </div>
                  {likedDesigns.length ? (
                    <div
                      className="ic-profile-portfolio"
                      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
                    >
                      {likedDesigns.slice(0, 9).map((d) => (
                        <div key={d.likeId} className="ic-profile-shot">
                          <img
                            src={d.imageUrl || 'https://via.placeholder.com/300'}
                            alt={d.title || 'Liked design'}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      No liked designs yet.
                    </div>
                  )}
                </div>
              ) : null}

              {loadingReviews ? (
                <div>Loading…</div>
              ) : myReviews.reviews.length ? (
                <div className="ic-modal-body ic-review-list" style={{ padding: 0 }}>
                  {myReviews.reviews.map((r) => (
                    <div key={r._id} className="ic-review-item">
                      <div className="ic-review-top">
                        <strong>{r.rating} / 5</strong>
                        {myReviews.mode === 'received' ? (
                          <span className="ic-review-meta">
                            {r.user?.name ? `by ${r.user.name}` : ''}
                          </span>
                        ) : (
                          <span className="ic-review-meta">
                            {r.design?.displayName ? `for ${r.design.displayName}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="ic-review-comment">{r.comment}</div>
                      <div className="ic-review-date">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>No reviews found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}