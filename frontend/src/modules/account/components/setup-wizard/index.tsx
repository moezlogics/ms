"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import {
  updateCustomer,
  addCustomerAddress,
} from "@lib/data/customer"
import { syncPushSubscriptionFromCustomer } from "@lib/data/push-subscriptions"
import ProfilePictureUploader from "@modules/account/components/profile-picture-uploader"

/**
 * Multi-step account setup — like the onboarding screens you see
 * after installing a fresh app. The user lands here after sign-up
 * (see the `signup()` action default redirect) and steps through:
 *
 *   1. Tell us your name
 *   2. Phone number (for delivery + OTP)
 *   3. Gender (powers personalised offers + push targeting AND
 *      decides which default avatar to render before the user
 *      uploads a photo)
 *   4. Profile picture (optional — but if skipped we already know
 *      enough from gender to pick a nicer default avatar)
 *   5. Default address
 *   6. All set! → claim 10 loyalty points
 *
 * Each step persists immediately to the backend so a partial finish
 * is never lost: refresh the page and you re-enter at the next blank
 * step. The last screen tells the user they earned points and links
 * back to the main dashboard, where the celebration toast also
 * fires once. Profile picture is optional and does NOT gate the 10pt
 * reward — see `claim-completion-reward/route.ts`.
 */

type Props = { customer: HttpTypes.StoreCustomer }

const TOTAL_STEPS = 6

