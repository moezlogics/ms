"use client"

import dynamic from "next/dynamic"

import { ChatWidgetErrorBoundary } from "@modules/chat-widget/error-boundary"

const PushPromptInner = dynamic(() => import("@modules/push/push-prompt"), { ssr: false })
const ChatWidgetInner = dynamic(() => import("@modules/chat-widget"), { ssr: false })
const SmoothScrollInner = dynamic(() => import("@modules/common/components/smooth-scroll"), { ssr: false })
const TopProgressInner = dynamic(() => import("@modules/common/components/top-progress-bar"), { ssr: false })

export function ClientTopProgress() {
  return <TopProgressInner />
}

export function ClientPushPrompt({ customerId }: { customerId: string | null }) {
  return <PushPromptInner customerId={customerId} />
}

export function ClientChatWidget({
  customerId,
  whatsappNumber,
  whatsappChatbotEnabled,
}: {
  customerId: string | null
  whatsappNumber: string | null
  whatsappChatbotEnabled: boolean
}) {
  return (
    <ChatWidgetErrorBoundary>
      <ChatWidgetInner
        customerId={customerId}
        whatsappNumber={whatsappNumber}
        whatsappChatbotEnabled={whatsappChatbotEnabled}
      />
    </ChatWidgetErrorBoundary>
  )
}

export function ClientSmoothScroll() {
  return <SmoothScrollInner />
}
