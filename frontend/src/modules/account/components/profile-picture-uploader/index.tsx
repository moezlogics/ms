"use client"

import { useRef, useState, useTransition } from "react"
import { HttpTypes } from "@medusajs/types"
import Avatar from "@modules/common/components/avatar"
import { updateCustomer } from "@lib/data/customer"

/**
 * Profile-picture uploader.
 *
 * Renders the customer's current avatar (or the gender / initials
 * fallback) with hover-revealed "Change" + "Remove" controls. Used in
 * the setup wizard, the account dashboard, and the profile page —
 * passed `compact` to swap to a smaller layout for in-page surfaces
 * vs. the wizard's hero treatment.
 *
 * Flow:
 *   1. User picks a file via the hidden <input type="file"> trigger.
 *   2. We POST it through the same-origin /api/avatar/upload proxy
 *      (auth + size + mime checks happen server-side).
 *   3. The proxy returns the CDN URL.
 *   4. We persist `customer.metadata.avatar_url` via the existing
 *      `updateCustomer()` server action so the new picture instantly
 *      surfaces everywhere the helper `getAvatarPropsFromCustomer()`
 *      runs (dashboard, reviews, admin list).
 *
 * Removing nulls the URL but leaves `metadata.avatar_url = null`
 * explicitly so a reviewer / dashboard that was rendering the photo
 * cleanly falls back to the gender or initials avatar.
 */
type Props = {
  customer: HttpTypes.StoreCustomer
  /** Notified whenever the saved customer changes (URL added/cleared). */
  onChange?: (customer: HttpTypes.StoreCustomer) => void
  /** Ring + size variant. Default 96px. */
  size?: number
  /** Show inline copy ("Tap to add a profile picture") under the avatar. */
  showHint?: boolean
}

export default function ProfilePictureUploader({
  customer,
  onChange,
  size = 96,
  showHint = true,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [optimistic, setOptimistic] = useState<string | null>(null)

  const meta = (customer.metadata as any) || {}
  const currentUrl: string | null =
    optimistic ??
    (typeof meta.avatar_url === "string" && meta.avatar_url.trim()
      ? meta.avatar_url.trim()
      : null)
  const gender =
    typeof meta.gender === "string" ? meta.gender.trim().toLowerCase() : null
  const fullName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  const trigger = () => {
    if (pending) return
    fileRef.current?.click()
  }

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file (JPG, PNG, WebP).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be under 5 MB.")
      return
    }

    // Optimistic preview while the upload is in flight.
    const localUrl = URL.createObjectURL(file)
    setOptimistic(localUrl)

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append("image", file)
        const res = await fetch("/api/avatar/upload", {
          method: "POST",
          body: fd,
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json?.error || "Upload failed.")
        }
        const url: string | undefined = json?.data?.url
        if (!url) throw new Error("No URL returned from upload.")

        const updated = await updateCustomer({
          metadata: {
            ...(customer.metadata || {}),
            avatar_url: url,
          },
        } as any)

        // Drop the optimistic blob URL — the server URL is now canonical.
        setOptimistic(null)
        try {
          URL.revokeObjectURL(localUrl)
        } catch {}
        onChange?.(updated as HttpTypes.StoreCustomer)
      } catch (e: any) {
        setOptimistic(null)
        try {
          URL.revokeObjectURL(localUrl)
        } catch {}
        setError(e?.message || "Could not save your picture.")
      } finally {
        // Allow re-selecting the same file again
        if (fileRef.current) fileRef.current.value = ""
      }
    })
  }

  const handleRemove = () => {
    if (pending) return
    if (!currentUrl) return
    setError(null)
    startTransition(async () => {
      try {
        const updated = await updateCustomer({
          metadata: {
            ...(customer.metadata || {}),
            avatar_url: null,
          },
        } as any)
        setOptimistic(null)
        onChange?.(updated as HttpTypes.StoreCustomer)
      } catch (e: any) {
        setError(e?.message || "Could not remove your picture.")
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar
          imageUrl={currentUrl}
          gender={gender}
          name={fullName || customer.email}
          size={size}
          bordered
        />
        {/* Floating edit pill — bottom-right of the avatar */}
        <button
          type="button"
          onClick={trigger}
          disabled={pending}
          aria-label={currentUrl ? "Change profile picture" : "Add profile picture"}
          className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink text-bg shadow-md hover:bg-ink/85 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
          ) : (
            <i className="ph-bold ph-camera text-sm" aria-hidden />
          )}
        </button>
      </div>

      {showHint && (
        <div className="text-center">
          <button
            type="button"
            onClick={trigger}
            disabled={pending}
            className="text-xs font-semibold text-ink hover:text-primary transition-colors"
          >
            {currentUrl ? "Change picture" : "Add a profile picture"}
          </button>
          {currentUrl && (
            <>
              <span className="mx-2 text-ink/30">·</span>
              <button
                type="button"
                onClick={handleRemove}
                disabled={pending}
                className="text-xs font-semibold text-ink/55 hover:text-rose-600 transition-colors"
              >
                Remove
              </button>
            </>
          )}
          <p className="mt-1 text-[11px] text-ink/45">
            Optional · JPG, PNG or WebP under 5&nbsp;MB
          </p>
        </div>
      )}

      {error && (
        <p
          className="text-[11px] text-rose-600 text-center max-w-[220px]"
          role="alert"
        >
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}
