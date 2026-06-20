"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"

/**
 * Floating WhatsApp chat widget — bottom-right green bubble.
 *
 * Appears on ALL pages EXCEPT single product pages (where the
 * inline "Order on WhatsApp" button handles it instead).
 *
 * Animated pulse ring + tooltip on hover. Click opens WhatsApp
 * with a pre-filled generic message.
 */
type WhatsAppWidgetProps = {
  whatsappNumber: string
}

export default function WhatsAppWidget({ whatsappNumber }: WhatsAppWidgetProps) {
  const pathname = usePathname() || "/"
  const [showTooltip, setShowTooltip] = useState(false)

  // Hide on single product pages (URL contains /products/)
  const isProductPage = /\/products\/[^/]+/.test(pathname)
  if (isProductPage) return null

  const message = encodeURIComponent("Hi! I need help with my order.")
  const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9+]/g, "")}?text=${message}`

  return (
    <div
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[60] flex flex-col items-end gap-2"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      <div
        className={`transition-all duration-200 ${
          showTooltip
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 pointer-events-none"
        }`}
      >
        <div className="bg-ink text-bg text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
          Chat with us
          <div
            className="absolute -bottom-1 right-5 w-2 h-2 bg-ink rotate-45"
            aria-hidden
          />
        </div>
      </div>

      {/* Button */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(37,211,102,0.6)] hover:shadow-[0_8px_30px_-4px_rgba(37,211,102,0.7)] hover:scale-110 active:scale-95 transition-all duration-200"
        style={{ backgroundColor: "#25D366" }}
      >
        {/* Pulse ring */}
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: "#25D366" }}
          aria-hidden
        />
        {/* Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="#ffffff"
          className="w-7 h-7 relative z-10"
          aria-hidden
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  )
}
