"use client"

import React, { useState } from "react"
import { addToCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"

type FBTClientProps = {
  products: HttpTypes.StoreProduct[]
  countryCode: string
  /** Pre-rendered <ProductPreview> cards — one per product, in order. */
  children: React.ReactNode
}

/**
 * Client-side wrapper for the Frequently Bought Together grid.
 *
 * Receives server-rendered ProductPreview cards as `children` so the
 * visual style is identical to every other product grid on the site.
 * Adds a checkbox overlay and an "Add Selected to Cart" CTA bar.
 */
export default function FBTClient({
  products,
  countryCode,
  children,
}: FBTClientProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(products.map((p) => p.id!))
  )
  const [isAdding, setIsAdding] = useState(false)
  const [done, setDone] = useState(false)

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddAll = async () => {
    setIsAdding(true)
    try {
      for (const product of products) {
        if (!selected.has(product.id!)) continue
        const variant = product.variants?.[0]
        if (variant?.id) {
          await addToCart({
            variantId: variant.id,
            quantity: 1,
            countryCode,
          })
        }
      }
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      console.error("FBT add failed:", e)
    } finally {
      setIsAdding(false)
    }
  }

  const selectedCount = products.filter((p) => selected.has(p.id!)).length
  const childArray = React.Children.toArray(children)

  return (
    <div>
      {/* Products grid — reuses the site's product card variant */}
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-8">
        {products.map((product, idx) => {
          const isChecked = selected.has(product.id!)
          return (
            <li key={product.id} className="relative">
              {/* Checkbox overlay */}
              <button
                type="button"
                aria-label={
                  isChecked
                    ? `Deselect ${product.title}`
                    : `Select ${product.title}`
                }
                className="absolute top-2 left-2 z-10"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleProduct(product.id!)
                }}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isChecked
                      ? "bg-primary border-primary text-primary-fg"
                      : "bg-bg/80 border-ink/30 backdrop-blur-sm"
                  }`}
                >
                  {isChecked && (
                    <i
                      className="ph-bold ph-check text-[10px]"
                      aria-hidden
                    />
                  )}
                </div>
              </button>

              {/* Selection ring around the card */}
              <div
                className={`rounded-xl ring-2 transition-all ${
                  isChecked
                    ? "ring-primary bg-primary/5"
                    : "ring-transparent"
                }`}
              >
                {childArray[idx]}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Add selected CTA */}
      {selectedCount > 0 && (
        <div className="mt-5 flex items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-line">
          <div className="text-sm text-ink">
            <span className="font-semibold">{selectedCount}</span>{" "}
            item{selectedCount > 1 ? "s" : ""} selected
          </div>
          <button
            type="button"
            onClick={handleAddAll}
            disabled={isAdding || done}
            className="h-11 px-6 rounded-full bg-primary text-primary-fg text-sm font-semibold inline-flex items-center gap-2 shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 transition-all disabled:opacity-60"
          >
            {isAdding ? (
              <>
                <i
                  className="ph-bold ph-spinner animate-spin text-[14px]"
                  aria-hidden
                />
                Adding...
              </>
            ) : done ? (
              <>
                <i
                  className="ph-fill ph-check-circle text-[14px]"
                  aria-hidden
                />
                Added!
              </>
            ) : (
              <>
                <i
                  className="ph-fill ph-shopping-bag text-[14px]"
                  aria-hidden
                />
                Add Selected to Cart
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
