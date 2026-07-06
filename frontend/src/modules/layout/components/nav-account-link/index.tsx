"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useUserData } from "@lib/context/user-data-context"

/**
 * Desktop header account icon. The signed-in indicator dot hydrates
 * client-side from UserDataProvider so the header can render statically.
 */
export default function NavAccountLink() {
  const { customer } = useUserData()

  return (
    <LocalizedClientLink
      href="/account"
      aria-label={customer ? "Account" : "Sign in"}
      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-header-hover text-header-fg hover:text-header-accent transition-all hover:scale-[1.05] relative"
    >
      <i className="ph-bold ph-user text-[20px]" aria-hidden />
      {customer && (
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-success border border-header"
          aria-hidden
        />
      )}
    </LocalizedClientLink>
  )
}
