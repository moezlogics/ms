"use client"

import { useParams } from "next/navigation"
import { signout } from "@lib/data/customer"
import { useTransition } from "react"

/**
 * Mobile-friendly sign-out pill.
 * Same server action the desktop sidebar uses; this just gives the
 * mobile dashboard a visible CTA without crowding the top bar.
 */
export default function SignoutButton({
  className = "",
  label = "Sign out",
}: {
  className?: string
  label?: string
}) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "pk"
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          signout(countryCode)
        })
      }
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 h-11 rounded-full border border-line bg-bg text-ink hover:bg-surface text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      data-testid="logout-button"
    >
      <i className="ph ph-sign-out text-base" aria-hidden />
      {pending ? "Signing out…" : label}
    </button>
  )
}
