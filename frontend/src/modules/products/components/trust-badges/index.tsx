"use client"

import { useMemo, useState } from "react"

/**
 * PDP trust-badge strip — admin-selectable per product.
 *
 * The catalogue below is the master list of badges the storefront
 * supports. Admins choose which ones to show on a given product by
 * writing the badge `id`s into `product.metadata.trust_badges`:
 *
 *   metadata.trust_badges = ["authentic", "warranty_1y", "easy_returns"]
 *
 * Accepted formats:
 *   - JSON array of strings: ["authentic", "warranty_1y"]
 *   - Comma-separated string:  "authentic, warranty_1y, easy_returns"
 *
 * Each badge is CLICKABLE on the PDP and opens a modal with the full
 * policy. The compact variant (used in product cards) renders the
 * same set as a tight icon row without modals — those cards link
 * away on click, so opening a modal there would feel awkward.
 *
 * When `metadata.trust_badges` is missing the component falls back
 * to a sensible default (authentic + free delivery + returns +
 * secure payments) so existing products keep their current look
 * without any admin migration.
 */
type Badge = {
  /** Stable id stored in `metadata.trust_badges`. Never change once shipped. */
  id: string
  icon: string
  title: string
  sub: string
  detail: string
}

const BADGE_CATALOG: Badge[] = [
  {
    id: "authentic",
    icon: "ph-shield-check",
    title: "100% Authentic",
    sub: "Original products only",
    detail:
      "Every product sold on our store is 100% authentic and sourced directly from the brand or authorized distributors. We never sell replicas, copies, or counterfeit goods. If you ever receive a product that you believe is not genuine, contact us within 7 days for a full refund — no questions asked.",
  },
  {
    id: "official_dealer",
    icon: "ph-certificate",
    title: "Authorised Dealer",
    sub: "Direct from the brand",
    detail:
      "We are an authorised dealer for this brand, sourcing every unit directly from the official distributor. Your purchase qualifies for the manufacturer's full warranty and after-sales support, exactly as if you bought from a brand-owned outlet.",
  },
  {
    id: "free_delivery",
    icon: "ph-truck",
    title: "Free Delivery over Rs. 3000",
    sub: "Nationwide shipping",
    detail:
      "Enjoy free standard delivery on all orders above Rs. 3,000. Orders below this threshold are charged a flat delivery fee shown at checkout. We ship nationwide through trusted courier partners (TCS, Leopards, M&P) and most orders are delivered within 3-5 business days.",
  },
  {
    id: "free_shipping",
    icon: "ph-package",
    title: "Free Shipping",
    sub: "On this product",
    detail:
      "This item ships free anywhere in the country — no minimum order required. Standard delivery takes 3-5 business days through our trusted courier partners.",
  },
  {
    id: "easy_returns",
    icon: "ph-arrow-u-up-left",
    title: "7-day Easy Returns",
    sub: "Hassle-free exchanges",
    detail:
      "Not satisfied? Return or exchange any unused item within 7 days of delivery. Simply go to your Account → Orders → select the item → choose Return or Exchange. We'll arrange a free pickup. Refunds are processed within 3-5 business days after we receive and inspect the returned item.",
  },
  {
    id: "secure_payments",
    icon: "ph-lock-key",
    title: "Secure Payments",
    sub: "SSL encrypted checkout",
    detail:
      "Your payment information is protected with industry-standard 256-bit SSL encryption. We never store your full card details on our servers. All transactions are processed through PCI-DSS Level 1 compliant payment gateways. Shop with confidence knowing your data is safe.",
  },
  {
    id: "cod",
    icon: "ph-hand-coins",
    title: "Cash on Delivery",
    sub: "Pay when you receive",
    detail:
      "Prefer to pay in cash? Choose Cash on Delivery at checkout and settle the bill when your order arrives at the door. Available nationwide on most products.",
  },
  {
    id: "warranty_6m",
    icon: "ph-shield-star",
    title: "6 Months Warranty",
    sub: "Manufacturer warranty",
    detail:
      "Covered by 6 months of official manufacturer warranty against any production defects. Bring or ship the product to any authorised service centre with your invoice for free repair or replacement during the warranty period.",
  },
  {
    id: "warranty_1y",
    icon: "ph-shield-star",
    title: "1 Year Warranty",
    sub: "Manufacturer warranty",
    detail:
      "Backed by a full 1-year manufacturer warranty covering production defects, internal hardware failure, and battery degradation beyond normal wear. Visit any authorised service centre with your invoice for free repairs or replacement during the warranty period.",
  },
  {
    id: "warranty_2y",
    icon: "ph-shield-star",
    title: "2 Year Warranty",
    sub: "Extended manufacturer cover",
    detail:
      "Comes with 2 years of full manufacturer warranty — twice the standard cover. Free service and parts replacement at any authorised centre against any defect arising from regular use.",
  },
  {
    id: "fast_shipping",
    icon: "ph-rocket-launch",
    title: "Fast Shipping",
    sub: "Dispatched in 24h",
    detail:
      "We dispatch this product within 24 hours of order confirmation. Most metro orders arrive in 1-2 business days; intercity orders in 3-5 days. Track your shipment live from your account once it leaves our warehouse.",
  },
  {
    id: "installation",
    icon: "ph-wrench",
    title: "Free Installation",
    sub: "Included with delivery",
    detail:
      "Free professional installation included with delivery. Our certified technician will install, test, and demo the product at your home — no setup hassle.",
  },
  {
    id: "genuine",
    icon: "ph-seal-check",
    title: "Genuine Product",
    sub: "Verified authenticity",
    detail:
      "Every unit is verified for authenticity before dispatch. Original packaging, original accessories, original serial number traceable on the brand's official portal.",
  },
]

