"use client"

import React, { useEffect, useActionState } from "react"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomer } from "@lib/data/customer"
import { syncPushSubscriptionFromCustomer } from "@lib/data/push-subscriptions"

/**
 * Profile editor for the customer's gender.
 *
 * Storage
 * -------
 * Medusa V2 customers don't have a first-class `gender` column, so
 * we persist this on `customer.metadata.gender` (lowercase string —
 * `"male"`, `"female"`, or `"other"`). The same convention is used
 * by the setup wizard, the loyalty completion-reward calculator, and
 * the push-notification subscriber sync — keep them in lock-step.
 *
 * Side-effect
 * -----------
 * After saving we fire a best-effort sync to `/store/push-subscriptions
 * /sync-from-customer` so any existing browser push registrations
 * inherit the new gender for marketer segmentation. Failure is silent
 * — the next login or wizard run will reconcile.
 */
type Props = {
  customer: HttpTypes.StoreCustomer
}

const OPTIONS: { value: string; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Prefer not to say" },
]

const prettify = (raw?: string | null): string => {
  if (!raw) return "Not set"
  const opt = OPTIONS.find((o) => o.value === raw.toLowerCase())
  return opt ? opt.label : raw
}

const ProfileGender: React.FC<Props> = ({ customer }) => {
  const [successState, setSuccessState] = React.useState(false)

  const meta = (customer.metadata as any) || {}
  const current: string =
    typeof meta.gender === "string" ? meta.gender.toLowerCase() : ""

  const updateGender = async (
    _currentState: Record<string, unknown>,
    formData: FormData
  ) => {
    const value = String(formData.get("gender") || "")
      .trim()
      .toLowerCase()
    if (!value) {
      return { success: false, error: "Please pick an option." }
    }

    try {
      await updateCustomer({
        metadata: {
          ...(customer.metadata || {}),
          gender: value,
        },
      } as any)
      // Push subscriptions inherit the new gender for marketer
      // segmentation. Best-effort — failure is swallowed.
      syncPushSubscriptionFromCustomer().catch(() => undefined)
      return { success: true, error: null }
    } catch (error: any) {
      return { success: false, error: error?.toString?.() || "Save failed" }
    }
  }

  const [state, formAction] = useActionState(updateGender, {
    error: false,
    success: false,
  })

  const clearState = () => setSuccessState(false)

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="Gender"
        currentInfo={prettify(current)}
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={typeof state.error === "string" ? state.error : undefined}
        clearState={clearState}
        data-testid="account-gender-editor"
      >
        <div
          role="radiogroup"
          aria-label="Gender"
          className="grid grid-cols-1 small:grid-cols-3 gap-3"
        >
          {OPTIONS.map((opt) => {
            // We can't use controlled state here because <AccountInfo>
            // unmounts the children after a successful save — instead
            // we let each <input type="radio"> be naturally checked
            // via `defaultChecked`. The native form submission picks
            // up whichever the user selected last.
            const inputId = `gender-${opt.value}`
            return (
              <label
                key={opt.value}
                htmlFor={inputId}
                className="group relative flex items-center gap-3 h-12 px-4 rounded-xl border border-line bg-bg cursor-pointer transition-colors hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
              >
                <input
                  id={inputId}
                  type="radio"
                  name="gender"
                  value={opt.value}
                  defaultChecked={current === opt.value}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-line peer-checked:border-primary peer-checked:bg-primary text-[10px] text-bg"
                >
                  <span className="opacity-0 peer-checked:opacity-100">
                    <i className="ph-bold ph-check" />
                  </span>
                </span>
                <span className="text-sm font-medium text-ink/80 peer-checked:text-ink">
                  {opt.label}
                </span>
              </label>
            )
          })}
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileGender
