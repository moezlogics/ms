"use client"

import React from "react"

type StarRatingProps = {
  rating: number
  size?: number // px font-size for the Phosphor icon
  readonly?: boolean
  onChange?: (rating: number) => void
  className?: string
}

/**
 * Anvogue-style star rating. Uses Phosphor's `ph-star` (filled) for active
 * stars and `ph-star` (regular) for empty ones so the template's icon system
 * stays consistent across nav, cards, and reviews.
 */
export default function StarRating({
  rating,
  size = 16,
  readonly = true,
  onChange,
  className = "",
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className={`flex items-center gap-0.5 ${className}`} role={readonly ? "img" : "radiogroup"} aria-label={`${rating} out of 5 stars`}>
      {stars.map((star) => {
        const active = star <= rating
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"} focus:outline-none leading-none`}
            style={{ fontSize: size }}
          >
            <i
              className={`${active ? "ph-fill ph-star text-brand-yellow" : "ph ph-star text-brand-secondary2"}`}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}
