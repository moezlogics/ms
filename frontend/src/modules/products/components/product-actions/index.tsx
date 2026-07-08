"use client"

import { addToCart } from "@lib/data/cart"
import { trackAddToCart } from "@lib/analytics"
import { notifyCartUpdated } from "@lib/context/user-data-context"

import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"

import { useRouter } from "next/navigation"
import OptionSelect from "@modules/products/components/product-actions/option-select"

import QuantityStepper from "../quantity-stepper"

import WhatsAppOrderButton from "@modules/common/components/whatsapp-button"
import { getPreorderState } from "@lib/util/preorder"
import CompareButton from "@modules/products/components/compare/compare-button"
import { useCompare, CompareItem, COMPARE_MAX } from "@modules/products/components/compare/context"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  whatsappNumber?: string
  whatsappBuyNowEnabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

/**
 * PDP action panel — compact, professional.
 *
 * Buy It Now → goes DIRECTLY to checkout (not cart page).
 */
export default function ProductActions({
  product,
  disabled,
  whatsappNumber,
  whatsappBuyNowEnabled = true,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const searchParams = useSearchParams()
  const vId = searchParams.get("v_id")

  const [options, setOptions] = useState<Record<string, string | undefined>>(() => {
    const variants = product.variants ?? []
    if (variants.length === 0) return {}

    if (variants.length <= 1) {
      const first = variants[0]
      return optionsAsKeymap(first.options) ?? {}
    }

    // Default: no options are selected initially (so URL remains clean without v_id)
    const emptyMap: Record<string, string | undefined> = {}
    product.options?.forEach((opt) => {
      emptyMap[opt.id] = undefined
    })
    return emptyMap
  })
  const [qty, setQty] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)
  const countryCode = useParams().countryCode as string
  const compareContext = useCompare()

  // Manage body class for hiding bottom nav on PDP
  useEffect(() => {
    document.body.classList.add("is-pdp-page")
    return () => {
      document.body.classList.remove("is-pdp-page")
    }
  }, [])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }
    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({ ...prev, [optionId]: value }))
  }

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // ── Sync options ↔ URL ?v_id= (flicker-free custom events) ─────────────
  //
  // Both mobile and desktop layout ProductActions instances and the ImageGallery
  // sync their options and images using custom window events. This avoids calling Next.js
  // router.replace() or modifying Next.js history state, which triggers a server re-render
  // and makes the variant URL params or strings flash/disappear.
  //
  // Phase 1 — url → options: run once on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlVId = params.get("v_id")

    if (!urlVId) {
      // No v_id in URL: do nothing so options stay unselected and URL stays clean.
      return
    }

    const target = product.variants?.find((v) => v.id === urlVId)
    if (!target) return
    const targetOpts = optionsAsKeymap(target.options) ?? {}
    if (!isEqual(options, targetOpts)) {
      setOptions(targetOpts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 2 — listen for external variant-change events to stay in sync
  useEffect(() => {
    const handleVariantChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      const targetId = customEvent.detail
      if (!targetId || targetId === selectedVariant?.id) return

      const target = product.variants?.find((v) => v.id === targetId)
      if (!target) return
      const targetOpts = optionsAsKeymap(target.options) ?? {}
      if (!isEqual(options, targetOpts)) {
        setOptions(targetOpts)
      }
    }
    window.addEventListener("variant-change", handleVariantChange)
    return () => window.removeEventListener("variant-change", handleVariantChange)
  }, [selectedVariant, options, product.variants])

  // Phase 3 — options → url: dispatch event & update URL on user selection
  useEffect(() => {
    if ((product.variants?.length ?? 0) <= 1) return
    if (!selectedVariant?.id) return

    const params = new URLSearchParams(window.location.search)
    if (params.get("v_id") === selectedVariant.id) return

    params.set("v_id", selectedVariant.id)
    const qs = params.toString()
    window.history.replaceState(null, "", `${pathname}?${qs}`)
    window.dispatchEvent(new CustomEvent("variant-change", { detail: selectedVariant.id }))
  }, [selectedVariant, pathname, product.variants])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) return true
    if (selectedVariant?.allow_backorder) return true
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }
    return false
  }, [selectedVariant])

  // Pre-order state from product metadata. When active we swap CTA
  // labels ("Add to Cart" → "Pre-order Now", "Buy Now" →
  // "Pre-order & Pay") and bypass the stock check so the buttons
  // remain enabled even when inventory is zero pre-launch.
  const preorder = useMemo(
    () => getPreorderState(product.metadata),
    [product.metadata]
  )

  const stockQty = selectedVariant?.inventory_quantity ?? 0
  const stockLabel = useMemo(() => {
    if (!selectedVariant) return null
    if (!inStock)
      return { text: "Out of stock", className: "bg-danger/10 text-danger" }
    if (
      selectedVariant.manage_inventory &&
      !selectedVariant.allow_backorder &&
      stockQty > 0 &&
      stockQty <= 10
    ) {
      return {
        text: `Only ${stockQty} left`,
        className: "bg-warning/15 text-warning",
      }
    }
    return { text: "In stock", className: "bg-success/10 text-success" }
  }, [selectedVariant, inStock, stockQty])

  const actionsRef = useRef<HTMLDivElement>(null)

  const performAddToCart = async () => {
    if (!selectedVariant?.id) return
    await addToCart({
      variantId: selectedVariant.id,
      quantity: qty,
      countryCode,
    })
    notifyCartUpdated()
    trackAddToCart({
      id: product.id,
      title: product.title || "",
      variant: selectedVariant.title || "",
      price: selectedVariant.calculated_price?.calculated_amount || 0,
      quantity: qty,
      currency: selectedVariant.calculated_price?.currency_code || "usd",
    })
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null
    setIsAdding(true)
    try {
      await performAddToCart()
    } finally {
      setIsAdding(false)
    }
  }

  // Buy It Now → add to cart then go DIRECTLY to checkout
  const handleBuyItNow = async () => {
    if (!selectedVariant?.id) return
    setIsBuyingNow(true)
    try {
      await performAddToCart()
      router.push(`/${countryCode}/checkout`)
    } finally {
      setIsBuyingNow(false)
    }
  }

  // For pre-order products the inventory check is intentionally
  // ignored — admins use pre-order specifically because stock isn't
  // available yet. They still need a selected, valid variant though.
  const disabledAdd =
    (!preorder.isPreorder && !inStock) ||
    !selectedVariant ||
    !!disabled ||
    isAdding ||
    !isValidVariant

  // Sticky Bar button labels and disabling states
  const stickyButtonText = useMemo(() => {
    if (!selectedVariant && (product.variants?.length ?? 0) > 1) {
      return "Select Variant"
    }
    if (preorder.isPreorder) {
      return "Pre-order Now"
    }
    if (!inStock || (selectedVariant && !isValidVariant)) {
      return "Out of stock"
    }
    return "Add to Cart"
  }, [selectedVariant, product.variants, preorder.isPreorder, inStock, isValidVariant])

  const disabledStickyAdd =
    (selectedVariant && !preorder.isPreorder && !inStock) ||
    (selectedVariant && !isValidVariant) ||
    !!disabled ||
    isAdding

  const handleStickyAddToCart = async () => {
    if (!selectedVariant) {
      actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    await handleAddToCart()
  }

  const handleCompareClick = () => {
    if (!product.handle) return

    const currentCategoryId = product.categories?.[0]?.id ?? null
    const currentCategoryName = product.categories?.[0]?.name ?? null

    const currentItems = compareContext.items
    const sameCategoryItems = currentCategoryId 
      ? currentItems.filter((item) => item.categoryId === currentCategoryId)
      : []
    
    const currentItem: CompareItem = {
      handle: product.handle,
      title: product.title || product.handle,
      thumbnail: product.thumbnail || null,
      categoryId: currentCategoryId,
      categoryName: currentCategoryName,
    }

    const nextItems = [...sameCategoryItems]
    if (!nextItems.some((item) => item.handle === currentItem.handle)) {
      nextItems.push(currentItem)
    }

    const finalItems = nextItems.slice(0, COMPARE_MAX)
    compareContext.replaceAll(finalItems)

    const nextHandles = finalItems.map((item) => item.handle)
    router.push(`/${countryCode}/compare?h=${nextHandles.join(",")}`)
  }

  // ── Selling toggle (admin: product.metadata.for_sale) ──────────────
  // Enabled by default (unset / null / undefined / true). Only disabled when
  // explicitly configured as false / "false" in metadata.
  const forSale =
    (product.metadata as any)?.for_sale !== false &&
    (product.metadata as any)?.for_sale !== "false"
  // Compare defaults ON (only an explicit `false` hides it).
  const comparable = (product.metadata as any)?.comparable !== false

  return (
    <div className="flex flex-col gap-2.5" ref={actionsRef}>
      {/* Stock status indicator */}
      {forSale && stockLabel && (
        <div className="flex items-center gap-2 text-xs font-medium text-ink/75 self-start py-1">
          <span className="relative flex h-2 w-2">
            {!preorder.isPreorder && inStock && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                stockLabel.text.startsWith("Only") ? "bg-warning" : "bg-success"
              }`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              !inStock ? "bg-danger" : stockLabel.text.startsWith("Only") ? "bg-warning" : "bg-success"
            }`} />
          </span>
          <span>{stockLabel.text}</span>
        </div>
      )}

      {/* Price + Quantity stepper — inline row to mirror reference PDP.
          Quantity only shows when the product is for sale; price always. */}
      <div className="flex items-center justify-between gap-3">
        <ProductPrice product={product} variant={selectedVariant} size="lg" />
        {forSale && (
          <QuantityStepper
            value={qty}
            onChange={setQty}
            min={1}
            max={Math.max(1, Math.min(99, inStock ? stockQty || 99 : 1))}
            disabled={!!disabled || isAdding || !inStock}
          />
        )}
      </div>

      {/* Variant pickers */}
      {(product.variants?.length ?? 0) > 1 && (
        <div className="flex flex-col gap-1.5">
          {(product.options || []).map((option) => (
            <OptionSelect
              key={option.id}
              option={option}
              current={options[option.id]}
              updateOption={setOptionValue}
              title={option.title ?? ""}
              data-testid="product-options"
              disabled={!!disabled || isAdding}
            />
          ))}
        </div>
      )}

      {/* Add to Cart + Buy it now — side-by-side on all viewports.
          Hidden entirely when the product isn't for sale (no empty gap —
          the flex column simply collapses and the content below moves up). */}
      {forSale && (
      <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleBuyItNow}
          disabled={disabledAdd || isBuyingNow}
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full bg-bg border border-primary text-primary text-sm font-semibold tracking-wide transition-all duration-200 hover:bg-primary/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBuyingNow ? (
            <>
              <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
              Processing…
            </>
          ) : preorder.isPreorder ? (
            "Pre-order & Pay"
          ) : (
            "Buy Now"
          )}
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={disabledAdd}
          data-testid="add-product-button"
          className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full bg-primary text-primary-fg text-sm font-semibold tracking-wide transition-all duration-200 shadow-[0_4px_14px_-6px_rgb(var(--color-primary)/0.4)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <>
              <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
              {preorder.isPreorder ? "Reserving…" : "Adding…"}
            </>
          ) : (
            <>
              {!selectedVariant
                ? "Select variant"
                : preorder.isPreorder
                ? "Pre-order Now"
                : !inStock || !isValidVariant
                ? "Out of stock"
                : "Add to Cart"}
            </>
          )}
        </button>
      </div>

      {/* Order on WhatsApp — full width */}
      {whatsappNumber && whatsappBuyNowEnabled && (
        <WhatsAppOrderButton
          productTitle={product.title || ""}
          productHandle={product.handle || ""}
          whatsappNumber={whatsappNumber}
        />
      )}
      </>
      )}

      {/* Add-to-Compare — shown unless comparable is explicitly disabled */}
      {comparable && (
        <CompareButton
          product={{
            handle: product.handle,
            title: product.title,
            thumbnail: product.thumbnail,
            categoryId: product.categories?.[0]?.id ?? null,
            categoryName: product.categories?.[0]?.name ?? null,
          }}
          variant="pdp"
          className="w-full hidden lg:inline-flex"
        />
      )}

      {/* Mobile Sticky Bottom Bar. When the product isn't for sale the
          Add-to-Cart button is dropped and the Specs/Reviews/Compare links
          spread evenly across the full width (no empty space / lopsided
          gap). */}
      <div className="small:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-line px-4 py-2 flex items-center justify-between gap-3 pb-[safe-area-inset-bottom] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div
          className={`flex items-center py-0.5 ${
            forSale ? "gap-[22px]" : "w-full justify-around gap-0"
          }`}
        >
          <a
            href="#spec-row-dummy"
            className="flex flex-col items-center gap-0.5 text-[10.5px] font-semibold text-ink/75 hover:text-primary transition-colors shrink-0"
          >
            <i className="ph ph-clipboard-text text-[18px]" />
            <span>Specs</span>
          </a>
          <a
            href="#reviews"
            className="flex flex-col items-center gap-0.5 text-[10.5px] font-semibold text-ink/75 hover:text-primary transition-colors shrink-0"
          >
            <i className="ph ph-chat-circle-dots text-[18px]" />
            <span>Reviews</span>
          </a>
          <button
            type="button"
            onClick={handleCompareClick}
            className="flex flex-col items-center gap-0.5 text-[10.5px] font-semibold text-ink/75 hover:text-primary transition-colors shrink-0"
          >
            <i className="ph ph-arrows-left-right text-[18px]" />
            <span>Compare</span>
          </button>
        </div>

        {forSale && (
        <button
          type="button"
          onClick={handleStickyAddToCart}
          disabled={disabledStickyAdd}
          className="flex-1 max-w-[155px] h-10 px-3 rounded-lg bg-primary text-primary-fg text-[11.5px] font-bold tracking-wide flex items-center justify-center gap-1 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isAdding ? (
            <>
              <i className="ph-bold ph-spinner animate-spin text-xs" aria-hidden />
              <span>Adding...</span>
            </>
          ) : (
            <>
              <i className="ph ph-shopping-bag text-sm" />
              <span>{stickyButtonText}</span>
            </>
          )}
        </button>
        )}
      </div>

    </div>
  )
}
