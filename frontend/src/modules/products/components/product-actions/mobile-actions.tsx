import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"

import { getProductPrice } from "@lib/util/get-product-price"
import OptionSelect from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
}

/**
 * Mobile sticky purchase bar — appears when the desktop add-to-cart
 * scrolls out of view. Uses the admin-managed primary color for the CTA
 * and a glass-blurred background so it feels integrated with the page.
 */
const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
}) => {
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("lg:hidden inset-x-0 fixed z-50 transition-all duration-300", {
          "pointer-events-none": !show,
        })}
        style={{ bottom: "calc(44px + env(safe-area-inset-bottom))" }}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0 translate-y-3"
          enterTo="opacity-100 translate-y-0"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-3"
        >
          <div
            className="bg-bg/95 backdrop-blur-md flex flex-col gap-2.5 p-3 w-full border-t border-line shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.12)]"
            data-testid="mobile-actions"
          >
            <div className="flex items-center gap-3">
              {product.thumbnail && (
                <img
                  src={product.thumbnail}
                  alt={product.title || ""}
                  className="w-10 h-10 object-cover rounded-md border border-line flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className="text-sm font-semibold text-ink truncate"
                  data-testid="mobile-title"
                >
                  {product.title}
                </div>
                {selectedPrice && (
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span
                      className={clx("text-sm font-bold", {
                        "text-danger": selectedPrice.price_type === "sale",
                        "text-ink": selectedPrice.price_type !== "sale",
                      })}
                    >
                      {selectedPrice.calculated_price}
                    </span>
                    {selectedPrice.price_type === "sale" && (
                      <span className="line-through text-[11px] text-ink/45">
                        {selectedPrice.original_price}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              className={clx("grid grid-cols-2 w-full gap-2", {
                "!grid-cols-1": isSimple,
              })}
            >
              {!isSimple && (
                <button
                  type="button"
                  onClick={open}
                  data-testid="mobile-actions-button"
                  className="h-11 px-4 rounded-full bg-surface text-ink text-sm font-medium border border-line flex items-center justify-between gap-2 hover:border-primary transition-colors"
                >
                  <span className="truncate">
                    {variant
                      ? Object.values(options).join(" / ")
                      : "Select options"}
                  </span>
                  <ChevronDown />
                </button>
              )}
              <button
                type="button"
                onClick={!variant ? open : handleAddToCart}
                disabled={variant && !inStock}
                data-testid="mobile-cart-button"
                className="h-11 px-4 rounded-full bg-primary text-primary-fg text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.4)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? (
                  <i className="ph-bold ph-spinner animate-spin text-[16px]" aria-hidden />
                ) : (
                  <i className="ph-fill ph-shopping-bag text-[14px]" aria-hidden />
                )}
                {!variant ? "Select variant" : !inStock ? "Out of stock" : "Add to cart"}
              </button>
            </div>
          </div>
        </Transition>
      </div>
      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
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

          <div className="fixed bottom-0 inset-x-0">
            <div className="flex min-h-full h-full items-end justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-4"
              >
                <Dialog.Panel
                  className="w-full max-h-[85vh] overflow-auto rounded-t-3xl bg-bg shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.2)] text-left flex flex-col gap-y-3"
                  data-testid="mobile-actions-modal"
                >
                  <div className="w-full flex justify-between items-center px-5 pt-4">
                    <h3 className="text-base font-semibold text-ink">
                      Select options
                    </h3>
                    <button
                      onClick={close}
                      className="bg-surface w-10 h-10 rounded-full text-ink flex justify-center items-center hover:bg-ink hover:text-bg transition-colors"
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>
                  <div className="px-5 pb-8">
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => {
                          return (
                            <div key={option.id}>
                              <OptionSelect
                                option={option}
                                current={options[option.id]}
                                updateOption={updateOptions}
                                title={option.title ?? ""}
                                disabled={optionsDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
