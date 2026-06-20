"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { useParams } from "next/navigation"
import type { Bundle, BundleItem } from "@lib/data/bundles"
import { addBundleToCart } from "@lib/data/cart"

/**
 * "Buy as bundle" card on the product detail page.
 *
 * For each item in the bundle the user picks a variant (auto-selected
 * to the first available). The combined price (sum of selected
 * variants × quantities) is shown vs. the no-bundle price so the saving
 * is obvious.
 *
 * On "Add bundle to cart" we POST `/store/carts/:id/line-item-bundles`
 * via the existing addBundleToCart server action.
 */
export default function BundleCard({ bundles }: { bundles: Bundle[] }) {
  if (!bundles || bundles.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {bundles.map((b) => (
        <BundleBlock key={b.id} bundle={b} />
      ))}
    </div>
  )
}

function pickDefaultVariant(item: BundleItem): string | null {
  const variants = item.product?.variants || []
  if (variants.length === 0) return null
  // Prefer a variant with a calculated price
  const priced = variants.find((v) => v.calculated_price?.calculated_amount)
  return (priced || variants[0]).id
}

function variantPrice(item: BundleItem, variantId: string | null) {
  if (!variantId) return null
  const v = item.product?.variants?.find((x) => x.id === variantId)
  return v?.calculated_price || null
}

function BundleBlock({ bundle }: { bundle: Bundle }) {
  const { countryCode } = useParams() as { countryCode: string }
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Selected variant per item — keyed by bundle_item.id
  const [selected, setSelected] = useState<Record<string, string | null>>(
    () => {
      const initial: Record<string, string | null> = {}
      for (const i of bundle.items || []) {
        initial[i.id] = pickDefaultVariant(i)
      }
      return initial
    }
  )

  const totals = useMemo(() => {
    let calculated = 0
    let original = 0
    let currency = "USD"
    for (const i of bundle.items || []) {
      const p = variantPrice(i, selected[i.id])
      if (p) {
        calculated += (p.calculated_amount || 0) * i.quantity
        original += (p.original_amount || p.calculated_amount || 0) * i.quantity
        currency = p.currency_code || currency
      }
    }
    return { calculated, original, currency }
  }, [bundle, selected])

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: (totals.currency || "USD").toUpperCase(),
      }),
    [totals.currency]
  )

  const savings = totals.original - totals.calculated
  const saveBadge =
    totals.original > 0 && savings > 0
      ? Math.round((savings / totals.original) * 100)
      : 0

  const onAdd = () => {
    setError(null)
    setSuccess(null)

    const items = (bundle.items || []).map((i) => ({
      item_id: i.id,
      variant_id: selected[i.id] || "",
    }))
    if (items.some((x) => !x.variant_id)) {
      setError("Pick a variant for every item in the bundle.")
      return
    }

    startTransition(async () => {
      try {
        await addBundleToCart({
          bundle_id: bundle.id,
          quantity: 1,
          items,
          countryCode,
        })
        setSuccess("Bundle added to your cart.")
      } catch (e: any) {
        setError(e?.message || "Couldn't add bundle to cart.")
      }
    })
  }

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line bg-bg/40">
        <div className="flex items-center gap-2">
          <i className="ph-fill ph-package text-primary text-[18px]" aria-hidden />
          <span className="text-sm font-semibold text-ink">{bundle.title}</span>
        </div>
        {saveBadge > 0 && (
          <span className="text-[11px] font-bold uppercase tracking-wide bg-danger text-white px-2 py-0.5 rounded">
            Save {saveBadge}%
          </span>
        )}
      </div>

      {/* Items */}
      <ul className="divide-y divide-line">
        {(bundle.items || []).map((item, idx) => (
          <BundleItemRow
            key={item.id}
            item={item}
            isLast={idx === bundle.items.length - 1}
            selectedVariantId={selected[item.id]}
            onSelectVariant={(vid) =>
              setSelected((s) => ({ ...s, [item.id]: vid }))
            }
          />
        ))}
      </ul>

      {/* Footer / CTA */}
      <div className="px-4 py-4 border-t border-line">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs text-ink/60">Bundle price</span>
          <div className="text-right">
            {savings > 0 && (
              <span className="text-xs line-through text-ink/45 mr-2">
                {formatter.format(totals.original)}
              </span>
            )}
            <span className="text-lg font-bold text-ink">
              {formatter.format(totals.calculated)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={pending}
          className="w-full h-11 rounded-lg bg-ink text-bg font-semibold text-sm hover:bg-primary hover:text-primary-fg transition-colors disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add bundle to cart"}
        </button>

        {error && (
          <p className="text-rose-500 text-xs mt-2 text-center">{error}</p>
        )}
        {success && (
          <p className="text-emerald-500 text-xs mt-2 text-center">{success}</p>
        )}
      </div>
    </div>
  )
}

function BundleItemRow({
  item,
  isLast,
  selectedVariantId,
  onSelectVariant,
}: {
  item: BundleItem
  isLast: boolean
  selectedVariantId: string | null
  onSelectVariant: (variantId: string) => void
}) {
  const variants = item.product?.variants || []
  const showVariantPicker = variants.length > 1

  return (
    <li className="flex gap-3 p-3">
      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-bg/40 border border-line">
        {item.product?.thumbnail ? (
          <Image
            src={item.product.thumbnail}
            alt={item.product.title}
            fill
            sizes="64px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/30">
            <i className="ph ph-image text-[20px]" aria-hidden />
          </div>
        )}
        <span className="absolute -top-1.5 -right-1.5 bg-ink text-bg text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {item.quantity}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink line-clamp-1">
          {item.product?.title || "Bundle item"}
        </p>
        {showVariantPicker ? (
          <select
            value={selectedVariantId || ""}
            onChange={(e) => onSelectVariant(e.target.value)}
            className="mt-1.5 text-xs h-8 px-2 pr-6 rounded-md border border-line bg-bg text-ink/80 max-w-full truncate"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        ) : variants.length === 1 ? (
          <p className="text-xs text-ink/50 mt-0.5">{variants[0].title}</p>
        ) : null}
      </div>
    </li>
  )
}
