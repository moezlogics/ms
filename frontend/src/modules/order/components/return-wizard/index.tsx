"use client"

import { useEffect, useState } from "react"
import { listReturnReasons, createStoreReturn, createStoreExchange, createStoreClaim } from "@lib/data/post-purchase"

type ItemSelection = {
  id: string
  quantity: number
  reason_id: string
  note: string
}

type Props = {
  order: any
}

export default function ReturnWizard({ order }: Props) {
  const [reasons, setReasons] = useState<any[]>([])
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({})
  const [itemDetails, setItemDetails] = useState<Record<string, ItemSelection>>({})
  const [actionType, setActionType] = useState<"return" | "exchange" | "claim">("return")
  const [claimType, setClaimType] = useState<"refund" | "replace">("replace")
  const [exchangeDetails, setExchangeDetails] = useState("")

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    listReturnReasons().then((res) => {
      setReasons(res)
      // Initialize items details
      const initial: Record<string, ItemSelection> = {}
      order.items?.forEach((item: any) => {
        initial[item.id] = {
          id: item.id,
          quantity: item.quantity,
          reason_id: res[0]?.id || "changed_mind",
          note: "",
        }
      })
      setItemDetails(initial)
    })
  }, [order])

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  const updateItemQty = (itemId: string, qty: number, max: number) => {
    const safeQty = Math.max(1, Math.min(qty, max))
    setItemDetails((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: safeQty },
    }))
  }

  const updateItemReason = (itemId: string, reasonId: string) => {
    setItemDetails((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], reason_id: reasonId },
    }))
  }

  const updateItemNote = (itemId: string, note: string) => {
    setItemDetails((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], note },
    }))
  }

  const isNextDisabled = () => {
    if (step === 1) {
      return !Object.values(selectedItems).some((v) => v === true)
    }
    return false
  }

  const handleSubmit = async () => {
    setError("")
    setSubmitting(true)

    // Build the formatted payload
    const itemsPayload = Object.keys(selectedItems)
      .filter((id) => selectedItems[id])
      .map((id) => {
        const details = itemDetails[id]
        return {
          id: details.id,
          quantity: details.quantity,
          reason_id: details.reason_id,
          note: details.note,
        }
      })

    try {
      if (actionType === "return") {
        await createStoreReturn(order.id, itemsPayload)
      } else if (actionType === "exchange") {
        // Exchange payload supports additional items if needed, we pass exchange details in metadata/notes
        const returnShipping = { option_id: "", price: 0 } // empty fallback
        await createStoreExchange(order.id, itemsPayload, returnShipping, [
          {
            description: `Exchange request details: ${exchangeDetails}`,
          } as any,
        ])
      } else if (actionType === "claim") {
        await createStoreClaim(order.id, claimType, itemsPayload)
      }

      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Something went wrong while submitting your request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-surface border border-line/45 rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-sm animate-enter">
        <div className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
          <i className="ph-fill ph-check-circle text-3xl" />
        </div>
        <h2 className="text-xl font-extrabold text-ink">Request Submitted!</h2>
        <p className="text-xs text-ink/50 leading-relaxed">
          Your post-purchase request has been logged successfully. Our support team will review it and get in touch with you shortly.
        </p>
        <LocalizedClientLink
          href="/account"
          className="inline-block px-5 py-2.5 rounded-full bg-primary text-primary-fg text-xs font-semibold hover:brightness-110 transition"
        >
          Go to Dashboard
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-line/45 rounded-3xl p-5 md:p-8 max-w-2xl mx-auto shadow-sm space-y-6 animate-enter">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Return & Exchange Center</h1>
          <p className="text-[10px] text-ink/40">Request a refund, swap items, or report damaged products.</p>
        </div>
        <div className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full shrink-0">
          STEP {step} OF 3
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Step 1: Select Items */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-bold text-ink text-sm">Select Items to Return</h3>
          <div className="space-y-3">
            {order.items?.map((item: any) => {
              const isSelected = !!selectedItems[item.id]
              const details = itemDetails[item.id] || { quantity: 1 }

              return (
                <div
                  key={item.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border rounded-2xl p-4 transition-all ${isSelected ? "border-primary/40 bg-primary/5" : "border-line/60 bg-bg/40"}`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id)}
                      className="mt-1 accent-primary rounded cursor-pointer"
                    />
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover border border-line/50 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{item.title}</p>
                      <p className="text-[10px] text-ink/40">Purchased Qty: {item.quantity}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-semibold text-ink/60">Return Qty:</span>
                      <div className="flex items-center border border-line rounded-lg overflow-hidden bg-bg">
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.id, details.quantity - 1, item.quantity)}
                          className="px-2.5 py-1 text-ink/60 hover:bg-surface font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="px-3 text-xs font-bold text-ink">{details.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.id, details.quantity + 1, item.quantity)}
                          className="px-2.5 py-1 text-ink/60 hover:bg-surface font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Choose Action Type */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="font-bold text-ink text-sm">Select Your Preferred Solution</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Return/Refund */}
            <button
              type="button"
              onClick={() => setActionType("return")}
              className={`flex flex-col items-center text-center p-5 rounded-2xl border transition-all ${actionType === "return" ? "border-primary bg-primary/5 text-primary" : "border-line/60 bg-bg/30 text-ink/75"}`}
            >
              <i className="ph-fill ph-arrow-counter-clockwise text-2xl mb-2" />
              <span className="text-xs font-bold">Request Refund</span>
              <span className="text-[9px] text-ink/40 mt-1">Send back items and get cash back.</span>
            </button>

            {/* Exchange */}
            <button
              type="button"
              onClick={() => setActionType("exchange")}
              className={`flex flex-col items-center text-center p-5 rounded-2xl border transition-all ${actionType === "exchange" ? "border-primary bg-primary/5 text-primary" : "border-line/60 bg-bg/30 text-ink/75"}`}
            >
              <i className="ph-fill ph-arrows-left-right text-2xl mb-2" />
              <span className="text-xs font-bold">Exchange Variant</span>
              <span className="text-[9px] text-ink/40 mt-1">Swap items for a different size/color.</span>
            </button>

            {/* Claim */}
            <button
              type="button"
              onClick={() => setActionType("claim")}
              className={`flex flex-col items-center text-center p-5 rounded-2xl border transition-all ${actionType === "claim" ? "border-primary bg-primary/5 text-primary" : "border-line/60 bg-bg/30 text-ink/75"}`}
            >
              <i className="ph-fill ph-shield-warning text-2xl mb-2" />
              <span className="text-xs font-bold">Report Issue / Claim</span>
              <span className="text-[9px] text-ink/40 mt-1">Received a broken, damaged, or wrong item.</span>
            </button>
          </div>

          {/* Conditional Exchange Inputs */}
          {actionType === "exchange" && (
            <div className="space-y-1.5 animate-enter">
              <label className="text-[10px] font-bold text-ink/65 uppercase tracking-wide">Swap Details</label>
              <textarea
                value={exchangeDetails}
                onChange={(e) => setExchangeDetails(e.target.value)}
                placeholder="Describe the product variant or size you wish to swap to (e.g. swap Large for Medium size)..."
                rows={3}
                className="w-full text-xs p-3 bg-bg border border-line rounded-xl outline-none focus:border-primary/50 transition resize-none"
              />
            </div>
          )}

          {/* Conditional Claim Inputs */}
          {actionType === "claim" && (
            <div className="space-y-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl animate-enter">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Claim Preference</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="claimType"
                    checked={claimType === "replace"}
                    onChange={() => setClaimType("replace")}
                    className="accent-primary"
                  />
                  Send Replacement (Free)
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="claimType"
                    checked={claimType === "refund"}
                    onChange={() => setClaimType("refund")}
                    className="accent-primary"
                  />
                  Full Refund
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Reasons & Notes */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-bold text-ink text-sm">Tell Us Why</h3>
          
          <div className="space-y-4">
            {Object.keys(selectedItems)
              .filter((id) => selectedItems[id])
              .map((id) => {
                const item = order.items?.find((it: any) => it.id === id)
                const details = itemDetails[id]

                return (
                  <div key={id} className="border border-line/50 rounded-2xl p-4 bg-bg/30 space-y-3">
                    <div className="flex items-center gap-2">
                      {item?.thumbnail && (
                        <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      )}
                      <span className="text-xs font-bold text-ink">{item?.title}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-ink/50">Return Reason</label>
                        <select
                          value={details.reason_id}
                          onChange={(e) => updateItemReason(id, e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-bg border border-line rounded-lg outline-none focus:border-primary/50 cursor-pointer"
                        >
                          {reasons.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label || r.value}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-ink/50">Notes / Details</label>
                        <input
                          type="text"
                          value={details.note}
                          onChange={(e) => updateItemNote(id, e.target.value)}
                          placeholder="Tell us more (optional)"
                          className="w-full text-xs px-3 py-2 bg-bg border border-line rounded-lg outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-line pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 border border-line hover:bg-surface rounded-full text-xs font-bold transition"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          disabled={isNextDisabled() || submitting}
          onClick={() => {
            if (step < 3) {
              setStep((s) => s + 1)
            } else {
              handleSubmit()
            }
          }}
          className="px-5 py-2.5 rounded-full bg-primary text-primary-fg text-xs font-bold hover:brightness-110 disabled:opacity-50 transition flex items-center gap-1.5"
        >
          {submitting && <i className="ph-bold ph-spinner animate-spin text-sm" />}
          {step < 3 ? "Next Step" : submitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </div>
  )
}
