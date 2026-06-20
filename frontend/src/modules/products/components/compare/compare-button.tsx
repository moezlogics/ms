"use client"

import { useCompare, COMPARE_MAX, CompareItem } from "./context"

type Props = {
  product: {
    handle?: string | null
    title?: string | null
    thumbnail?: string | null
    /** Primary category — used to scope same-category comparisons. */
    categoryId?: string | null
    categoryName?: string | null
  }
  /**
   * Visual variant:
   *   - "pdp"  : Full-width pill button used in the PDP action stack.
   *   - "icon" : Compact circular icon used inside product cards.
   *   - "link" : Small pointed text link style.
   *   - "light-grey" : Compact light grey button right-aligned or inline.
   */
  variant?: "pdp" | "icon" | "link" | "light-grey"
  className?: string
}

/**
 * Toggle a product in/out of the compare list.
 *
 * When the list is full and the product isn't already in it the
 * button enters a disabled state with a tooltip explaining the
 * 4-product cap rather than silently failing.
 */
export default function CompareButton({
  product,
  variant = "pdp",
  className = "",
}: Props) {
  const { has, toggle, isFull } = useCompare()

  if (!product?.handle) return null

  const selected = has(product.handle)
  const disabled = !selected && isFull

  const item: CompareItem = {
    handle: product.handle,
    title: product.title || product.handle,
    thumbnail: product.thumbnail || null,
    categoryId: product.categoryId ?? null,
    categoryName: product.categoryName ?? null,
  }

  const onClick = (e: React.MouseEvent) => {
    // Prevent the product-card link from swallowing the click when
    // this button is nested inside a card.
    e.preventDefault()
    e.stopPropagation()
    toggle(item)
  }

  if (variant === "light-grey") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
          selected
            ? "bg-primary/15 text-primary border-primary/30"
            : "bg-primary text-primary-fg border-primary hover:brightness-110"
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <i
          className={`ph ${selected ? "ph-fill ph-check-square" : "ph-arrows-left-right"} text-[11px]`}
          aria-hidden
        />
        {selected
          ? "Added to Compare"
          : disabled
          ? `Full (${COMPARE_MAX})`
          : "Add to Compare"}
      </button>
    )
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
      >
        <i
          className={`ph ${selected ? "ph-fill ph-check-square" : "ph-scales"} text-[12px]`}
          aria-hidden
        />
        {selected
          ? "Added to Compare"
          : disabled
          ? `Compare list full (${COMPARE_MAX})`
          : "Add to Compare"}
      </button>
    )
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={
          selected
            ? "Remove from compare"
            : disabled
            ? `Compare list full (max ${COMPARE_MAX})`
            : "Add to compare"
        }
        aria-pressed={selected}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
          selected
            ? "bg-primary text-primary-fg border-primary"
            : "bg-bg text-ink/70 border-line hover:border-primary/40 hover:text-primary"
        } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      >
        <i
          className={`ph ${selected ? "ph-fill ph-check-square" : "ph-scales"} text-[14px]`}
          aria-hidden
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 ${
        selected
          ? "bg-primary/10 text-primary border border-primary/40"
          : "bg-bg text-ink border border-line hover:border-primary/40 hover:text-primary"
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <i
        className={`ph ${selected ? "ph-fill ph-check-square" : "ph-scales"} text-[15px]`}
        aria-hidden
      />
      {selected
        ? "Added to Compare"
        : disabled
        ? `Compare list full (${COMPARE_MAX})`
        : "Add to Compare"}
    </button>
  )
}
