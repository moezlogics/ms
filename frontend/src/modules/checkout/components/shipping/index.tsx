"use client"

import { RadioGroup, Radio } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import MedusaRadio from "@modules/common/components/radio"
import { useEffect, useState } from "react"

const PICKUP_ON = "__PICKUP_ON"
const PICKUP_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

/**
 * Shipping section — single-page checkout style.
 * Always visible. Auto-saves when a method is selected.
 */
const Shipping: React.FC<ShippingProps> = ({ cart, availableShippingMethods }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)
  const [showPickup, setShowPickup] = useState(PICKUP_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => (sm as any).service_zone?.fulfillment_set?.type !== "pickup"
  )
  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => (sm as any).service_zone?.fulfillment_set?.type === "pickup"
  )

  useEffect(() => {
    setIsLoadingPrices(true)
    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => (pricesMap[p.value?.id || ""] = p.value?.amount!))
          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      } else {
        setIsLoadingPrices(false)
      }
    } else {
      setIsLoadingPrices(false)
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickup(PICKUP_ON)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableShippingMethods])

  useEffect(() => {
    if (!shippingMethodId && availableShippingMethods && availableShippingMethods.length > 0) {
      const standardOptions = availableShippingMethods.filter(
        (sm) => (sm as any).service_zone?.fulfillment_set?.type !== "pickup"
      )
      if (standardOptions.length > 0) {
        handleSelect(standardOptions[0].id)
      } else if (availableShippingMethods.length > 0) {
        handleSelect(availableShippingMethods[0].id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingMethodId, availableShippingMethods])

  const handleSelect = async (id: string) => {
    setError(null)
    setIsLoading(true)
    const prev = shippingMethodId
    setShippingMethodId(id)

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id }).catch((err) => {
      setShippingMethodId(prev)
      setError(err.message)
    }).finally(() => setIsLoading(false))
  }

  return (
    <div data-testid="delivery-options-container" className="space-y-2">
          {/* Pickup option toggle */}
          {!!_pickupMethods?.length && (
            <RadioGroup
              value={showPickup}
              onChange={(value) => {
                const id = _pickupMethods.find((o) => !o.insufficient_inventory)?.id
                if (id) {
                  setShowPickup(PICKUP_ON)
                  handleSelect(id)
                }
              }}
            >
              <Radio
                value={PICKUP_ON}
                data-testid="delivery-option-radio"
                className={({ checked }) =>
                  `flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    checked ? "border-primary bg-primary/5" : "border-line hover:border-primary/50"
                  }`
                }
              >
                <MedusaRadio checked={showPickup === PICKUP_ON} />
                <span className="text-sm font-medium text-ink">Pick up in store</span>
                <span className="ml-auto text-sm text-ink/60">Free</span>
              </Radio>
            </RadioGroup>
          )}

          {/* Standard delivery options */}
          <RadioGroup
            value={shippingMethodId}
            onChange={(v) => { if (v) handleSelect(v) }}
          >
            {_shippingMethods?.map((option) => {
              const isDisabled =
                option.price_type === "calculated" &&
                !isLoadingPrices &&
                typeof calculatedPricesMap[option.id] !== "number"

              return (
                <Radio
                  key={option.id}
                  value={option.id}
                  data-testid="delivery-option-radio"
                  disabled={isDisabled}
                  className={({ checked }) =>
                    `flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all mb-2 ${
                      checked ? "border-primary bg-primary/5" : "border-line hover:border-primary/50"
                    } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`
                  }
                >
                  <MedusaRadio checked={option.id === shippingMethodId} />
                  <span className="text-sm font-medium text-ink flex-1">{option.name}</span>
                  <span className="text-sm font-semibold text-ink/80">
                    {option.price_type === "flat" ? (
                      convertToLocale({ amount: option.amount!, currency_code: cart?.currency_code })
                    ) : calculatedPricesMap[option.id] !== undefined ? (
                      convertToLocale({ amount: calculatedPricesMap[option.id], currency_code: cart?.currency_code })
                    ) : isLoadingPrices ? (
                      <Loader />
                    ) : "—"}
                  </span>
                  {isLoading && option.id === shippingMethodId && (
                    <i className="ph-bold ph-spinner animate-spin text-primary text-xs" aria-hidden />
                  )}
                </Radio>
              )
            })}
          </RadioGroup>

          {/* Store pickup locations */}
          {showPickup === PICKUP_ON && !!_pickupMethods?.length && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-ink/60 mb-2">Choose a pickup location</p>
              <RadioGroup
                value={shippingMethodId}
                onChange={(v) => { if (v) handleSelect(v) }}
              >
                {_pickupMethods.map((option) => (
                  <Radio
                    key={option.id}
                    value={option.id}
                    disabled={option.insufficient_inventory}
                    data-testid="delivery-option-radio"
                    className={({ checked }) =>
                      `flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all mb-2 ${
                        checked ? "border-primary bg-primary/5" : "border-line hover:border-primary/50"
                      } ${option.insufficient_inventory ? "opacity-40 cursor-not-allowed" : ""}`
                    }
                  >
                    <MedusaRadio checked={option.id === shippingMethodId} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">{option.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-ink/80">
                      {convertToLocale({ amount: option.amount!, currency_code: cart?.currency_code })}
                    </span>
                  </Radio>
                ))}
              </RadioGroup>
            </div>
          )}

      <ErrorMessage error={error} data-testid="delivery-option-error-message" />
    </div>
  )
}

export default Shipping