const DEFAULT_BADGE_IDS = ["authentic", "free_delivery", "easy_returns", "secure_payments"]

/** Parse `metadata.trust_badges` from either a JSON array or a CSV string. */
function parseSelectedIds(raw: any): string[] | null {
  if (raw === null || raw === undefined) return null
  if (Array.isArray(raw)) {
    const ids = raw.map((s) => String(s).trim()).filter(Boolean)
    return ids.length ? ids : null
  }
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t) return null
    if (t.startsWith("[")) {
      try {
        const arr = JSON.parse(t)
        if (Array.isArray(arr)) return parseSelectedIds(arr)
      } catch {}
    }
    const ids = t
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return ids.length ? ids : null
  }
  return null
}

type TrustBadgesProps = {
  /**
   * Raw `product.metadata.trust_badges` value — array of badge ids
   * or a comma-separated string. When missing, the default set is
   * rendered so existing (non-electronics) products are unaffected.
   */
  selected?: any
  /**
   * Compact mode for product cards / grid tiles: icons only, no
   * modals, single horizontal row. Defaults to false (PDP layout).
   */
  compact?: boolean
}

export default function TrustBadges({ selected, compact = false }: TrustBadgesProps) {
  const [openBadge, setOpenBadge] = useState<Badge | null>(null)

  // Resolve which badges to render. Unknown ids in the metadata are
  // silently dropped — admins might typo, we don't want to crash.
  const badges = useMemo<Badge[]>(() => {
    const ids = parseSelectedIds(selected) ?? DEFAULT_BADGE_IDS
    const byId = new Map(BADGE_CATALOG.map((b) => [b.id, b]))
    const out: Badge[] = []
    for (const id of ids) {
      const b = byId.get(id)
      if (b) out.push(b)
    }
    return out
  }, [selected])

  if (!badges.length) return null

  // ── Compact mode ──────────────────────────────────────────────
  // Used inside product cards. No modal interaction; the whole card
  // is already a link.
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {badges.slice(0, 4).map((b) => (
          <span
            key={b.id}
            title={b.title}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface text-ink/70"
          >
            <i className={`ph ${b.icon} text-[11px]`} aria-hidden />
          </span>
        ))}
      </div>
    )
  }

  // ── PDP grid mode ────────────────────────────────────────────
  // 2-column on mobile, scales nicely on desktop. Each tile is a
  // button opening a policy modal.
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {badges.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setOpenBadge(b)}
            className="flex items-center gap-2.5 text-left p-3 rounded-xl bg-bg border border-line/60 group cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm active:scale-[0.99]"
          >
            <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-surface text-ink group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <i className={`ph ${b.icon} text-[16px]`} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-ink leading-tight">
                {b.title}
              </div>
              <div className="text-[10px] text-ink/50 mt-0.5 truncate leading-none">
                {b.sub}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Policy Detail Modal */}
      {openBadge && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setOpenBadge(null)}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
            aria-hidden
          />
          {/* Panel */}
          <div
            className="relative bg-bg rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.3)] w-full max-w-md overflow-hidden animate-[slideUp_300ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-5 pb-4 border-b border-line">
              <span className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 text-primary">
                <i
                  className={`ph-fill ${openBadge.icon} text-[20px]`}
                  aria-hidden
                />
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink">
                  {openBadge.title}
                </h3>
                <p className="text-[12px] text-ink/55">{openBadge.sub}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenBadge(null)}
                className="ml-auto w-8 h-8 rounded-full bg-surface hover:bg-ink hover:text-bg flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <i className="ph ph-x text-[14px]" aria-hidden />
              </button>
            </div>
            {/* Body */}
            <div className="p-5">
              <p className="text-sm text-ink/80 leading-relaxed">
                {openBadge.detail}
              </p>
            </div>
            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => setOpenBadge(null)}
                className="w-full h-11 rounded-full bg-primary text-primary-fg text-sm font-semibold hover:brightness-110 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
