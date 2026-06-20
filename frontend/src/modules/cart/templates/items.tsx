import { HttpTypes } from "@medusajs/types"
import Item from "@modules/cart/components/item"

type CartItem = HttpTypes.StoreCartLineItem

function groupItems(items: CartItem[]): Array<{
  kind: "bundle"; bundleId: string; items: CartItem[]
} | { kind: "single"; item: CartItem }> {
  const sorted = [...items].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )
  const groups: Array<{ kind: "bundle"; bundleId: string; items: CartItem[] } | { kind: "single"; item: CartItem }> = []
  const seenBundles = new Set<string>()

  for (const item of sorted) {
    const bundleId = ((item as any).metadata?.bundle_id as string | undefined) || null
    if (bundleId) {
      if (seenBundles.has(bundleId)) continue
      seenBundles.add(bundleId)
      const all = sorted.filter((i) => (i as any).metadata?.bundle_id === bundleId)
      groups.push({ kind: "bundle", bundleId, items: all })
    } else {
      groups.push({ kind: "single", item })
    }
  }
  return groups
}

export default function ItemsTemplate({ cart }: { cart?: HttpTypes.StoreCart }) {
  const items = cart?.items
  const grouped = items ? groupItems(items) : null

  return (
    <div className="flex flex-col gap-3">
      {/* List header — sits OUTSIDE the cards now so each card can be a
          self-contained surface (matches the mobile-app cart reference). */}
      <div className="flex items-center gap-2 px-1">
        <i className="ph-fill ph-shopping-bag text-primary text-sm" aria-hidden />
        <span className="text-sm font-semibold text-ink">Your Items</span>
        {items && (
          <span className="text-xs font-normal text-ink/50">
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        )}
      </div>

      {/* Items — stack of independent rounded cards with a small gap.
          Each card is rendered by `Item` (full mode). */}
      {grouped ? (
        grouped.map((g) =>
          g.kind === "bundle" ? (
            <BundleGroup
              key={`bundle-${g.bundleId}`}
              bundleId={g.bundleId}
              items={g.items}
              currencyCode={cart?.currency_code || ""}
            />
          ) : (
            <Item
              key={g.item.id}
              item={g.item}
              currencyCode={cart?.currency_code || ""}
            />
          )
        )
      ) : (
        /* Loading skeleton — three card-shaped placeholders. */
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg rounded-2xl border border-line p-4 flex gap-4 items-stretch animate-pulse"
          >
            <div className="w-20 h-20 rounded-xl bg-surface shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-surface rounded w-3/4" />
              <div className="h-2.5 bg-surface rounded w-1/2" />
              <div className="h-3 bg-surface rounded w-1/3 mt-4" />
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function BundleGroup({
  bundleId,
  items,
  currencyCode,
}: {
  bundleId: string
  items: CartItem[]
  currencyCode: string
}) {
  return (
    <div className="flex flex-col gap-2 p-2 rounded-2xl bg-primary/5 border border-primary/15">
      <div className="flex items-center gap-2 px-1.5 py-0.5">
        <i className="ph-fill ph-package text-primary text-[14px]" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
          Bundle · {items.length} items
        </span>
      </div>
      {items.map((item) => (
        <Item key={item.id} item={item} currencyCode={currencyCode} />
      ))}
    </div>
  )
}
