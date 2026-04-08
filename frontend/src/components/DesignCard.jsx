import React, { useMemo, useState, useEffect } from 'react'
import { API_BASE } from "../config"

const clampRating = (n) => Math.max(1, Math.min(5, Number(n) || 0))

function Stars({ value = 0 }) {
  const full = Math.round((Number(value) || 0) * 2) / 2
  return (
    <span className="ic-stars" aria-label={`Rating ${full} out of 5`}>
      {'★★★★★'.split('').map((s, i) => {
        const idx = i + 1
        return (
          <span key={idx} className={idx <= full ? 'on' : 'off'}>
            {s}
          </span>
        )
      })}
    </span>
  )
}

export default function DesignCard({
  design,
  user = null,
  apiBase = '',
  getAuthHeaders = () => ({ 'Content-Type': 'application/json' }),
}) {
  const LIKED_KEY = 'ic_liked_designs'

  const reviewTargetId = design?.reviewTargetId || design?._id || design?.id
  const likeTargetId = design?.likeId || design?.id || reviewTargetId
  const showReviewsUI = design?.showReviews !== false

  const [liked, setLiked] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [postingReview, setPostingReview] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [designModalOpen, setDesignModalOpen] = useState(false)
  const [modalMinimized, setModalMinimized] = useState(false)
  const [modalMaximized, setModalMaximized] = useState(false)

  useEffect(() => {
    if (!likeTargetId) return

    try {
      const likedList = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')
      const isLiked = Array.isArray(likedList)
        ? likedList.some((d) => String(d?.likeId) === String(likeTargetId))
        : false
      setLiked(isLiked)
    } catch {
      setLiked(false)
    }
  }, [likeTargetId])

  useEffect(() => {
    if (!reviewTargetId) return

    const controller = new AbortController()
    const load = async () => {
      setLoadingReviews(true)
      try {
        const res = await fetch(`${apiBase}/api/designers/${reviewTargetId}/reviews`, {
          signal: controller.signal,
        })
        const data = await res.json().catch(() => [])
        setReviews(Array.isArray(data) ? data : [])
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Failed to fetch reviews:', error)
        }
      } finally {
        setLoadingReviews(false)
      }
    }

    load()
    return () => controller.abort()
  }, [apiBase, reviewTargetId])

  const avgRating = useMemo(() => {
    if (!reviews.length) return Number(design?.rating) || 0
    const total = reviews.reduce((sum, r) => sum + (Number(r?.rating) || 0), 0)
    return total / reviews.length
  }, [reviews, design?.rating])

  const canReview = user?.role === 'customer'

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!reviewTargetId) return
    if (!canReview) return

    const payload = {
      rating: clampRating(newReview.rating),
      comment: String(newReview.comment || '').trim(),
    }
    if (!payload.comment) return

    setPostingReview(true)
    try {
      const res = await fetch(`${apiBase}/api/designers/${reviewTargetId}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to submit review')
      }

      // If it was an edit, replace; otherwise add to top
      setReviews((prev) => {
        const next = Array.isArray(prev) ? [...prev] : []
        const idx = next.findIndex((r) => String(r?._id) === String(data?._id))
        if (idx >= 0) next[idx] = data
        else next.unshift(data)
        return next
      })
      setNewReview({ rating: 5, comment: '' })
    } catch (error) {
      alert(error?.message || 'Failed to submit review')
    } finally {
      setPostingReview(false)
    }
  }

  const toggleLike = async (e) => {
    e?.stopPropagation?.()
    const nextLiked = !liked
    setLiked(nextLiked)

    if (user?.role === 'customer') {
      try {
        const likedList = JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')
        const arr = Array.isArray(likedList) ? likedList : []
        const next = nextLiked
          ? [
              ...arr,
              {
                likeId: likeTargetId,
                title: design?.title || 'Design',
                imageUrl: design?.assets?.[0]?.url || null,
                designerId: reviewTargetId,
              },
            ]
          : arr.filter((d) => String(d?.likeId) !== String(likeTargetId))

        localStorage.setItem(LIKED_KEY, JSON.stringify(next))
      } catch {
        // If storage fails, don't block the UI.
      }
    }
    try {
      // Keeping existing behavior (if you later add a real endpoint, this won't break UI)
      await fetch(`${apiBase}/api/designs/${likeTargetId}/like`, { method: 'POST' })
    } catch (e) {
      console.warn('Like failed', e?.message)
    }
  }

  const openDesignModal = () => {
    setDesignModalOpen(true)
    setModalMinimized(false)
    setModalMaximized(false)
  }

  const closeDesignModal = () => {
    setDesignModalOpen(false)
    setModalMinimized(false)
    setModalMaximized(false)
  }

  const toggleMaximize = () => {
    setModalMaximized((v) => !v)
  }

  return (
    <>
      <div className="design-card">
      <div
        className="design-thumb"
        onClick={openDesignModal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') openDesignModal()
        }}
      >
        {design.assets && design.assets[0] ? (
          <img src={design.assets[0].url} alt={design.title || 'design'} />
        ) : (
          <div className="design-placeholder">No image</div>
        )}
      </div>
      <div className="design-body">
        <h4>{design.title || 'Untitled'}</h4>
        <p className="design-cats">{(design.categories || []).join(', ')}</p>
        <div className="design-rating-row">
          <Stars value={avgRating} />{' '}
          <span className="design-rating-text">
            {avgRating ? avgRating.toFixed(1) : '0.0'} ({reviews.length})
          </span>
        </div>
        <div className="design-actions">
          <button onClick={toggleLike}>{liked ? 'Liked' : 'Like'}</button>
        </div>
        {showReviewsUI && (
          <div className="design-reviews">
            <h5>Reviews</h5>
            {loadingReviews ? (
              <div className="design-reviews-empty">Loading…</div>
            ) : reviews.length ? (
              reviews.map((review) => (
                <div
                  key={review._id || `${review.user}-${review.createdAt}`}
                  className="review"
                >
                  <div className="review-head">
                    <strong>{review.rating} / 5</strong>
                    {review.user?.name ? (
                      <span className="review-by">by {review.user.name}</span>
                    ) : null}
                  </div>
                  <p>{review.comment}</p>
                </div>
              ))
            ) : (
              <div className="design-reviews-empty">No reviews yet</div>
            )}

            {canReview ? (
              <form onSubmit={handleReviewSubmit} className="design-review-form">
                <label>
                  Rating
                  <select
                    value={newReview.rating}
                    onChange={(e) =>
                      setNewReview((r) => ({ ...r, rating: clampRating(e.target.value) }))
                    }
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Comment
                  <textarea
                    value={newReview.comment}
                    onChange={(e) =>
                      setNewReview((r) => ({ ...r, comment: e.target.value }))
                    }
                    placeholder="Write your feedback…"
                    required
                  />
                </label>
                <button type="submit" disabled={postingReview}>
                  {postingReview ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            ) : user ? (
              <div className="design-review-hint">
                {user.role === 'designer'
                  ? 'Designers can view reviews on their designs.'
                  : null}
              </div>
            ) : (
              <div className="design-review-hint">
                Log in as a customer to write a review.
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Larger design modal */}
      {designModalOpen && modalMinimized && (
        <div
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '1rem',
            width: '320px',
            borderRadius: '14px',
            overflow: 'hidden',
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
            zIndex: 3000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem' }}>
            <img
              src={design?.assets?.[0]?.url || ''}
              alt={design?.title || 'Design'}
              style={{ width: 76, height: 76, borderRadius: 12, objectFit: 'cover' }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/150'
              }}
            />
            <div style={{ flex: 1, color: '#ffffff' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {design?.title || 'Untitled'}
              </div>
              <div style={{ opacity: 0.85, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                ⭐ {avgRating ? avgRating.toFixed(1) : '0.0'} ({reviews.length})
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalMinimized(false)
                    setModalMaximized(true)
                  }}
                  style={{
                    borderRadius: 999,
                    padding: '0.35rem 0.75rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Maximize
                </button>
                <button
                  type="button"
                  onClick={closeDesignModal}
                  style={{
                    borderRadius: 999,
                    width: 34,
                    height: 34,
                    border: 'none',
                    background: 'rgba(255,255,255,0.12)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {designModalOpen && !modalMinimized && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={closeDesignModal}
        >
          <div
            style={{
              width: modalMaximized ? '95vw' : 'min(900px, 92vw)',
              height: modalMaximized ? '95vh' : 'auto',
              maxHeight: modalMaximized ? '95vh' : '90vh',
              overflow: 'auto',
              background: '#ffffff',
              borderRadius: 18,
              boxShadow: '0 30px 120px rgba(0,0,0,0.5)',
              border: '1px solid rgba(229,231,235,0.9)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.1rem',
                borderBottom: '1px solid rgba(229,231,235,0.9)',
                position: 'sticky',
                top: 0,
                background: '#fff',
                zIndex: 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#111827', fontSize: '1rem' }}>
                  {design?.title || 'Untitled'}
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  ⭐ {avgRating ? avgRating.toFixed(1) : '0.0'} ({reviews.length}) ·{' '}
                  {(design?.categories || []).join(', ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalMinimized(true)}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(209,213,219,0.9)',
                    background: '#fff',
                    cursor: 'pointer',
                    padding: '0.35rem 0.75rem',
                    fontWeight: 700,
                    color: '#374151',
                  }}
                >
                  Minimize
                </button>
                <button
                  type="button"
                  onClick={toggleMaximize}
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(209,213,219,0.9)',
                    background: '#fff',
                    cursor: 'pointer',
                    padding: '0.35rem 0.75rem',
                    fontWeight: 700,
                    color: '#374151',
                  }}
                >
                  {modalMaximized ? 'Restore' : 'Maximize'}
                </button>
                <button
                  type="button"
                  onClick={closeDesignModal}
                  style={{
                    borderRadius: 999,
                    width: 38,
                    height: 38,
                    border: 'none',
                    background: 'rgba(17,24,39,0.08)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    color: '#111827',
                    fontSize: '1rem',
                  }}
                  aria-label="Close design modal"
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: '1rem 1.1rem 1.3rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: modalMaximized ? '1fr 0.9fr' : '1fr',
                  gap: '1rem',
                }}
              >
                <div>
                  <img
                    src={design?.assets?.[0]?.url || ''}
                    alt={design?.title || 'Design'}
                    style={{
                      width: '100%',
                      height: modalMaximized ? 'min(60vh, 520px)' : 'auto',
                      objectFit: 'cover',
                      borderRadius: 14,
                      border: '1px solid rgba(229,231,235,0.9)',
                    }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/900'
                    }}
                  />
                </div>

                {showReviewsUI && (
                  <div>
                    <div className="design-reviews" style={{ marginTop: 0 }}>
                      <h5 style={{ marginTop: 0 }}>Reviews</h5>
                      {loadingReviews ? (
                        <div className="design-reviews-empty">Loading…</div>
                      ) : reviews.length ? (
                        reviews.map((review) => (
                          <div
                            key={review._id || `${review.user}-${review.createdAt}`}
                            className="review"
                          >
                            <div className="review-head">
                              <strong>{review.rating} / 5</strong>
                              {review.user?.name ? (
                                <span className="review-by">by {review.user.name}</span>
                              ) : null}
                            </div>
                            <p>{review.comment}</p>
                          </div>
                        ))
                      ) : (
                        <div className="design-reviews-empty">No reviews yet</div>
                      )}

                      {canReview ? (
                        <form onSubmit={handleReviewSubmit} className="design-review-form">
                          <label>
                            Rating
                            <select
                              value={newReview.rating}
                              onChange={(e) =>
                                setNewReview((r) => ({ ...r, rating: clampRating(e.target.value) }))
                              }
                            >
                              {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Comment
                            <textarea
                              value={newReview.comment}
                              onChange={(e) =>
                                setNewReview((r) => ({ ...r, comment: e.target.value }))
                              }
                              placeholder="Write your feedback…"
                              required
                            />
                          </label>
                          <button type="submit" disabled={postingReview}>
                            {postingReview ? 'Submitting…' : 'Submit Review'}
                          </button>
                        </form>
                      ) : user ? (
                        <div className="design-review-hint">
                          {user.role === 'designer'
                            ? 'Designers can view reviews on their designs.'
                            : null}
                        </div>
                      ) : (
                        <div className="design-review-hint">
                          Log in as a customer to write a review.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
