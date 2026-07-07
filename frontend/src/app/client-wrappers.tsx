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

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export function ClientChatWidget({
  whatsappNumber,
  whatsappChatbotEnabled,
}: {
  whatsappNumber: string | null
  whatsappChatbotEnabled: boolean
}) {
  const pathname = usePathname()
  const { customer } = useUserData()
  const [isPDP, setIsPDP] = useState(false)
  const [activated, setActivated] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)

  // 1. Check if PDP page
  useEffect(() => {
    const checkPDP = () => {
      const isPdpAttr = typeof document !== "undefined" && document.body.getAttribute("data-page-type") === "pdp"
      const pathPDP = pathname && (pathname.includes("/products/") || pathname.includes("/p/"))
      setIsPDP(!!isPdpAttr || !!pathPDP)
    }

    checkPDP()
    const timer = setTimeout(checkPDP, 80)
    return () => clearTimeout(timer)
  }, [pathname])

  // 2. Event listener for mobile open-ai-chat event & idle timeout activation
  useEffect(() => {
    if (isPDP) return

    const handleMobileOpen = (e: Event) => {
      setActivated(true)
      setAutoOpen(true)
    }

    window.addEventListener("open-ai-chat", handleMobileOpen)

    // Interaction triggers to load scripts before user clicks (e.g. on hover/scroll/touch)
    const loadScript = () => {
      setActivated(true)
      removeListeners()
    }

    const removeListeners = () => {
      window.removeEventListener("scroll", loadScript)
      window.removeEventListener("touchstart", loadScript)
      document.removeEventListener("mousemove", loadScript)
    }

    window.addEventListener("scroll", loadScript, { passive: true })
    window.addEventListener("touchstart", loadScript, { passive: true })
    document.addEventListener("mousemove", loadScript, { passive: true })

    // Idle trigger after 7.5 seconds
    const idleTimer = setTimeout(() => {
      setActivated(true)
      removeListeners()
    }, 7500)

    return () => {
      window.removeEventListener("open-ai-chat", handleMobileOpen)
      removeListeners()
      clearTimeout(idleTimer)
    }
  }, [isPDP])

  // If this is a PDP page, do not render Zizu at all (zero script loading)
  if (isPDP) {
    return null
  }

  // Render chatbot widget once activated
  if (activated) {
    return (
      <ChatWidgetErrorBoundary>
        <ChatWidgetInner
          customerId={customer?.id || null}
          whatsappNumber={whatsappNumber}
          whatsappChatbotEnabled={whatsappChatbotEnabled}
          initialOpen={autoOpen}
        />
      </ChatWidgetErrorBoundary>
    )
  }

  // Pre-activation desktop trigger mockup to avoid layout shift (CLS)
  return (
    <div className="hidden small:flex fixed bottom-6 right-6 z-[59] items-center justify-center">
      <span
        style={{
          position: "absolute",
          inset: "-4px",
          borderRadius: "50%",
          animation: "chatGlowPulse 2.5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <button
        type="button"
        aria-label="Open chat"
        onClick={() => {
          setActivated(true)
          setAutoOpen(true)
        }}
        onMouseEnter={() => setActivated(true)}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all"
        style={{
          background: "var(--hex-primary)",
          color: "var(--hex-primary-fg)",
        }}
      >
        <i className="ph-fill ph-headset text-[22px]" aria-hidden />
      </button>

      <style>{`
        @keyframes chatGlowPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--hex-primary) 40%, transparent);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 10px color-mix(in srgb, var(--hex-primary) 0%, transparent);
            transform: scale(1.06);
          }
        }
      `}</style>
    </div>
  )
}

export function ClientSmoothScroll() {
  return <SmoothScrollInner />
}

