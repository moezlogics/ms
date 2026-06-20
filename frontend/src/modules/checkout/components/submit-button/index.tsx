"use client"

import React from "react"
import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  className,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
  variant?: string
  className?: string
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      data-testid={dataTestId}
      className={
        className ??
        "w-full h-11 rounded-full bg-primary text-primary-fg text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60"
      }
    >
      {pending ? (
        <>
          <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
          Saving…
        </>
      ) : (
        children
      )}
    </button>
  )
}
