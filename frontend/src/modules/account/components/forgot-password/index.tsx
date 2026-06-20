"use client"

import { useState, useTransition } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import OtpInput from "@modules/account/components/otp-input"
import { sendOtp, verifyOtp, resetPasswordWithOtp } from "@lib/data/otp-auth"

/**
 * Three-step forgot-password flow:
 *   1. email   → request OTP
 *   2. verify  → verify OTP
 *   3. reset   → set new password
 */
type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

type Step = "email" | "verify" | "reset" | "done"

const ForgotPassword = ({ setCurrentView }: Props) => {
  const [step, setStep] = useState<Step>("email")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const onRequest = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email) return setError("Email is required")
    startTransition(async () => {
      try {
        await sendOtp(email, "password_reset")
        setStep("verify")
        setInfo(`We sent a 6-digit code to ${email}.`)
      } catch (err: any) {
        setError(err?.message || "Failed to send reset code")
      }
    })
  }

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (code.length !== 6) return setError("Enter the 6-digit code")
    startTransition(async () => {
      try {
        await verifyOtp(email, code, "password_reset")
        setStep("reset")
        setInfo("Code verified. Set a new password below.")
      } catch (err: any) {
        setError(err?.message || "Invalid code")
      }
    })
  }

  const onReset = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 6)
      return setError("Password must be at least 6 characters")
    if (newPassword !== confirmPassword)
      return setError("Passwords do not match")

    startTransition(async () => {
      try {
        await resetPasswordWithOtp(email, code, newPassword)
        setStep("done")
        setInfo(
          "Your password has been updated. Sign in with your new password."
        )
      } catch (err: any) {
        setError(err?.message || "Failed to reset password")
      }
    })
  }

  const onResend = async () => {
    setError(null)
    setInfo(null)
    try {
      await sendOtp(email, "password_reset")
      setInfo(`We sent a new code to ${email}.`)
    } catch (err: any) {
      setError(err?.message || "Failed to resend code")
    }
  }

  return (
    <div
      className="w-full flex flex-col items-stretch"
      data-testid="forgot-password"
    >
      <h1 className="text-[26px] font-bold text-ink leading-tight tracking-tight text-center mb-1">Reset password</h1>
      {info ? (
        <p className="text-center text-xs text-ink/50 mb-6">
          {info}
        </p>
      ) : (
        <p className="text-center text-xs text-ink/50 mb-6">
          Enter your email to receive a password reset verification code.
        </p>
      )}

      {step === "email" && (
        <form className="w-full flex flex-col gap-3" onSubmit={onRequest}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && (
            <p className="text-rose-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full mt-4 h-11 bg-primary text-primary-fg rounded-full text-sm font-semibold hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Sending..." : "Send reset code"}
          </button>
        </form>
      )}

      {step === "verify" && (
        <form className="w-full flex flex-col" onSubmit={onVerify}>
          <OtpInput value={code} onChange={setCode} autoFocus />
          {error && (
            <p className="text-rose-500 text-sm text-center mt-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className="w-full mt-6 h-11 bg-primary text-primary-fg rounded-full text-sm font-semibold hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Verifying..." : "Verify code"}
          </button>
          <div className="flex items-center justify-between w-full mt-5 text-xs font-semibold text-ink/65">
            <button
              type="button"
              onClick={() => setStep("email")}
              className="hover:text-ink hover:underline transition-colors"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={pending}
              className="hover:text-ink hover:underline transition-colors disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form className="w-full flex flex-col gap-3" onSubmit={onReset}>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && (
            <p className="text-rose-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full mt-4 h-11 bg-primary text-primary-fg rounded-full text-sm font-semibold hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Updating..." : "Update password"}
          </button>
        </form>
      )}

      {step === "done" && (
        <button
          type="button"
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="w-full mt-4 h-11 bg-primary text-primary-fg rounded-full text-sm font-semibold hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center justify-center"
        >
          Back to Sign in
        </button>
      )}

      <span className="text-center text-ink/60 text-xs mt-6">
        Remembered it?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="font-bold text-ink hover:underline"
        >
          Sign in
        </button>
      </span>
    </div>
  )
}

export default ForgotPassword
