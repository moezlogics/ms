"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"
import { useSiteSettings } from "@lib/context/site-settings-context"

/**
 * Premium cart dropdown — handbag icon with quantity badge + hover
 * preview panel. Auto-opens for ~4s when an item is added.
 *
 * Uses the site's admin-driven primary colour tokens, glass-blurred
 * panel, rounded-2xl full-bleed cards and a primary-tinted shadow so
 * it feels continuous with the new PDP aesthetic.
 */
const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()
    const timer = setTimeout(close, 4000)
    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) clearTimeout(activeTimer)
    open()
  }

  useEffect(() => {
    return () => {
      if (activeTimer) clearTimeout(activeTimer)
    }
  }, [activeTimer])

  const pathname = usePathname()

  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full flex items-center outline-none">
          <LocalizedClientLink
            href="/cart"
            data-testid="nav-cart-link"
            aria-label={`Cart, ${totalItems} item${totalItems === 1 ? "" : "s"}`}
            className="relative w-12 h-12 flex items-center justify-center rounded-full hover:bg-header-hover text-header-fg hover:text-header-accent transition-all duration-200 hover:scale-[1.05]"
          >
            <i className="ph-bold ph-handbag text-[24px]" aria-hidden />
            {totalItems > 0 && (
              <span
                data-testid="nav-cart-count"
                className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-primary-fg bg-primary flex items-center justify-center rounded-full ring-2 ring-header"
              >
                {totalItems}
              </span>
            )}
          </LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-2 scale-[0.98]"
          enterTo="opacity-100 translate-y-0 scale-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0 scale-100"
          leaveTo="opacity-0 translate-y-2 scale-[0.98]"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+10px)] right-0 bg-bg/95 backdrop-blur-md border border-line rounded-2xl w-[420px] text-ink shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)] overflow-hidden"
            data-testid="nav-cart-dropdown"
          >
            <div className="p-4 flex items-center justify-between border-b border-line">
              <h3 className="text-base font-semibold text-ink inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <i className="ph-fill ph-handbag text-[14px]" aria-hidden />
                </span>
                Your Bag
              </h3>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/55">
                {totalItems} item{totalItems === 1 ? "" : "s"}
              </span>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-auto max-h-[402px] px-4 py-4 grid grid-cols-1 gap-y-5 no-scrollbar">
                  {cartState.items
                    .sort((a, b) =>
                      (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                    )
                    .map((item) => (
                      <div
                        className="grid grid-cols-[88px_1fr] gap-x-4 group"
                        key={item.id}
                        data-testid="cart-item"
                      >
                        <LocalizedClientLink
                          href={`/${item.product_handle}`}
                          className={`w-[88px] rounded-xl overflow-hidden border border-line group-hover:border-primary/40 transition-colors ${globalAspectClass}`}
                        >
                          <Thumbnail
                            thumbnail={item.thumbnail}
                            images={item.variant?.product?.images}
                            size="square"
                          />
                        </LocalizedClientLink>
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col flex-1 min-w-0">
                              <LocalizedClientLink
                                href={`/${item.product_handle}`}
                                data-testid="product-link"
                                className="text-sm font-semibold text-ink truncate hover:text-primary transition-colors"
                              >
                                {item.title}
                              </LocalizedClientLink>
                              <div className="text-[11px] text-ink/55 mt-0.5 truncate">
                                <LineItemOptions
                                  variant={item.variant}
                                  data-testid="cart-item-variant"
                                  data-value={item.variant}
                                />
                              </div>
                              <span
                                data-testid="cart-item-quantity"
                                data-value={item.quantity}
                                className="text-[11px] text-ink/55 mt-0.5"
                              >
                                Qty: {item.quantity}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-ink shrink-0">
                              <LineItemPrice
                                item={item}
                                style="tight"
                                currencyCode={cartState.currency_code}
                              />
                            </div>
                          </div>
                          <DeleteButton
                            id={item.id}
                            className="mt-2 text-[11px] text-ink/55 hover:text-danger inline-flex items-center gap-1 transition-colors w-fit"
                            data-testid="cart-item-remove-button"
                          >
                            <i className="ph ph-trash text-[12px]" aria-hidden />
                            Remove
                          </DeleteButton>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="p-4 border-t border-line bg-surface/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">
                      Subtotal
                      <span className="text-[11px] text-ink/50 ml-1 font-normal">
                        (excl. taxes)
                      </span>
                    </span>
                    <span
                      className="text-base font-bold text-ink"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <LocalizedClientLink
                      href="/cart"
                      className="h-11 inline-flex items-center justify-center rounded-full border-2 border-ink text-ink text-sm font-semibold hover:bg-ink hover:text-bg transition-all"
                      data-testid="go-to-cart-button"
                    >
                      View Cart
                    </LocalizedClientLink>
                    <LocalizedClientLink
                      href="/checkout"
                      className="h-11 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-fg text-sm font-semibold shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 transition-all"
                    >
                      Checkout
                      <i className="ph-bold ph-arrow-right text-[12px]" aria-hidden />
                    </LocalizedClientLink>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 flex flex-col gap-4 items-center justify-center px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <i className="ph-fill ph-handbag text-2xl text-primary" aria-hidden />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-ink">
                    Your bag is empty
                  </span>
                  <span className="text-[12px] text-ink/55">
                    Add something beautiful to get started.
                  </span>
                </div>
                <LocalizedClientLink
                  href="/store"
                  onClick={close}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-full bg-primary text-primary-fg text-sm font-semibold shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 transition-all"
                >
                  Explore products
                  <i className="ph-bold ph-arrow-right text-[12px]" aria-hidden />
                </LocalizedClientLink>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
