"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import ProfilePictureUploader from "@modules/account/components/profile-picture-uploader"

/**
 * Profile-page wrapper for the avatar uploader.
 *
 * The profile page is a Server Component, so we need a tiny client
 * island to hold the "current customer" state — otherwise picking a
 * picture wouldn't refresh the on-screen avatar until the user
 * navigated away and back. The wrapper just owns the customer state
 * and forwards onChange callbacks from the underlying uploader.
 */
export default function ProfilePicture({
  customer: initial,
}: {
  customer: HttpTypes.StoreCustomer
}) {
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer>(initial)

  return (
    <div className="w-full" data-testid="account-profile-picture">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="flex flex-col">
          <span className="uppercase text-ui-fg-base text-xs font-semibold tracking-wider">
            Profile picture
          </span>
          <span className="text-[11px] text-ink/55 mt-1">
            Optional — shows on your reviews and order timeline.
          </span>
        </div>
      </div>
      <div className="flex justify-start">
        <ProfilePictureUploader
          customer={customer}
          size={88}
          showHint
          onChange={setCustomer}
        />
      </div>
    </div>
  )
}
