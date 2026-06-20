"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import Register from "@modules/account/components/register"
import Login from "@modules/account/components/login"
import ForgotPassword from "@modules/account/components/forgot-password"
import { recordReturnTo } from "@lib/data/customer"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
  FORGOT = "forgot",
}

/**
 * Sanitize a `return_to` value before we hand it to the auth flow.
 * Same allow-list as the server-side `isSafeReturnTo()` — keeps an
 * attacker-controlled query param from turning the login page into
 * an open redirect to `//evil.com`.
 */
function sanitizeReturnTo(raw: string | null): string | null {
  if (!raw) return null
  if (typeof raw !== "string") return null
  if (!raw.startsWith("/") || raw.startsWith("//")) return null
  if (raw.length > 512) return null
  if (/[\x00-\x1f]/.test(raw)) return null
  return raw
}

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState<LOGIN_VIEW>(LOGIN_VIEW.SIGN_IN)
  const params = useSearchParams()
  const returnTo = sanitizeReturnTo(params?.get("return_to") || null)

  // Persist the desired post-auth destination as a server-side cookie
  // the moment the login page mounts. A cookie (rather than a URL or
  // form field alone) is the only thing that survives the Google OAuth
  // round-trip, where the storefront → Google → storefront hop strips
  // every query param except those we explicitly tunnel via `state`.
  useEffect(() => {
    if (returnTo) {
      // Fire-and-forget; the cookie gets cleared by the auth action.
      recordReturnTo(returnTo).catch(() => {})
    }
  }, [returnTo])

  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center py-6 px-4 md:py-12 bg-bg/50">
      <div className="w-full max-w-[950px] bg-surface border border-line/45 rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row min-h-[550px] transition-all duration-300">
        
        {/* Left Side: Brand Showcase (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-1/2 relative bg-ink text-bg flex-col justify-between p-10 overflow-hidden">
          {/* Decorative background gradients */}
          <span 
            aria-hidden 
            className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20 blur-3xl"
            style={{ background: "rgb(var(--color-accent))" }}
          />
          <span 
            aria-hidden 
            className="absolute -bottom-24 -left-10 w-48 h-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "rgb(var(--color-primary))" }}
          />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              {/* Minimal Logo / Brand Icon */}
              <div className="flex items-center gap-2.5 mb-12">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                  <i className="ph-fill ph-storefront text-white text-lg" aria-hidden />
                </span>
                <span className="font-bold tracking-tight text-lg text-bg">Mobile Store</span>
              </div>
              
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight mb-4 text-bg">
                Unlock the Ultimate Mobile Shopping Experience.
              </h2>
              <p className="text-sm text-bg/60 leading-relaxed mb-8">
                Join our exclusive club to unlock premium benefits, earn loyalty points, and track your orders in real-time.
              </p>
              
              {/* Feature list */}
              <ul className="space-y-4 text-xs font-semibold text-bg/80">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-bg/10 flex items-center justify-center shrink-0">
                    <i className="ph-bold ph-coins text-yellow-400 text-xs" aria-hidden />
                  </span>
                  <span>Earn 10 points instantly upon completing your profile</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-bg/10 flex items-center justify-center shrink-0">
                    <i className="ph-bold ph-truck text-emerald-400 text-xs" aria-hidden />
                  </span>
                  <span>Track shipments with live map integrations</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-bg/10 flex items-center justify-center shrink-0">
                    <i className="ph-bold ph-shield-check text-blue-400 text-xs" aria-hidden />
                  </span>
                  <span>100% Secure Checkout and Easy Returns</span>
                </li>
              </ul>
            </div>
            
            {/* Bottom brand tagline */}
            <div className="text-[11px] text-bg/40 flex items-center justify-between border-t border-bg/10 pt-4 mt-8">
              <span>© 2026 Mobile Store PK</span>
              <span>Premium Auth</span>
            </div>
          </div>
        </div>

        {/* Right Side: The Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-bg relative overflow-hidden">
          {currentView === LOGIN_VIEW.SIGN_IN && (
            <Login setCurrentView={setCurrentView} returnTo={returnTo} />
          )}
          {currentView === LOGIN_VIEW.REGISTER && (
            <Register setCurrentView={setCurrentView} returnTo={returnTo} />
          )}
          {currentView === LOGIN_VIEW.FORGOT && (
            <ForgotPassword setCurrentView={setCurrentView} />
          )}
        </div>

      </div>
    </div>
  )
}

export default LoginTemplate
