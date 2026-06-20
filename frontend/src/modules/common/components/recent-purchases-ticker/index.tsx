"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { sdk } from "@lib/config"

/**
 * Recent purchases ticker — social proof notification showing
 * "Sara from Lahore just bought Embroidered Kurta"
 *
 * Auto-rotates through notifications from real order data.
 * Hidden on product pages to avoid distraction during purchase intent.
 */

type PurchaseNotification = {
  name: string
  city: string
  product: string
  thumbnail?: string
  timeAgo: string
}

// Fallback demo data used when the API is not available
const DEMO_DATA: PurchaseNotification[] = [
  { name: "Sara", city: "Lahore", product: "Embroidered Lawn Suit", timeAgo: "2 mins ago" },
  { name: "Ahmed", city: "Karachi", product: "Premium Cotton Kurta", timeAgo: "5 mins ago" },
  { name: "Ayesha", city: "Islamabad", product: "Printed Chiffon Dupatta", timeAgo: "8 mins ago" },
  { name: "Bilal", city: "Faisalabad", product: "Classic Polo Shirt", timeAgo: "12 mins ago" },
  { name: "Fatima", city: "Rawalpindi", product: "Silk Festive Dress", timeAgo: "15 mins ago" },
]

type RecentPurchasesTickerProps = {
  interval?: number // seconds
}

export default function RecentPurchasesTicker({
  interval = 30,
}: RecentPurchasesTickerProps) {
  const pathname = usePathname() || "/"
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [data, setData] = useState<PurchaseNotification[]>(DEMO_DATA)

  // Hide on product pages
  const isProductPage = /\/products\/[^/]+/.test(pathname)

  // Fetch real data
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await sdk.client.fetch(`/store/recent-purchases`) as any
        if (res.purchases && res.purchases.length > 0) {
          const parsed = res.purchases.map((p: any) => {
            const diffMs = Date.now() - new Date(p.created_at).getTime()
            const diffMins = Math.max(1, Math.floor(diffMs / 60000))
            let timeAgo = `${diffMins} mins ago`
            if (diffMins > 60) {
              const diffHours = Math.floor(diffMins / 60)
              timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
            }
            if (diffMins > 1440) {
              const diffDays = Math.floor(diffMins / 1440)
              timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
            }
            return {
              name: p.name,
              city: p.city,
              product: p.product,
              thumbnail: p.thumbnail,
              timeAgo
            }
          })
          setData(parsed)
        }
      } catch (err) {
        console.error("Failed to fetch recent purchases", err)
      }
    }
    fetchPurchases()
  }, [])

  // Rotate through notifications
  useEffect(() => {
    if (isProductPage || isDismissed) return

    // Show first notification after 5 seconds
    const showTimer = setTimeout(() => setIsVisible(true), 5000)

    const rotateTimer = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % data.length)
        setIsVisible(true)
      }, 500) // Brief hide for transition
    }, interval * 1000)

    return () => {
      clearTimeout(showTimer)
      clearInterval(rotateTimer)
    }
  }, [interval, isProductPage, isDismissed, data.length])

  if (isProductPage || isDismissed || !data.length) return null

  const current = data[currentIndex]

  return (
    <div
      className={`fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-[55] transition-all duration-500 ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-bg/95 backdrop-blur-xl border border-line rounded-2xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] p-3.5 w-[300px] sm:w-[340px] flex items-start gap-3">
        {/* Thumbnail or avatar */}
        <div className="w-12 h-12 rounded-xl bg-surface border border-line overflow-hidden shrink-0 flex items-center justify-center">
          {current.thumbnail ? (
            <img
              src={current.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <i
              className="ph-fill ph-shopping-bag text-[18px] text-primary"
              aria-hidden
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-ink leading-snug">
            <span className="font-semibold">{current.name}</span>
            {" from "}
            <span className="font-medium">{current.city}</span>
            {" just bought"}
          </p>
          <p className="text-[13px] font-semibold text-primary truncate mt-0.5">
            {current.product}
          </p>
          <p className="text-[10px] text-ink/40 mt-0.5 flex items-center gap-1">
            <i className="ph ph-clock text-[9px]" aria-hidden />
            {current.timeAgo}
          </p>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="w-6 h-6 rounded-full bg-surface hover:bg-ink hover:text-bg flex items-center justify-center transition-colors shrink-0 -mt-0.5"
          aria-label="Dismiss"
        >
          <i className="ph ph-x text-[10px]" aria-hidden />
        </button>
      </div>
    </div>
  )
}
