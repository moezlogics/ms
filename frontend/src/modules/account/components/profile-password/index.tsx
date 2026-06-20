"use client"

import React, { useState, useTransition } from "react"
import { HttpTypes } from "@medusajs/types"
import AccountInfo from "../account-info"
import {
  sendOtp,
  resetPasswordWithOtp,
} from "@lib/data/otp-auth"

type Props = {
  customer: HttpTypes.StoreCustomer
}

/**
 * OTP-based password change.
 *
 * Why OTP instead of "old password"?
 *   • Google/social-only users have NO local password — there's
 *     literally nothing to type into "Old password". Forcing them
 *     through that field meant they could never set one. With OTP
 *     we treat email-control as the proof of identity, which works
 *     uniformly for both account types.
 *   • Email-password users still get the same UX as a forgot-password
 *     reset, so the muscle memory matches what they're used to.
 *
 * Flow:
 *   1. User clicks "Set" / "Change password" → we POST
 *      `/store/auth/otp/send` with `purpose=password_reset`. The
 *      6-digit code is mailed to the customer's address.
 *   2. User enters the OTP + new password (with confirm) and submits.
 *   3. We POST `/store/auth/otp/reset-password`; the backend
 *      re-verifies the code (consuming it) and writes the new hash
 *      via the auth module.
 *
 * Social users see "Set password" copy, email-password users see
 * "Change password". The mechanic is identical — Medusa's auth-emailpass
 * provider's `update()` upserts the credentials either way, so a Google
 * user who completes this gains an email-password login as a second
 * sign-in method without touching their Google identity.
 */
export default function ProfilePassword({ customer }: Props) {
  const isSocialUser = !customer.has_password

  const [step, setStep] = useState<"idle" | "code">("idle")
  const [code, setCode] = useState("")
  const [pwd, setPwd] = useState("")
  const [pwdConfirm, setPwdConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()
  const [resendAt, setResendAt] = useState<number | null>(null)

  const ctaLabel = isSocialUser ? "Set password" : "Change password"
  const description = isSocialUser
    ? "You signed in with Google — no password is set yet. Add one to also sign in with email."
    : "Forgot it? We'll mail you a one-time code instead of asking for the old one."

  const requestCode = () => {
    setError(null)
    startTransition(async () => {
      try {
        await sendOtp(customer.email, "password_reset")
        setStep("code")
        setResendAt(Date.now() + 30_000)
      } catch (e: any) {
        setError(e?.message || "Could not send the code. Try again.")
      }
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (pwd.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (pwd !== pwdConfirm) {
      setError("Passwords don't match.")
      return
    }
    if (code.replace(/\s/g, "").length !== 6) {
      setError("Enter the 6-digit code from your email.")
      return
    }
    startTransition(async () => {
      try {
        await resetPasswordWithOtp(customer.email, code.replace(/\s/g, ""), pwd)
        setSuccess(true)
        setStep("idle")
        setCode("")
        setPwd("")
        setPwdConfirm("")
      } catch (e: any) {
        setError(e?.message || "Couldn't update your password. Try again.")
      }
    })
  }

  const reset = () => {
    setStep("idle")
    setCode("")
    setPwd("")
    setPwdConfirm("")
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="w-full">
      <AccountInfo
        label="Password"
        currentInfo={
          isSocialUser ? (
            <span className="text-ui-fg-subtle inline-flex items-center gap-2">
              <i className="ph ph-google-logo text-base" aria-hidden />
              Signed in with Google · no password set
            </span>
          ) : (
            <span>Hidden for security</span>
          )
        }
        isSuccess={success}
        isError={!!error}
        errorMessage={error || undefined}
        clearState={reset}
        data-testid="account-password-editor"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink/60">{description}</p>

          {step === "idle" && (
            <div>
              <button
                type="button"
                onClick={requestCode}
                disabled={pending}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-ink text-bg text-sm font-semibold hover:bg-ink/85 transition-colors disabled:opacity-60"
              >
                <i className="ph-bold ph-paper-plane-tilt text-sm" aria-hidden />
                {pending ? "Sending code…" : `${ctaLabel} via email`}
              </button>
              <p className="mt-2 text-[11px] text-ink/45">
                We'll send a 6-digit code to{" "}
                <span className="font-medium text-ink/70">{customer.email}</span>.
              </p>
            </div>
          )}

          {step === "code" && (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="rounded-xl bg-surface/60 border border-line p-3.5 text-[13px] text-ink/70 inline-flex items-start gap-2.5">
                <i className="ph-fill ph-envelope-simple text-base text-ink/55 mt-0.5" aria-hidden />
                <span className="flex-1">
                  Code sent to{" "}
                  <span className="font-semibold text-ink">{customer.email}</span>
                  . It expires in 10 minutes.
                </span>
              </div>

              <FormField label="Verification code">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  maxLength={6}
                  placeholder="123456"
                  className="h-12 px-4 rounded-lg border border-line bg-bg text-ink text-center text-xl font-mono tracking-[0.5em] outline-none focus:border-ink"
                />
              </FormField>

              <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                <FormField label="New password">
                  <input
                    type="password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    className="h-11 px-3 rounded-lg border border-line bg-bg text-sm text-ink outline-none focus:border-ink"
                  />
                </FormField>
                <FormField label="Confirm password">
                  <input
                    type="password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    className="h-11 px-3 rounded-lg border border-line bg-bg text-sm text-ink outline-none focus:border-ink"
                  />
                </FormField>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-fg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {pending ? "Updating…" : "Save new password"}
                </button>
                <ResendButton
                  resendAt={resendAt}
                  pending={pending}
                  onResend={requestCode}
                />
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs text-ink/50 hover:text-ink underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </AccountInfo>
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/55">
        {label}
      </span>
      {children}
    </label>
  )
}

function ResendButton({
  resendAt,
  pending,
  onResend,
}: {
  resendAt: number | null
  pending: boolean
  onResend: () => void
}) {
  const [now, setNow] = useState(Date.now())
  React.useEffect(() => {
    if (!resendAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [resendAt])

  const remaining = resendAt ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0
  const disabled = pending || remaining > 0

  return (
    <button
      type="button"
      onClick={onResend}
      disabled={disabled}
      className="text-xs text-ink/60 hover:text-ink underline underline-offset-2 disabled:no-underline disabled:opacity-60"
    >
      {remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
    </button>
  )
}
