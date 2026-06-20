"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ProductReview,
  ReviewStats,
  fetchProductReviews,
  fetchProductReviewStats,
  submitProductReview,
} from "@lib/data/reviews"
import { retrieveCustomer } from "@lib/data/customer"
import { getGuestId } from "@lib/util/guest"
import { HttpTypes } from "@medusajs/types"
import Avatar, {
  getAvatarPropsFromCustomer,
} from "@modules/common/components/avatar"

import Lightbox from "yet-another-react-lightbox"
import Counter from "yet-another-react-lightbox/plugins/counter"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/counter.css"

const RATING_LABELS = ["", "Poor", "Below Average", "Average", "Good", "Excellent"]
const MAX_REVIEW_PHOTOS = 5
const MAX_REVIEW_PHOTO_BYTES = 10 * 1024 * 1024

function extractInitials(firstName?: string, lastName?: string, guestName?: string) {
  if (firstName || lastName) {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase()
  }
  if (guestName) return guestName.charAt(0).toUpperCase()
  return "?"
}

type ReviewPhotoDraft = {
  key: string
  file: File
  preview: string
}

function ReviewModal({
  productId,
  productTitle,
  isOpen,
  onClose,
  customer,
  onSubmitted,
}: {
  productId: string
  productTitle: string
  isOpen: boolean
  onClose: () => void
  customer: HttpTypes.StoreCustomer | null
  onSubmitted?: () => void
}) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [photoDrafts, setPhotoDrafts] = useState<ReviewPhotoDraft[]>([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const clearPhotoDrafts = () => {
    setPhotoDrafts((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.preview))
      return []
    })
  }

  const handleClose = () => {
    clearPhotoDrafts()
    onClose()
  }

  if (!isOpen) return null

  const uploadReviewPhotos = async () => {
    const uploadedUrls: string[] = []

    for (const draft of photoDrafts) {
      const formData = new FormData()
      formData.append("image", draft.file)
      formData.append("productId", productId)

      const res = await fetch(`/api/reviews/upload`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload one of the review photos.")
      }

      const url = data?.data?.url || data?.url
      if (url) uploadedUrls.push(url)
    }

    return uploadedUrls
  }

  const handlePhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    if (!customer) {
      setError("Only logged-in verified customers can upload review photos.")
      event.target.value = ""
      return
    }

    const remainingSlots = MAX_REVIEW_PHOTOS - photoDrafts.length
    if (remainingSlots <= 0) {
      setError(`You can upload up to ${MAX_REVIEW_PHOTOS} photos.`)
      event.target.value = ""
      return
    }

    const nextDrafts: ReviewPhotoDraft[] = []
    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.")
        continue
      }
      if (file.size > MAX_REVIEW_PHOTO_BYTES) {
        setError("Each image must be under 10MB.")
        continue
      }
      nextDrafts.push({
        key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
      })
    }

    if (nextDrafts.length > 0) {
      setError("")
      setPhotoDrafts((current) => [...current, ...nextDrafts].slice(0, MAX_REVIEW_PHOTOS))
    }

    event.target.value = ""
  }

  const removePhotoDraft = (key: string) => {
    setPhotoDrafts((current) => {
      const draft = current.find((item) => item.key === key)
      if (draft) URL.revokeObjectURL(draft.preview)
      return current.filter((item) => item.key !== key)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!customer) {
      if (!guestName.trim()) return setError("Please enter your name.")
      if (!guestEmail.trim()) return setError("Please enter a valid email address.")
    }

    if (rating === 0) return setError("Please select an overall rating.")
    if (content.trim().length < 10) return setError("Review must be at least 10 characters long.")

    setLoading(true)
    try {
      const uploadedPhotos = customer ? await uploadReviewPhotos() : []

      await submitProductReview(productId, {
        rating,
        content: content.trim(),
        photos: uploadedPhotos,
        ...(!customer && { 
          guest_name: guestName, 
          guest_email: guestEmail,
          guest_id: getGuestId()
        }),
      })

      setSuccess(true)
      clearPhotoDrafts()
      setTimeout(() => {
        handleClose()
        onSubmitted?.()
      }, 2000)
    } catch (submitError: any) {
      setError(submitError?.message || "Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm" onClick={handleClose}>
        <div className="bg-bg rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line sticky top-0 bg-bg rounded-t-2xl z-10">
            <div>
              <h2 className="text-base font-semibold text-ink">Write a Review</h2>
              <p className="text-[11px] text-ink/50 truncate max-w-[250px]">{productTitle}</p>
            </div>
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-surface rounded-full transition">
              <i className="ph-bold ph-x text-sm text-ink/60" aria-hidden />
            </button>
          </div>

          {success ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                <i className="ph-fill ph-check-circle text-3xl" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-ink">Thank You!</h3>
              <p className="text-xs text-ink/50">Your review has been submitted and will be visible shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger px-3 py-2 rounded-lg text-xs">
                  {error}
                </div>
              )}

              {/* Rating stars */}
              <div className="bg-surface rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-ink/60">Overall Rating *</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)} className="p-0.5 transition-transform hover:scale-110">
                      <i className={`ph-fill ph-star text-lg transition ${star <= rating ? "text-warning" : "text-ink/15 hover:text-warning/40"}`} aria-hidden />
                    </button>
                  ))}
                  <span className="text-[10px] text-ink/40 w-16 text-right">{RATING_LABELS[rating] || ""}</span>
                </div>
              </div>

              {/* Review text */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-ink/60">Your Experience</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  placeholder="Tell other shoppers about your experience..."
                  maxLength={2000}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition bg-bg"
                />
                <p className="text-[10px] text-ink/30 text-right">{content.length}/2000</p>
              </div>

              {/* Guest fields */}
              {!customer && (
                <div className="space-y-2.5 bg-primary/5 p-3 rounded-lg border border-primary/15">
                  <p className="text-[11px] font-bold text-primary">Reviewing as a Guest</p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-ink/60">Your Name *</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none bg-bg"
                      placeholder="e.g. Ali Khan"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-ink/60">Your Email *</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 outline-none bg-bg"
                      placeholder="ali@example.com"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Photo upload - only for logged-in users */}
              {customer && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-ink/60 flex items-center gap-1">
                    <i className="ph ph-camera text-xs" aria-hidden /> Add Photos (Optional, max 5)
                  </label>
                  {photoDrafts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {photoDrafts.map((draft) => (
                        <div key={draft.key} className="relative group rounded-lg border border-line overflow-hidden w-16 h-16 bg-surface flex-shrink-0">
                          <img src={draft.preview} className="w-full h-full object-cover" alt="" />
                          <button
                            type="button"
                            onClick={() => removePhotoDraft(draft.key)}
                            className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-danger/90 text-bg backdrop-blur shadow-sm hover:bg-danger transition"
                          >
                            <i className="ph-bold ph-x text-[8px]" aria-hidden />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {photoDrafts.length < MAX_REVIEW_PHOTOS && (
                    <label className="flex flex-col items-center justify-center w-full h-16 rounded-lg border-2 border-dashed border-line bg-surface cursor-pointer hover:bg-surface/80 transition group">
                      <div className="flex flex-col items-center gap-0.5 text-ink/35 group-hover:text-ink/55">
                        <i className="ph ph-image text-lg" aria-hidden />
                        <span className="text-[10px] font-medium">Upload Images</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoSelection}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || rating === 0}
                className="w-full bg-primary text-primary-fg py-2.5 rounded-full font-semibold text-sm hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
                ) : (
                  <i className="ph-bold ph-paper-plane-tilt text-sm" aria-hidden />
                )}
                {loading ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

export default function ProductReviews({ productId, productTitle }: { productId: string; productTitle?: string }) {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer | null>(null)
  
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([])

  const loadData = async () => {
    setLoading(true)
    const [r, s, c] = await Promise.all([
      fetchProductReviews(productId),
      fetchProductReviewStats(productId),
      retrieveCustomer()
    ])
    setReviews(r)
    setStats(s)
    setCustomer(c)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [productId])

  const openReviewLightbox = (photos: string[], index: number) => {
    setLightboxSlides(photos.map((photo) => ({ src: photo })))
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const avg = stats?.averageRating ?? 0
  const total = stats?.reviewCount ?? reviews.length

  return (
    <section className="flex flex-col gap-5 w-full">
      {/* Summary + Write review */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface rounded-xl p-4 border border-line">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-ink leading-none">
            {avg.toFixed(1)}
          </div>
          <div className="flex flex-col">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(star => (
                <i key={star} className={`ph-fill ph-star text-sm ${star <= Math.round(avg) ? 'text-warning' : 'text-ink/15'}`} aria-hidden />
              ))}
            </div>
            <span className="text-[11px] text-ink/50 mt-0.5">
              Based on {total} review{total === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => setShowReviewModal(true)}
          className="px-4 py-2 bg-primary text-primary-fg rounded-full font-semibold text-xs hover:brightness-110 transition flex items-center gap-1.5 shadow-sm"
        >
          <i className="ph-fill ph-star text-[10px]" aria-hidden /> Write Review
        </button>
      </div>

      {/* Review list */}
      {loading ? (
        <div className="text-xs text-ink/40 text-center py-8">
          <i className="ph-bold ph-spinner animate-spin text-lg block mx-auto mb-2" aria-hidden />
          Loading reviews…
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface/50 px-5 py-8 text-center">
          <i className="ph ph-star text-3xl text-ink/20 block mx-auto mb-2" aria-hidden />
          <p className="text-xs font-medium text-ink/40">No reviews yet. Be the first to leave one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-line bg-bg p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    size={32}
                    {...(review.customer
                      ? getAvatarPropsFromCustomer(review.customer as any)
                      : { name: review.guest_name || "Guest" })}
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-ink">
                        {review.customer?.first_name
                          ? `${review.customer.first_name} ${review.customer.last_name || ""}`
                          : (review.guest_name || "Guest")}
                      </p>
                      {review.is_verified && (
                        <span className="flex items-center justify-center rounded-full bg-primary/10 h-4 w-4" title="Verified Customer">
                          <i className="ph-fill ph-seal-check text-[10px] text-primary" aria-hidden />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink/35">
                      {new Date(review.created_at).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(star => (
                    <i key={star} className={`ph-fill ph-star text-xs ${star <= review.rating ? 'text-warning' : 'text-ink/15'}`} aria-hidden />
                  ))}
                </div>
              </div>

              <p className="text-sm text-ink/75 leading-relaxed mt-2.5 whitespace-pre-line">
                {review.content}
              </p>

              {/* Review photos with lightbox */}
              {review.photos && review.photos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {review.photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => openReviewLightbox(review.photos, i)}
                      className="group relative overflow-hidden rounded-lg border border-line w-14 h-14 bg-surface"
                    >
                      <img src={photo} className="w-full h-full object-cover transition duration-200 group-hover:scale-110" alt="" />
                      <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/10 transition" />
                    </button>
                  ))}
                </div>
              )}

              {/* Store owner reply */}
              {review.owner_reply && (
                <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    Store Reply
                  </p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-ink/70">
                    {review.owner_reply}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ReviewModal 
        productId={productId} 
        productTitle={productTitle || "this product"} 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        customer={customer}
        onSubmitted={() => {
          loadData() // Refresh logic
        }}
      />

      <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
          plugins={[Counter, Zoom]}
          carousel={{ finite: lightboxSlides.length <= 1 }}
      />
    </section>
  )
}
