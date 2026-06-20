"use client"

import React from "react"
import { HttpTypes } from "@medusajs/types"
type Props = {
  customer: HttpTypes.StoreCustomer
}

/**
 * Read-only email display.
 *
 * We deliberately don't let customers change the email on their own
 * account from the profile page:
 *   • Email IS the auth identity for both email-password and Google
 *     sign-in. Letting it move silently breaks future logins —
 *     especially for Google-linked accounts where the OAuth identity
 *     is keyed off the original address.
 *   • Old orders, OTP audit log and the loyalty ledger reference the
 *     account by id, but humans recognise it by email — a surprise
 *     change makes support tickets a mess.
 *   • Doing it properly needs a re-verification flow (OTP to the OLD
 *     address, then verify the NEW one) that we don't have UI for
 *     yet, so the safe answer is "no edit here".
 *
 * If a customer genuinely needs to switch addresses, they reach out
 * to support and we move the account on the backend.
 */
export default function ProfileEmail({ customer }: Props) {
  return (
    <div className="w-full" data-testid="account-email-editor">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="uppercase text-ui-fg-base text-xs font-semibold tracking-wider">
            Email
          </span>
          <span
            className="font-semibold text-ink truncate mt-1"
            data-testid="current-info"
          >
            {customer.email}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink/55 px-2.5 py-1 rounded-full bg-surface border border-line">
          <i className="ph-fill ph-lock-key text-[11px]" aria-hidden />
          Locked
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink/45 leading-relaxed max-w-md">
        Your email is also your sign-in. To change it, please contact
        support — we'll re-verify the new address before switching.
      </p>
    </div>
  )
}
