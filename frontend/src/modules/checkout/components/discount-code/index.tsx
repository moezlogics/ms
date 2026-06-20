"use client"

import { Badge, Heading, Input, Label, Text } from "@medusajs/ui"
import React from "react"

import { applyPromotions } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../error-message"
import { SubmitButton } from "../submit-button"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successCode, setSuccessCode] = React.useState("")

  const { promotions = [] } = cart
  const removePromotionCode = async (code: string) => {
    const validPromotions = promotions.filter(
      (promotion) => promotion.code !== code
    )

    await applyPromotions(
      validPromotions.filter((p) => p.code !== undefined).map((p) => p.code!)
    )
  }

  const addPromotionCode = async (formData: FormData) => {
    setErrorMessage("")
    setSuccessCode("")

    const code = formData.get("code")
    if (!code) {
      return
    }
    const input = document.getElementById("promotion-input") as HTMLInputElement
    const codes = promotions
      .filter((p) => p.code !== undefined)
      .map((p) => p.code!)
    codes.push(code.toString())

    try {
      await applyPromotions(codes)
      setSuccessCode(code.toString())
      setTimeout(() => setSuccessCode(""), 3000)
    } catch (e: any) {
      setErrorMessage(e.message)
    }

    if (input) {
      input.value = ""
    }
  }

  return (
    <div className="w-full flex flex-col">
      <div className="txt-medium">
        <form action={(a) => addPromotionCode(a)} className="w-full mb-4">
          {/* Toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            type="button"
            className="group flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors my-2"
            data-testid="add-discount-button"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <i
                className={`ph-bold ${isOpen ? "ph-minus" : "ph-plus"} text-[10px]`}
                aria-hidden
              />
            </span>
            {isOpen ? "Hide promo code" : "Have a promo code?"}
          </button>

          {isOpen && (
            <>
              <div className="flex w-full gap-2 mt-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i
                      className="ph ph-ticket text-[16px] text-ink/40"
                      aria-hidden
                    />
                  </div>
                  <Input
                    className="size-full pl-9 rounded-xl"
                    id="promotion-input"
                    name="code"
                    type="text"
                    autoFocus={false}
                    placeholder="Enter promo code"
                    data-testid="discount-input"
                  />
                </div>
                <SubmitButton
                  variant="secondary"
                  data-testid="discount-apply-button"
                  className="rounded-xl px-5"
                >
                  Apply
                </SubmitButton>
              </div>

              {/* Success animation */}
              {successCode && (
                <div className="flex items-center gap-2 mt-2 text-success text-sm font-medium animate-[fadeIn_300ms_ease-out]">
                  <i
                    className="ph-fill ph-check-circle text-[16px]"
                    aria-hidden
                  />
                  Code &quot;{successCode}&quot; applied successfully!
                </div>
              )}

              <ErrorMessage
                error={errorMessage}
                data-testid="discount-error-message"
              />
            </>
          )}
        </form>

        {promotions.length > 0 && (
          <div className="w-full">
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-semibold text-ink/60 uppercase tracking-wider">
                Applied promotions
              </p>

              {promotions.map((promotion) => {
                return (
                  <div
                    key={promotion.id}
                    className="flex items-center justify-between w-full p-2.5 rounded-xl bg-success/5 border border-success/15"
                    data-testid="discount-row"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-success/10 shrink-0">
                        <i
                          className="ph-fill ph-tag text-[12px] text-success"
                          aria-hidden
                        />
                      </span>
                      <div className="min-w-0">
                        <span
                          className="text-sm font-semibold text-ink truncate block"
                          data-testid="discount-code"
                        >
                          {promotion.code}
                          {promotion.is_automatic && (
                            <span className="ml-1.5 text-[10px] text-success font-medium uppercase">
                              Auto
                            </span>
                          )}
                        </span>
                        {promotion.application_method?.value !== undefined &&
                          promotion.application_method.currency_code !==
                            undefined && (
                            <span className="text-[11px] text-ink/55">
                              Saves{" "}
                              {promotion.application_method.type === "percentage"
                                ? `${promotion.application_method.value}%`
                                : convertToLocale({
                                    amount:
                                      +promotion.application_method.value,
                                    currency_code:
                                      promotion.application_method
                                        .currency_code,
                                  })}
                            </span>
                          )}
                      </div>
                    </div>
                    {!promotion.is_automatic && (
                      <button
                        className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-danger/10 text-ink/40 hover:text-danger transition-colors shrink-0"
                        onClick={() => {
                          if (!promotion.code) {
                            return
                          }
                          removePromotionCode(promotion.code)
                        }}
                        data-testid="remove-discount-button"
                        aria-label="Remove discount code"
                      >
                        <i className="ph ph-x text-[12px]" aria-hidden />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiscountCode
