"use client"

import { useState } from "react"
import { recordReturnTo } from "@lib/data/customer"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:3062"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type GoogleSignInButtonProps = {
  className?: string
  label?: string
  /**
   * Path to send the user to after Google sign-in completes. Stashed in
   * an httpOnly cookie via `recordReturnTo()` because the OAuth round-trip
   * (storefront → Google → callback) strips any query params we'd put on
   * the request, so a cookie is the only way to ferry the destination
   * across the redirect.
   */
  returnTo?: string | null
}

/**
 * Google Sign-In Button — initiates Medusa V2's Google OAuth flow.
 *
 * Medusa V2 quirk: `GET /auth/customer/google` does NOT return a 302
 * redirect. It returns JSON `{ location: "https://accounts.google.com/..." }`
 * and expects the client to read that and navigate. If you instead point
 * the browser straight at the endpoint (e.g. `window.location.href = ...`
 * or a plain <a href>), the browser displays the raw JSON as text — which
 * is exactly the bug we hit before this fix.
 *
 * Flow now:
 *   1. fetch the OAuth URL from the backend
 *   2. read `location` from the JSON
 *   3. navigate the browser to it (full-page nav so cookies/state work)
 */
export default function GoogleSignInButton({
  className = "",
  label = "Continue with Google",
  returnTo,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      // Persist the desired post-auth destination as an httpOnly cookie
      // BEFORE the OAuth round-trip starts. The Google callback route
      // reads this cookie and redirects there once the session JWT is
      // minted. Awaited because the cookie has to land on the response
      // headers of *this* request for the subsequent navigation to see
      // it on the same origin.
      if (returnTo) {
        try {
          await recordReturnTo(returnTo)
        } catch {
          // Non-fatal — worst case the user lands on /account.
        }
      }

      const res = await fetch(`${BACKEND_URL}/auth/customer/google`, {
        method: "GET",
        credentials: "include",
        headers: PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : undefined,
      })

      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`)
      }

      const data = (await res.json().catch(() => null)) as
        | { location?: string }
        | null

      if (!data?.location) {
        throw new Error("Missing redirect URL in response")
      }

      // Full-page navigation so the OAuth flow's cookies/state survive
      window.location.href = data.location
    } catch (err: any) {
      setError(err?.message || "Could not start Google sign-in")
      setLoading(false)
    }
  }

  return (
    <>
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-3 h-11 border border-line bg-bg hover:bg-surface/50 rounded-full transition-all duration-200 text-sm font-semibold text-ink shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {/* Google "G" Logo SVG */}
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      <span className="text-xs font-semibold text-ink/90">{loading ? "Redirecting…" : label}</span>
    </button>
    {error && (
      <p className="mt-2 text-xs text-rose-600 text-center">{error}</p>
    )}
    </>
  )
}
