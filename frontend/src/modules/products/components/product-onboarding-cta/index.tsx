"use client"

import { Button, Container, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

/**
 * Medusa demo onboarding banner — only shown when the admin onboarding
 * flow sets `_medusa_onboarding=true`. MUST stay client-side: reading
 * cookies() in a server component poisoned ISR PDP renders with
 * "Page changed from static to dynamic at runtime, reason: cookies".
 */
export default function ProductOnboardingCta() {
  const [isOnboarding, setIsOnboarding] = useState(false)

  useEffect(() => {
    setIsOnboarding(
      document.cookie.split("; ").some((c) => c === "_medusa_onboarding=true")
    )
  }, [])

  if (!isOnboarding) {
    return null
  }

  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full p-8">
      <div className="flex flex-col gap-y-4 center">
        <Text className="text-ui-fg-base text-xl">
          Your demo product was successfully created! 🎉
        </Text>
        <Text className="text-ui-fg-subtle text-small-regular">
          You can now continue setting up your store in the admin.
        </Text>
        <a href="http://localhost:7001/a/orders?onboarding_step=create_order_nextjs">
          <Button className="w-full">Continue setup in admin</Button>
        </a>
      </div>
    </Container>
  )
}
