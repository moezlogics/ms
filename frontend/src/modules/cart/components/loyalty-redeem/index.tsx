"use client"

import { useState, useTransition, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import {
  applyLoyaltyToCart,
  removeLoyaltyFromCart,
  getLoyaltyMax,
  type LoyaltyMax,
} from "@lib/data/loyalty"
import { useRouter } from "next/navigation"

/**
 * Loyalty redemption widget for the cart / checkout summary.
 *
 * UX states:
 *   • Logged-out         → "Sign in to redeem your points" CTA that
 *                          drops a `_medusa_return_to=/cart` cookie
 *                          so the OAuth + email auth flows bring the
 *                          user back here.
 *   • No balance         → muted explainer + "Earn points" link.
 *   • Has balance        → slider [1..max] + Apply button. Backend caps
 *                          `max` at min(balance, subtotal × 50 %) so
 *                          we mirror that here purely for the slider's
 *                          upper bound (backend enforces it again).
 *   • Already applied    → green confirmation + "Remove" button which
 *                          refunds the reserved points back to the
 *                          customer's balance.
 *
 * The numeric value the slider emits is the cash-equivalent discount
 * (e.g. 250 = "Rs 250 off"). Backend does the points-↔-amount math
 * (1 point = 1 major unit by default).
 */

type Props = {
  cart: HttpTypes.StoreCart & { promotions?: HttpTypes.StorePromotion[] }
  /** When null the user is anonymous — show the sign-in CTA. */
  loyaltyBalance: number | null
}

const LOYALTY_PROMO_CODE_PREFIX = "loyalty-"

function isLoyaltyApplied(
  cart: HttpTypes.StoreCart & { promotions?: HttpTypes.StorePromotion[] }
): boolean {
  return (cart.promotions || []).some((p) =>
    (p.code || "").toLowerCase().startsWith(LOYALTY_PROMO_CODE_PREFIX)
  )
}

/**
 * Pull the redeemed amount out of cart metadata so the "already applied"
 * panel can show e.g. "Rs 250 applied". Falls back to reading the
 * promotion's application_method.value if metadata isn't present (older
 * carts that pre-date the metadata change).
 */
function getAppliedAmount(
  cart: HttpTypes.StoreCart & { promotions?: HttpTypes.StorePromotion[] }
): number {
  const meta = (cart.metadata || {}) as Record<string, any>
  const fromMeta = Number(meta.loyalty_amount)
  if (Number.isFinite(fromMeta) && fromMeta > 0) return fromMeta

  const promo = (cart.promotions || []).find((p) =>
    (p.code || "").toLowerCase().startsWith(LOYALTY_PROMO_CODE_PREFIX)
  )
  return Number((promo as any)?.application_method?.value) || 0
}

export default function LoyaltyRedeem({ cart, loyaltyBalance }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<boolean>(isLoyaltyApplied(cart))
  const [appliedAmount, setAppliedAmount] = useState<number>(
    getAppliedAmount(cart)
  )

  // Backend-computed max for the slider. `null` while loading so the
  // initial render can show a skeleton instead of a 0-max slider.
  const [maxInfo, setMaxInfo] = useState<LoyaltyMax | null>(null)
  const [redeemAmount, setRedeemAmount] = useState<number>(0)

  // Re-sync local state if the parent cart changes (qty edit, address
  // update, etc.).
  useEffect(() => {
    setApplied(isLoyaltyApplied(cart))
    setAppliedAmount(getAppliedAmount(cart))
  }, [cart])

  // Fetch the server-side max whenever we have a balance and aren't
  // already applied. (Applied state hides the slider, so no fetch
  // needed.)
  useEffect(() => {
    if (applied) return
    if (loyaltyBalance === null || loyaltyBalance === 0) return

    let cancelled = false
    getLoyaltyMax(cart.id).then((res) => {
      if (cancelled) return
      if (res) {
        setMaxInfo(res)
        // Default to the full max — most users will want "all of it"
        // and can drag down if not. Matches the old one-tap behaviour.
        setRedeemAmount(res.max_amount)
      }
    })
    return () => {
      cancelled = true
    }
  }, [cart.id, loyaltyBalance, applied])

  const apply = (amount: number) => {
    setError(null)
    startTransition(async () => {
      const r = await applyLoyaltyToCart(cart.id, amount)
      if (!r || r.message || !r.cart) {
        setError(r?.message || "Could not apply your points.")
        return
      }
      setApplied(true)
      setAppliedAmount(amount)
      router.refresh()
    })
  }

  const remove = () => {
    setError(null)
    startTransition(async () => {
      const r = await removeLoyaltyFromCart(cart.id)
      if (!r || r.message) {
        setError(r?.message || "Could not remove your redemption.")
        return
      }
      setApplied(false)
      setAppliedAmount(0)
      router.refresh()
    })
  }

  const isCheckout =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/checkout")
  const returnTo = isCheckout ? "/checkout" : "/cart"

  const currency = (
    maxInfo?.currency_code ||
    cart.currency_code ||
    ""
  ).toUpperCase()

  // ── Logged-out state ──────────────────────────────────────────
  if (loyaltyBalance === null) {
    return (
      <div className="rounded-xl border border-line bg-surface/30 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <i className="ph-fill ph-coin text-amber-500 text-sm shrink-0" aria-hidden />
          <span className="text-xs text-ink/75 font-medium">Use loyalty points</span>
        </div>
        <LocalizedClientLink
          href={`/account?return_to=${returnTo}`}
          className="text-xs font-semibold text-primary hover:underline shrink-0"
        >
          Sign in
        </LocalizedClientLink>
      </div>
    )
  }

  // ── Zero balance state ────────────────────────────────────────
  if (!loyaltyBalance && !applied) {
    return (
      <div className="rounded-xl border border-line bg-surface/10 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <i className="ph ph-coin text-ink/40 text-sm shrink-0" aria-hidden />
          <span className="text-xs text-ink/50">No loyalty points available.</span>
        </div>
        <LocalizedClientLink
          href="/account/loyalty"
          className="text-xs font-medium text-ink/70 hover:text-ink shrink-0 underline"
        >
          Earn points
        </LocalizedClientLink>
      </div>
    )
  }

  // ── Applied state ─────────────────────────────────────────────
  if (applied) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              ✓
            </span>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-emerald-950 block">
                Loyalty applied
              </span>
              <span className="text-[10px] text-emerald-700 block truncate">
                {appliedAmount > 0
                  ? `${appliedAmount.toLocaleString()} ${currency} off — ${(appliedAmount * 2).toLocaleString()} points spent`
                  : "Points applied as discount"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50 uppercase tracking-wider shrink-0"
          >
            {pending ? "Removing…" : "Remove"}
          </button>
        </div>
        {error && (
          <p className="mt-1 text-[10px] text-rose-600 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  // ── Has balance, not applied yet — slider mode ────────────────
  const max = maxInfo?.max_amount ?? 0
  const loading = maxInfo === null
  const tooSmall = !loading && max <= 0

  if (tooSmall) {
    return (
      <div className="rounded-xl border border-amber-500/10 bg-amber-50/20 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <i className="ph ph-coin text-amber-500 text-sm shrink-0" aria-hidden />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-amber-950 block">
              {loyaltyBalance.toLocaleString()} points · worth {(loyaltyBalance * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
            </span>
            <span className="text-[10px] text-amber-700 block truncate">
              Cart too small to redeem — add a few more items to use your points
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <i className="ph-fill ph-coin text-amber-500 text-sm shrink-0 animate-pulse" aria-hidden />
          <div className="min-w-0">
            <span className="text-xs font-bold text-amber-950 block">
              {loyaltyBalance.toLocaleString()} points · worth {(loyaltyBalance * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
            </span>
            <span className="text-[10px] text-amber-700 block truncate">
              Redeem up to {max.toLocaleString()} {currency} ({Math.round((maxInfo?.ratio ?? 0.5) * 100)}% cart cap, 1 point = 0.5 {currency})
            </span>
          </div>
        </div>
      </div>

      {/* Slider + amount input */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={Math.max(1, Math.min(redeemAmount, max))}
          onChange={(e) => setRedeemAmount(Number(e.target.value))}
          disabled={loading || pending}
          aria-label="Loyalty points to redeem"
          className="flex-1 accent-amber-600 cursor-pointer"
        />
        <input
          type="number"
          min={1}
          max={max}
          value={Math.max(1, Math.min(redeemAmount, max))}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) {
              setRedeemAmount(Math.max(1, Math.min(Math.floor(n), max)))
            }
          }}
          disabled={loading || pending}
          aria-label="Loyalty points amount"
          className="w-16 h-7 px-2 text-xs font-bold text-amber-950 bg-white border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div className="flex items-center justify-between gap-3 mt-2">
        <span className="text-[10px] text-amber-700 font-medium">
          Save {redeemAmount.toLocaleString()} {currency} · spend {(redeemAmount * 2).toLocaleString()} points
        </span>
        <button
          type="button"
          onClick={() => apply(redeemAmount)}
          disabled={loading || pending || redeemAmount <= 0}
          className="shrink-0 h-8 px-4 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-60"
        >
          {pending ? "Applying…" : "Apply"}
        </button>
      </div>

      {error && (
        <p className="mt-1 text-[10px] text-rose-600 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
