"use client"

import { Dialog, Transition } from "@headlessui/react"
import { Fragment, useEffect, useState } from "react"
import { useCartDrawer } from "@lib/context/cart-drawer-context"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import CartCrossSells from "../cart-cross-sells"
import { useSiteSettings } from "@lib/context/site-settings-context"

type CartDrawerProps = {
  cart?: HttpTypes.StoreCart | null
}

/**
 * Premium slide-in cart drawer — opens from the right with glass-blur
 * backdrop. Shows cart items with qty, cross-sell placeholders, and
 * action buttons.
 */
export default function CartDrawer({ cart }: CartDrawerProps) {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const { isOpen, close } = useCartDrawer()

  const totalItems =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0
  const subtotal = cart?.subtotal ?? 0

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={close} className="relative z-[80]">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Drawer panel */}
        <div className="fixed inset-0 flex justify-end">
          <Transition.Child
            as={Fragment}
            enter="transform ease-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="relative w-full max-w-md bg-bg shadow-[0_0_60px_-10px_rgba(0,0,0,0.3)] flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
                    <i
                      className="ph-fill ph-handbag text-[16px]"
                      aria-hidden
                    />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      Your Cart
                    </h2>
                    <p className="text-[11px] text-ink/50">
                      {totalItems} item{totalItems !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="w-9 h-9 rounded-full bg-surface hover:bg-ink hover:text-bg flex items-center justify-center transition-colors"
                  aria-label="Close cart"
                >
                  <i className="ph ph-x text-[14px]" aria-hidden />
                </button>
              </div>

              {/* Items */}
              {cart && cart.items?.length ? (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {cart.items
                      .sort((a, b) =>
                        (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 group"
                          data-testid="cart-drawer-item"
                        >
                          <LocalizedClientLink
                            href={`/${item.product_handle}`}
                            onClick={close}
                            className={`w-20 shrink-0 rounded-xl overflow-hidden border border-line group-hover:border-primary/40 transition-colors ${globalAspectClass}`}
                          >
                            <Thumbnail
                              thumbnail={item.thumbnail}
                              images={item.variant?.product?.images}
                              size="square"
                            />
                          </LocalizedClientLink>
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <LocalizedClientLink
                                href={`/${item.product_handle}`}
                                onClick={close}
                                className="text-sm font-semibold text-ink truncate block hover:text-primary transition-colors"
                              >
                                {item.title}
                              </LocalizedClientLink>
                              <div className="text-[11px] text-ink/55 mt-0.5">
                                <LineItemOptions
                                  variant={item.variant}
                                  data-testid="cart-drawer-item-variant"
                                  data-value={item.variant}
                                />
                              </div>
                              <span className="text-[11px] text-ink/55">
                                Qty: {item.quantity}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="text-sm font-bold text-ink">
                                <LineItemPrice
                                  item={item}
                                  style="tight"
                                  currencyCode={cart.currency_code}
                                />
                              </div>
                              <DeleteButton
                                id={item.id}
                                className="text-[11px] text-ink/45 hover:text-danger inline-flex items-center gap-1 transition-colors"
                              >
                                <i
                                  className="ph ph-trash text-[12px]"
                                  aria-hidden
                                />
                                Remove
                              </DeleteButton>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Cart Cross-sells */}
                  <CartCrossSells cart={cart} />

                  {/* Footer */}
                  <div className="border-t border-line bg-surface/50 px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">
                        Subtotal
                        <span className="text-[11px] text-ink/50 ml-1 font-normal">
                          (excl. taxes)
                        </span>
                      </span>
                      <span className="text-base font-bold text-ink">
                        {convertToLocale({
                          amount: subtotal,
                          currency_code: cart.currency_code,
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <LocalizedClientLink
                        href="/cart"
                        onClick={close}
                        className="h-11 inline-flex items-center justify-center rounded-full border-2 border-ink text-ink text-sm font-semibold hover:bg-ink hover:text-bg transition-all"
                      >
                        View Cart
                      </LocalizedClientLink>
                      <LocalizedClientLink
                        href="/checkout"
                        onClick={close}
                        className="h-11 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-fg text-sm font-semibold shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 transition-all"
                      >
                        Checkout
                        <i
                          className="ph-bold ph-arrow-right text-[12px]"
                          aria-hidden
                        />
                      </LocalizedClientLink>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <i
                      className="ph-fill ph-handbag text-3xl text-primary"
                      aria-hidden
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-ink">
                      Your cart is empty
                    </span>
                    <span className="text-[13px] text-ink/55">
                      Add something beautiful to get started.
                    </span>
                  </div>
                  <LocalizedClientLink
                    href="/store"
                    onClick={close}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-full bg-primary text-primary-fg text-sm font-semibold shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 transition-all"
                  >
                    Explore Products
                    <i
                      className="ph-bold ph-arrow-right text-[12px]"
                      aria-hidden
                    />
                  </LocalizedClientLink>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