export default function SetupWizard({ customer: initial }: Props) {
  const router = useRouter()
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Pick the first incomplete step on mount so refresh resumes flow.
  // Profile picture (step 3) is OPTIONAL — we never auto-stop here on
  // resume; if the user came back without a photo they jump straight
  // to address. A "Skip" button on the picture screen handles the
  // fresh sign-up case.
  const initialStep = useMemo(() => {
    if (!(customer.first_name && customer.last_name)) return 0
    if (!customer.phone) return 1
    const meta: any = customer.metadata || {}
    const savedGender =
      typeof meta.gender === "string" ? meta.gender.trim() : ""
    if (!savedGender) return 2
    const addresses = customer.addresses || []
    if (
      !addresses.some((a: any) => a.is_default_billing) &&
      addresses.length === 0
    )
      return 4
    return 5
  }, [customer])

  const [step, setStep] = useState(initialStep)

  const advance = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  // ── Step 1 — name ───────────────────────────────────────────────
  const [firstName, setFirstName] = useState(customer.first_name || "")
  const [lastName, setLastName] = useState(customer.last_name || "")
  const saveName = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your full name.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const updated = await updateCustomer({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        setCustomer(updated as HttpTypes.StoreCustomer)
        advance()
      } catch (e: any) {
        setError(e?.toString?.() || "Could not save your name.")
      }
    })
  }

  // ── Step 2 — phone ──────────────────────────────────────────────
  const [phone, setPhone] = useState(customer.phone || "")
  const savePhone = () => {
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const updated = await updateCustomer({ phone: phone.trim() })
        setCustomer(updated as HttpTypes.StoreCustomer)
        advance()
      } catch (e: any) {
        setError(e?.toString?.() || "Could not save your phone.")
      }
    })
  }

  // ── Step 3 — gender ─────────────────────────────────────────────
  // Stored in customer.metadata.gender (Medusa core has no first-class
  // gender field) and later synced to push_subscription rows so the
  // marketing dashboard can target campaigns by demographic.
  const initialGender =
    typeof (customer.metadata as any)?.gender === "string"
      ? ((customer.metadata as any).gender as string).toLowerCase()
      : ""
  const [gender, setGender] = useState<string>(initialGender)
  const saveGender = () => {
    const value = (gender || "").trim().toLowerCase()
    if (!value) {
      setError("Please pick an option to continue.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const updated = await updateCustomer({
          metadata: {
            ...(customer.metadata || {}),
            gender: value,
          },
        } as any)
        setCustomer(updated as HttpTypes.StoreCustomer)
        // Best-effort: push the new gender to any existing push
        // subscription rows for this customer. Failure is non-fatal.
        syncPushSubscriptionFromCustomer().catch(() => undefined)
        advance()
      } catch (e: any) {
        setError(e?.toString?.() || "Could not save your selection.")
      }
    })
  }

  // ── Step 4 — profile picture (optional) ────────────────────────
  // Pure presentational — the uploader handles its own
  // updateCustomer call when the user picks/removes a file. Skipping
  // is fine; we just advance.
  // (The actual UI lives below in the step renderer.)

  // ── Step 5 — address ────────────────────────────────────────────
  // Mirrors the simplified checkout: only the fields actually needed
  // for delivery in our market are collected here. `company`,
  // `address_2`, and `postal_code` were intentionally dropped.
  const [addr, setAddr] = useState({
    address_1: "",
    city: "",
    province: "",
    country_code: "pk",
  })
  const saveAddress = () => {
    if (!addr.address_1.trim() || !addr.city.trim()) {
      setError("Please enter at least the street and city.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set("first_name", customer.first_name || firstName)
        fd.set("last_name", customer.last_name || lastName)
        fd.set("address_1", addr.address_1.trim())
        fd.set("city", addr.city.trim())
        fd.set("province", addr.province.trim())
        fd.set("country_code", addr.country_code)
        fd.set("phone", customer.phone || phone)
        const result = await addCustomerAddress(
          { isDefaultBilling: true, isDefaultShipping: true },
          fd
        )
        if (result?.success) {
          advance()
        } else {
          setError(result?.error || "Could not save your address.")
        }
      } catch (e: any) {
        setError(e?.toString?.() || "Could not save your address.")
      }
    })
  }

  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink/55">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
        <h1 className="mt-1 text-2xl small:text-3xl font-semibold text-ink">
          {step === 0 && "What should we call you?"}
          {step === 1 && "Add a phone number"}
          {step === 2 && "How do you identify?"}
          {step === 3 && "Add a profile picture"}
          {step === 4 && "Where should we deliver?"}
          {step === 5 && "You're all set 🎉"}
        </h1>
        {/* Progress */}
        <div className="mt-4 w-full h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 transition-[width] duration-500"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-bg p-5 small:p-7">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink/60">
              We'll use this to greet you and on your order receipts.
            </p>
            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
              <Field
                label="First name"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
              />
              <Field
                label="Last name"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink/60">
              Used for delivery updates and account verification. We never
              spam.
            </p>
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              type="tel"
              autoComplete="tel"
              placeholder="+92 300 1234567"
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink/60">
              We use this to personalise offers and product recommendations.
              You can change this anytime from your profile.
            </p>
            <div
              role="radiogroup"
              aria-label="Gender"
              className="grid grid-cols-1 small:grid-cols-3 gap-3"
            >
              {[
                { value: "male", label: "Male", icon: "ph-user" },
                { value: "female", label: "Female", icon: "ph-user" },
                {
                  value: "other",
                  label: "Prefer not to say",
                  icon: "ph-user-circle",
                },
              ].map((opt) => {
                const selected = gender === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGender(opt.value)}
                    className={`flex items-center gap-3 h-14 px-4 rounded-xl border text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      selected
                        ? "border-primary bg-primary/5 text-ink"
                        : "border-line bg-bg text-ink/80 hover:border-ink/40"
                    }`}
                  >
                    <i
                      className={`ph-bold ${opt.icon} text-xl ${
                        selected ? "text-primary" : "text-ink/50"
                      }`}
                      aria-hidden
                    />
                    <span className="flex-1">{opt.label}</span>
                    {selected && (
                      <i
                        className="ph-fill ph-check-circle text-lg text-primary"
                        aria-hidden
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5 items-center text-center">
            <p className="text-sm text-ink/60 max-w-sm">
              A picture makes your reviews and order timeline feel
              personal. You can always change or remove it later.
            </p>
            <ProfilePictureUploader
              customer={customer}
              size={112}
              showHint={true}
              onChange={(c) => setCustomer(c)}
            />
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink/60">
              Save your default delivery address so checkout is one tap.
            </p>
            <Field
              label="Street address"
              value={addr.address_1}
              onChange={(v) => setAddr({ ...addr, address_1: v })}
              autoComplete="address-line1"
            />
            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
              <Field
                label="City"
                value={addr.city}
                onChange={(v) => setAddr({ ...addr, city: v })}
                autoComplete="address-level2"
              />
              <Field
                label="Province / state"
                value={addr.province}
                onChange={(v) => setAddr({ ...addr, province: v })}
                autoComplete="address-level1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink/55">
                Country
              </label>
              <select
                value={addr.country_code}
                onChange={(e) =>
                  setAddr({ ...addr, country_code: e.target.value })
                }
                className="h-11 px-3 rounded-lg border border-line bg-bg text-sm text-ink outline-none focus:border-ink"
                autoComplete="country"
              >
                <option value="pk">Pakistan</option>
                <option value="us">United States</option>
                <option value="gb">United Kingdom</option>
                <option value="ae">United Arab Emirates</option>
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-2">
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mb-4">
              <i className="ph-fill ph-coin text-4xl text-yellow-500" aria-hidden />
            </span>
            <h2 className="text-2xl font-semibold text-ink">
              +10 loyalty points unlocked
            </h2>
            <p className="mt-2 text-sm text-ink/60 max-w-sm mx-auto">
              Thanks for setting things up. Your points are already in your
              wallet — apply them at checkout to knock down your next order.
            </p>
            <div className="mt-6 flex flex-col small:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-fg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to dashboard
                <i className="ph-bold ph-arrow-right text-sm" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => router.push("/store")}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full border border-line text-ink hover:bg-surface text-sm font-semibold transition-colors"
              >
                Start shopping
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs text-rose-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Footer actions — hidden on the success screen */}
      {step < 5 && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || pending}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:text-ink disabled:opacity-40"
          >
            <i className="ph ph-arrow-left text-sm" aria-hidden />
            Back
          </button>

          {step === 0 && (
            <PrimaryButton onClick={saveName} pending={pending}>
              Continue
            </PrimaryButton>
          )}
          {step === 1 && (
            <PrimaryButton onClick={savePhone} pending={pending}>
              Continue
            </PrimaryButton>
          )}
          {step === 2 && (
            <PrimaryButton onClick={saveGender} pending={pending}>
              Continue
            </PrimaryButton>
          )}
          {step === 3 && (
            <PrimaryButton onClick={advance} pending={pending}>
              Continue
            </PrimaryButton>
          )}
          {step === 4 && (
            <PrimaryButton onClick={saveAddress} pending={pending}>
              Save & finish
            </PrimaryButton>
          )}
        </div>
      )}

      {/* Skip-for-now link */}
      {step < 5 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              // Profile picture is intentionally optional. Skipping it
              // here (when the upload is mid-step) jumps straight to
              // address rather than bouncing the user back to /account.
              if (step === 3) {
                advance()
              } else {
                router.push("/account")
              }
            }}
            className="text-xs text-ink/45 hover:text-ink/70 underline underline-offset-2"
          >
            {step === 3
              ? "Skip — I'll add it later"
              : "Skip for now — finish later"}
          </button>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/55">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-11 px-3 rounded-lg border border-line bg-bg text-sm text-ink placeholder:text-ink/35 outline-none focus:border-ink transition-colors"
      />
    </label>
  )
}

function PrimaryButton({
  children,
  onClick,
  pending,
}: {
  children: React.ReactNode
  onClick: () => void
  pending: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-fg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Saving…" : children}
      {!pending && <i className="ph-bold ph-arrow-right text-sm" aria-hidden />}
    </button>
  )
}
