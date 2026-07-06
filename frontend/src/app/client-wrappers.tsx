"use client"

import dynamic from "next/dynamic"

import { ChatWidgetErrorBoundary } from "@modules/chat-widget/error-boundary"
import { useUserData } from "@lib/context/user-data-context"

const PushPromptInner = dynamic(() => import("@modules/push/push-prompt"), { ssr: false })
const ChatWidgetInner = dynamic(() => import("@modules/chat-widget"), { ssr: false })
const SmoothScrollInner = dynamic(() => import("@modules/common/components/smooth-scroll"), { ssr: false })
const TopProgressInner = dynamic(() => import("@modules/common/components/top-progress-bar"), { ssr: false })

export function ClientTopProgress() {
  return <TopProgressInner />
}

export function ClientPushPrompt() {
  const { customer } = useUserData()
  return <PushPromptInner customerId={customer?.id || null} />
}

export function ClientChatWidget({
  whatsappNumber,
  whatsappChatbotEnabled,
}: {
  whatsappNumber: string | null
  whatsappChatbotEnabled: boolean
}) {
  const { customer } = useUserData()
  return (
    <ChatWidgetErrorBoundary>
      <ChatWidgetInner
        customerId={customer?.id || null}
        whatsappNumber={whatsappNumber}
        whatsappChatbotEnabled={whatsappChatbotEnabled}
      />
    </ChatWidgetErrorBoundary>
  )
}

export function ClientSmoothScroll() {
  return <SmoothScrollInner />
}
