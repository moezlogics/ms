"use client"

import { useState, useTransition } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import GoogleSignInButton from "@modules/account/components/google-sign-in-button"
import OtpInput from "@modules/account/components/otp-input"
import { signup } from "@lib/data/customer"
import { sendOtp, verifyOtp } from "@lib/data/otp-auth"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
  returnTo?: string | null
}

type Step = "form" | "otp"

const Register = ({ setCurrentView, returnTo }: Props) => {
  const [step, setStep] = useState<Step>("form")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [otp, setOtp] = useState("")

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  })

  const update = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  /** Step 1 → request an OTP for the entered email */
  const onRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.email || !form.password || !form.first_name) {
      setError("Please fill all required fields")
      return
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    startTransition(async () => {
      try {
        await sendOtp(form.email, "signup")
        setStep("otp")
        setInfo(`We sent a 6-digit code to ${form.email}.`)
      } catch (err: any) {
        setError(err?.message || "Failed to send verification code")
      }
    })
  }

  /** Step 2 → verify OTP, then call the standard signup() server action */
  const onVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code")
      return
    }
    startTransition(async () => {
      try {
        await verifyOtp(form.email, otp, "signup")
      } catch (err: any) {
        setError(err?.message || "Invalid verification code")
        return
      }

      // OTP verified — submit the existing FormData-based signup flow.
      // The server action `signup()` now returns ONLY on error (string)
      // — on success it calls Next.js `redirect()` server-side, which
      // throws a NEXT_REDIRECT "error" we must NOT swallow as a real
      // error. So we just propagate (don't set error) when the call
      // doesn't return a string.
      const fd = new FormData()
      fd.set("first_name", form.first_name)
      fd.set("last_name", form.last_name)
      fd.set("email", form.email)
      fd.set("phone", form.phone)
      fd.set("password", form.password)
      if (returnTo) fd.set("return_to", returnTo)

      try {
        const result = await signup(null, fd)
        if (typeof result === "string") {
          setError(result)
        }
      } catch (e: any) {
        // NEXT_REDIRECT is intentional — re-throw so Next.js can handle it.
        if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e
        setError(e?.message || "Sign-up failed")
      }
    })
  }

  const onResend = async () => {
    setError(null)
    setInfo(null)
    try {
      await sendOtp(form.email, "signup")
      setInfo(`We sent a new code to ${form.email}.`)
    } catch (err: any) {
      setError(err?.message || "Failed to resend code")
    }
  }

  if (step === "otp") {
    return (
      <div
        className="w-full flex flex-col items-stretch"
        data-testid="register-otp-page"
      >
        <h1 className="text-[26px] font-bold text-ink leading-tight tracking-tight text-center mb-1">Verify your email</h1>
        <p className="text-center text-xs text-ink/50 mb-6">
          {info ||
            `We sent a 6-digit code to ${form.email}. Enter it below to finish creating your account.`}
        </p>

        <form className="w-full flex flex-col" onSubmit={onVerifyAndSignup}>
          <OtpInput value={otp} onChange={setOtp} autoFocus />
          {error && (
            <p className="text-rose-500 text-sm text-center mt-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending || otp.length !== 6}
            className="w-full mt-6 h-11 bg-primary text-primary-fg rounded-full text-sm font-semibold hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Verifying..." : "Verify & Create Account"}
          </button>
        </form>

        <div className="flex items-center justify-between w-full mt-5 text-xs font-semibold text-ink/65">
          <button
            type="button"
            onClick={() => {
              setStep("form")
              setOtp("")
              setError(null)
            }}
            className="hover:text-ink hover:underline transition-colors"
          >
            Edit details
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
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-stretch"
      data-testid="register-page"
    >
      <h1 className="text-[26px] font-bold text-ink leading-tight tracking-tight text-center mb-1">Create Account</h1>
      <p className="text-center text-xs text-ink/50 mb-6">
        Create your profile and get access to faster checkout, order history and members-only offers.
      </p>

      <GoogleSignInButton
        className="mb-2"
        label="Sign up with Google"
        returnTo={returnTo}
      />

      <div className="w-full flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-line/80" />
        <span className="text-ink/40 text-[10px] font-bold uppercase tracking-wider">
          or register with email
        </span>
        <div className="flex-1 h-px bg-line/80" />
      </div>

      <form className="w-full flex flex-col" onSubmit={onRequestOtp}>
        <div className="flex flex-col w-full gap-y-3">
          <Input
            label="First name"
            name="first_name"
            required
            autoComplete="given-name"
            value={form.first_name}
            onChange={update("first_name")}
            data-testid="first-name-input"
          />
          <Input
            label="Last name"
            name="last_name"
            required
            autoComplete="family-name"
            value={form.last_name}
            onChange={update("last_name")}
            data-testid="last-name-input"
          />
          <Input
            label="Email"
            name="email"
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
            data-testid="email-input"
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update("phone")}
            data-testid="phone-input"
          />
          <Input
            label="Password"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={error} data-testid="register-error" />
        <span className="text-center text-ink/50 text-[11px] mt-6 leading-normal">
          By creating an account, you agree to our{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline font-semibold text-ink/75 hover:text-ink transition-colors"
          >
            Privacy Policy
          </LocalizedClientLink>{" "}
          and{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline font-semibold text-ink/75 hover:text-ink transition-colors"
          >
            Terms of Use
          </LocalizedClientLink>
          .
        </span>
        <button
          type="submit"
          disabled={pending}
          className="w-full mt-6 h-11 bg-primary text-primary-fg rounded-full text-sm font-semibold hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="register-button"
        >
          {pending ? "Sending code..." : "Continue"}
        </button>
      </form>
      <span className="text-center text-ink/60 text-xs mt-6">
        Already a member?{" "}
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

export default Register
