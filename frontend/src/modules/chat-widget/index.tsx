"use client"

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react"
import { usePathname } from "next/navigation"
import {
  startChatSession,
  sendChatMessage,
  type ChatMessage,
} from "@lib/data/chat"
import { confirmChatOrder } from "@lib/data/chat-actions"
import { listProducts } from "@lib/data/products"
import Thumbnail from "@modules/products/components/thumbnail"
import { useSiteSettings } from "@lib/context/site-settings-context"

const ZIZU_AVATAR = "https://cdn.zmobiles.pk/uploads/2026/06/7551268b-d645-4cbc-a802-ae3d94f96df4-aoFCInV_.webp"

const STORAGE_KEY = "ai-chat:visitor-token"
const SESSION_KEY = "ai-chat:session-id"

type SuggestionCard = {
  title: string
  subtitle: string
  icon: string
  prompt: string
}

const PREMIUM_SUGGESTIONS: SuggestionCard[] = [
  {
    title: "Phones with 8GB RAM",
    subtitle: "Filter by specs & features",
    icon: "ph-bold ph-memory",
    prompt: "Show me phones with 8GB RAM that are available",
  },
  {
    title: "Best phone under 50,000",
    subtitle: "Top picks in your budget",
    icon: "ph-bold ph-coins",
    prompt: "What is the best phone under 50,000 PKR?",
  },
  {
    title: "PTA approved phones",
    subtitle: "Registration & tax details",
    icon: "ph-bold ph-shield-check",
    prompt: "Show me PTA approved phones",
  },
  {
    title: "Cash on Delivery info",
    subtitle: "Payment & delivery details",
    icon: "ph-bold ph-money",
    prompt: "Is cash on delivery available? How long does delivery take?",
  },
  {
    title: "Best phone for gaming",
    subtitle: "Smooth & high FPS phones",
    icon: "ph-bold ph-game-controller",
    prompt: "What is the best phone for gaming and PUBG?",
  },
  {
    title: "Track my order",
    subtitle: "Check delivery status",
    icon: "ph-bold ph-package",
    prompt: "I want to track my order",
  },
]

type AssistantMeta = {
  products?: Array<{
    id: string
    handle: string
    title: string
    thumbnail: string | null
    brand: string | null
    pack_size: string | null
    variant_id: string | null
    price: number | null
    currency: string | null
  }>
  actions?: Array<
    | { type: "added_to_cart"; title: string; quantity: number }
    | { type: "view_cart" }
    | { type: "checkout" }
    | { type: "sign_in_required" }
    | { type: "confirm_order"; cart_id: string }
    | { type: "collect_info"; missing?: string[] }
    | { type: "whatsapp"; url: string; label?: string }
    | { type: "contact_page" }
  >
}

function parseMeta(raw: string | null): AssistantMeta | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AssistantMeta
  } catch {
    return null
  }
}

/**
 * Context-aware follow-up suggestions shown under each assistant reply.
 * Always returns at least a few friendly English chips so the shopper has
 * an obvious next step on every answer — derived purely client-side (zero
 * latency) from the reply text + any product cards it carried.
 */
function getFollowUps(content: string, meta: AssistantMeta | null): string[] {
  const c = (content || "").toLowerCase()
  const has = (...k: string[]) => k.some((x) => c.includes(x))
  const products = meta?.products?.length || 0

  const out: string[] = []
  const add = (s: string) => {
    if (s && !out.includes(s)) out.push(s)
  }

  if (products >= 2) {
    add("Compare these phones")
    if (has("gaming", "pubg", "fps", "game")) add("Which is best for gaming?")
    if (has("camera", "mp", "megapixel")) add("Which has the best camera?")
    if (has("battery", "mah")) add("Which has the biggest battery?")
    add("Show cheaper options")
    add("Which one do you recommend?")
  } else if (products === 1) {
    add("Is it PTA approved?")
    add("Is it in stock?")
    add("Show similar phones")
    add("Is cash on delivery available?")
  } else if (has("order", "track", "delivery", "shipment", "parcel")) {
    add("Track another order")
    add("What are the delivery charges?")
    add("Talk to support on WhatsApp")
  } else if (has("pta", "approved", "tax")) {
    add("Show PTA approved phones")
    add("Best phones under 50,000")
    add("Show 8GB RAM phones")
  } else {
    add("Best phones under 50,000")
    add("Show 8GB RAM phones")
    add("Latest mobiles in stock")
    add("Talk to a human")
  }

  return out.slice(0, 4)
}

function formatMoney(amount: number, currency: string | null) {
  const cur = (currency || "PKR").toUpperCase()
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${cur} ${amount.toFixed(0)}`
  }
}

export default function ChatWidget({
  customerId,
  whatsappNumber,
  whatsappChatbotEnabled = true,
}: {
  customerId?: string | null
  whatsappNumber?: string | null
  whatsappChatbotEnabled?: boolean
}) {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const [cartId, setCartId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [hasUnread, setHasUnread] = useState(false)

  type Attachment = {
    id: string
    name: string
    type: "image" | "pdf"
    url: string
    text?: string
    loading?: boolean
  }

  const [attachments, setAttachments] = useState<Attachment[]>([])

  const [showTeaser, setShowTeaser] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<any | null>(null)

  const [keyboardHeightOffset, setKeyboardHeightOffset] = useState(0)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const initRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const latestMessageIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [hasBeenOpened, setHasBeenOpened] = useState(false)

  // Dragging state for desktop trigger
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [wasDragged, setWasDragged] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const pathname = usePathname() || "/"
  const hide = /\/checkout|\/admin/i.test(pathname)

  const segments = useMemo(() => pathname.split("/").filter(Boolean), [pathname])
  const productHandle = useMemo(() => {
    const idx = segments.indexOf("products")
    return idx !== -1 && segments[idx + 1] ? segments[idx + 1] : null
  }, [segments])

  const countryCode = useMemo(() => {
    return segments[0] && segments[0].length === 2 ? segments[0] : "pk"
  }, [segments])

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  // Fetch Cart ID lazily
  const fetchCartId = async (): Promise<string | null> => {
    try {
      const { getCurrentCartId } = await import("@lib/data/cart")
      const id = (await getCurrentCartId()) || null
      setCartId(id)
      return id
    } catch {
      return null
    }
  }

  // Fetch current product context from PDP pages
  useEffect(() => {
    if (!productHandle) {
      setCurrentProduct(null)
      return
    }

    let active = true
    listProducts({
      countryCode,
      queryParams: { handle: productHandle, limit: 1 },
    })
      .then(({ response }) => {
        if (active && response.products.length > 0) {
          setCurrentProduct(response.products[0])
        }
      })
      .catch((err) => {
        console.error("Failed to fetch current product details for chat context:", err)
      })

    return () => {
      active = false
    }
  }, [productHandle, countryCode])

  // Mobile Keyboard Resize Support via VisualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return

    const handleViewportChange = () => {
      const vv = window.visualViewport
      if (!vv) return

      const windowHeight = window.innerHeight
      const offset = windowHeight - vv.height
      setKeyboardHeightOffset(offset > 60 ? offset : 0)
      setViewportHeight(vv.height)
    }

    window.visualViewport.addEventListener("resize", handleViewportChange)
    window.visualViewport.addEventListener("scroll", handleViewportChange)

    handleViewportChange()

    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange)
      window.visualViewport?.removeEventListener("scroll", handleViewportChange)
    }
  }, [])

  // Floating teaser bubble
  useEffect(() => {
    const t1 = setTimeout(() => {
      if (!open) setShowTeaser(true)
    }, 4500)
    const t2 = setTimeout(() => setShowTeaser(false), 12500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [open])

  const ensureSession = async () => {
    if (sessionId) return sessionId
    let token: string | null = null
    try {
      token = localStorage.getItem(STORAGE_KEY)
      if (!token) {
        token =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36)
        localStorage.setItem(STORAGE_KEY, token)
      }
    } catch {}

    const { session, messages: prior } = await startChatSession(
      token,
      customerId || null
    )
    try {
      localStorage.setItem(SESSION_KEY, session.id)
    } catch {}
    setSessionId(session.id)
    setMessages(prior || [])
    return session.id
  }

  useEffect(() => {
    if (!open || initRef.current) return
    initRef.current = true
    ensureSession().catch((e) =>
      setError(e?.message || "Couldn't start chat")
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Scroll to bottom
  useEffect(() => {
    if (!open || userHasScrolledUp) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open, userHasScrolledUp])

  useEffect(() => {
    setHasUnread(false)
    if (open && !hasBeenOpened) setHasBeenOpened(true)
  }, [open, hasBeenOpened])

  // Body scroll lock - prevent website scrolling when chat is open
  useEffect(() => {
    if (!open) return

    const isMobile = window.matchMedia("(max-width: 639px)").matches
    const scrollY = window.scrollY

    const prevOverflow = document.body.style.overflow
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const prevWidth = document.body.style.width

    if (isMobile) {
      // Mobile: position:fixed to prevent iOS bounce scroll
      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = "100%"
    } else {
      // Desktop: simple overflow hidden
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.position = prevPosition
      document.body.style.top = prevTop
      document.body.style.width = prevWidth
      if (isMobile) window.scrollTo(0, scrollY)
    }
  }, [open])

  // History API integration - close chat on browser/hardware back button
  useEffect(() => {
    if (typeof window === "undefined") return

    const handlePopState = () => {
      if (open) {
        setOpen(false)
      }
    }

    if (open) {
      if (window.history.state?.chatOpen !== true) {
        window.history.pushState({ chatOpen: true }, "")
      }
      window.addEventListener("popstate", handlePopState)
    } else {
      if (window.history.state?.chatOpen === true) {
        window.history.back()
      }
    }

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [open])

  // Toggle sync with mobile footer
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { open?: boolean } | undefined
      if (detail && typeof detail.open === "boolean") {
        setOpen(detail.open)
      } else {
        setOpen((v) => !v)
      }
    }
    window.addEventListener("open-ai-chat", handler as EventListener)
    return () =>
      window.removeEventListener("open-ai-chat", handler as EventListener)
  }, [])

  // Close on mobile search
  useEffect(() => {
    const handleSearchOpen = () => setOpen(false)
    window.addEventListener("open-mobile-search", handleSearchOpen)
    return () =>
      window.removeEventListener("open-mobile-search", handleSearchOpen)
  }, [])

  // Close on pathname change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Textarea resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px"
      const sh = textareaRef.current.scrollHeight
      textareaRef.current.style.height = Math.min(sh, 120) + "px"
    }
  }, [input])

  const handleNewChat = () => {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {}
    setSessionId(null)
    setMessages([])
    setInput("")
    setError(null)
    initRef.current = false
    ensureSession().catch((e) => setError(e?.message || "Couldn't start chat"))
  }

  const handleDeleteChat = () => {
    try {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setSessionId(null)
    setMessages([])
    setInput("")
    setAttachments([])
    setError(null)
    initRef.current = false
  }

  const triggerFileSelect = () => {
    document.getElementById("chat-file-input")?.click()
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files
    if (!filesList || filesList.length === 0) return

    const fileArray = Array.from(filesList)
    e.target.value = ""

    for (const file of fileArray) {
      const isImage = file.type.startsWith("image/")
      const isPdf = file.type === "application/pdf"

      if (!isImage && !isPdf) {
        showToast("Only images and PDFs are supported", "error")
        continue
      }

      const id = Math.random().toString(36).substring(2) + Date.now().toString(36)
      const newAttachment: Attachment = {
        id,
        name: file.name,
        type: isImage ? "image" : "pdf",
        url: "",
        loading: true,
      }
      setAttachments((prev) => [...prev, newAttachment])

      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/chat/upload-media", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to upload file")
        }

        const data = await res.json()
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  url: data.url || "",
                  text: data.text || undefined,
                  loading: false,
                }
              : a
          )
        )
      } catch (err: any) {
        console.error("File upload error:", err)
        showToast(err.message || "Failed to upload file", "error")
        setAttachments((prev) => prev.filter((a) => a.id !== id))
      }
    }
  }

  // Cancel any in-flight request on unmount so we don't try to
  // setState on an unmounted component.
  useEffect(() => {
    return () => {
      abortRef.current?.abort("unmount")
    }
  }, [])

  const onSend = async (text?: string) => {
    setError(null)
    const content = (text ?? input).trim()
    if (!content && attachments.length === 0) return
    if (isSending) return // prevent double-send

    const sid = await ensureSession()
    if (!sid) return

    const imagesPayload = attachments
      .filter((a) => a.type === "image" && a.url)
      .map((a) => a.url)

    const filesPayload = attachments
      .filter((a) => a.type === "pdf" && a.url)
      .map((a) => ({ name: a.name, text: a.text || "", url: a.url }))

    const optimisticMeta = {
      images: imagesPayload,
      files: filesPayload,
    }

    const tempId = "tmp-" + Date.now()
    const optimistic: ChatMessage = {
      id: tempId,
      session_id: sid,
      role: "user",
      content,
      metadata: Object.keys(optimisticMeta).length ? JSON.stringify(optimisticMeta) : null,
      created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    setInput("")
    setAttachments([])
    setUserHasScrolledUp(false)

    // Cancel any previous in-flight request
    abortRef.current?.abort("new-message")
    const controller = new AbortController()
    abortRef.current = controller

    setIsSending(true)
    try {
      const liveCartId = await fetchCartId()
      const r = await sendChatMessage(
        {
          session_id: sid,
          content,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          cart_id: liveCartId,
          images: imagesPayload,
          files: filesPayload,
        },
        controller.signal
      )

      // Check if aborted between await and setState
      if (controller.signal.aborted) return

      latestMessageIdRef.current = r.message.id
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId)
        return [...filtered, r.user_message, r.message]
      })
      if (!open) setHasUnread(true)
    } catch (e: any) {
      // Don't show errors for intentional cancellations
      if (controller.signal.aborted) return
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError(e?.message || "Failed to send message")
    } finally {
      if (!controller.signal.aborted) {
        setIsSending(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setWasDragged(false)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setWasDragged(true)
    setPosition({
      x: dragStart.current.posX + dx,
      y: dragStart.current.posY + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    setUserHasScrolledUp(!isAtBottom)
  }

  const handleAddToCart = async (variantId: string, title: string) => {
    if (!variantId) return
    setAddingId(variantId)
    try {
      const { addToCart } = await import("@lib/data/cart")
      await addToCart({ variantId, quantity: 1 })
      window.dispatchEvent(new Event("cart-updated"))
      showToast(`Added ${title} to cart!`, "success")
    } catch (e: any) {
      showToast(e.message || `Could not add ${title} to cart`, "error")
    } finally {
      setAddingId(null)
    }
  }

  const handleBuyNow = async (variantId: string, title: string) => {
    if (!variantId) return
    setAddingId(variantId)
    try {
      const { addToCart } = await import("@lib/data/cart")
      await addToCart({ variantId, quantity: 1 })
      window.dispatchEvent(new Event("cart-updated"))
      window.location.href = "/checkout"
    } catch (e: any) {
      showToast(e.message || `Could not checkout ${title}`, "error")
    } finally {
      setAddingId(null)
    }
  }

  const suggestionsToRender = useMemo(() => {
    if (currentProduct) {
      return [
        {
          title: `Is this phone PTA approved?`,
          subtitle: "Tax & registration details",
          icon: "ph-bold ph-shield-check",
          prompt: `Is the ${currentProduct.title} PTA approved or active?`,
        },
        {
          title: `Full specs of this phone`,
          subtitle: "Processor, camera & battery",
          icon: "ph-bold ph-info",
          prompt: `What are the full specifications of the ${currentProduct.title}?`,
        },
        {
          title: "Check stock & availability",
          subtitle: "Colors, variants & delivery",
          icon: "ph-bold ph-check-circle",
          prompt: `Is the ${currentProduct.title} in stock and ready to ship?`,
        },
      ]
    }
    return PREMIUM_SUGGESTIONS
  }, [currentProduct])

  if (hide) return null

  const wpNum = whatsappNumber?.replace(/\D/g, "")

  return (
    <>
      {/* Teaser Message Bubble */}
      {!open && showTeaser && (
        <div
          className="hidden small:flex fixed bottom-24 right-6 z-[59] items-center gap-2.5 shadow-xl px-4 py-2.5 rounded-2xl max-w-xs"
          style={{
            background: "var(--hex-bg)",
            border: "1px solid var(--hex-border)",
            animation: "chatTeaser 600ms cubic-bezier(0.16,1,0.3,1) forwards",
            backdropFilter: "blur(12px)",
          }}
        >
          <img
            src={ZIZU_AVATAR}
            alt="Zizu"
            className="w-7 h-7 rounded-full object-cover shrink-0"
            style={{ border: "2px solid var(--hex-primary)" }}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--hex-text)" }}
          >
            Hi! I'm Zizu — need help finding a phone?
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowTeaser(false)
            }}
            className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center transition-all active:scale-90 opacity-40 hover:opacity-100"
            style={{ color: "var(--hex-text)" }}
            aria-label="Close teaser"
          >
            <i className="ph-bold ph-x text-[11px]" />
          </button>
        </div>
      )}

      {/* Desktop Floating Trigger Button */}
      {/* Desktop Floating Trigger — Zizu Avatar with Glow Pulse */}
      <div
        className={`hidden small:flex fixed bottom-6 right-6 z-[59] items-center justify-center cursor-move ${
          open ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100"
        }`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: "none",
          transition: isDragging
            ? "none"
            : "opacity 300ms ease, transform 300ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Glow ring behind */}
        <span className="zizu-trigger-glow" />
        <button
          type="button"
          aria-label={open ? "Close chat" : "Open chat"}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={(e) => {
            if (wasDragged) {
              e.preventDefault()
              return
            }
            setOpen((v) => !v)
          }}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-90 transition-all"
          style={{
            background: "var(--hex-primary)",
            color: "var(--hex-primary-fg)",
          }}
        >
          <i className="ph-fill ph-headset text-[22px]" aria-hidden />
          {hasUnread && !open && (
            <span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
              style={{
                background: "var(--hex-danger)",
                borderColor: "var(--hex-bg)",
                animation: "chatPulse 2s ease-in-out infinite",
              }}
            />
          )}
        </button>
      </div>

      {/* Main Chat Sheet - only mount after first open */}
      {hasBeenOpened && (
      <div
        className={`chat-sheet-wrapper ${
          open ? "chat-open" : "chat-closed"
        }`}
        style={
          (typeof window !== "undefined" && window.innerWidth < 640 && keyboardHeightOffset > 0)
            ? {
                bottom: `${keyboardHeightOffset}px`,
                height: `${viewportHeight ? viewportHeight : 500}px`,
                top: "auto",
              }
            : undefined
        }
      >
        <div
          className="flex flex-col overflow-hidden h-full sm:h-[min(82vh,700px)] sm:rounded-3xl shadow-2xl relative"
          style={{
            background: "var(--hex-bg)",
            border: "1px solid var(--hex-border)",
            boxShadow: "0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px var(--hex-border)",
          }}
        >
          {/* Header — Glassmorphism */}
          <div
            className="px-4 py-3 flex items-center gap-3 select-none shrink-0 relative z-10"
            style={{
              borderBottom: "1px solid var(--hex-border)",
              background: "color-mix(in srgb, var(--hex-surface) 85%, transparent)",
              backdropFilter: "blur(16px) saturate(1.5)",
              WebkitBackdropFilter: "blur(16px) saturate(1.5)",
              paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
            }}
          >
            {/* Zizu Avatar */}
            <div className="relative shrink-0">
              <img
                src={ZIZU_AVATAR}
                alt="Zizu"
                className="w-10 h-10 rounded-full object-cover"
                style={{
                  border: "2px solid var(--hex-primary)",
                  boxShadow: "0 0 12px color-mix(in srgb, var(--hex-primary) 30%, transparent)",
                }}
              />
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: "var(--hex-success)",
                  borderColor: "var(--hex-surface)",
                  boxShadow: "0 0 6px var(--hex-success)",
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-[15px] font-bold leading-none tracking-tight"
                style={{ color: "var(--hex-text)" }}
              >
                Zizu
              </p>
              <p
                className="text-[11px] font-semibold leading-none mt-1.5 flex items-center gap-1.5"
                style={{ color: "var(--hex-success)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{
                    background: "var(--hex-success)",
                    animation: "chatPulse 2s ease-in-out infinite",
                    boxShadow: "0 0 4px var(--hex-success)",
                  }}
                />
                Online
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5">
              {wpNum && whatsappChatbotEnabled && (
                <a
                  href={`https://wa.me/${wpNum}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center chat-hdr-btn shadow-sm"
                  title="Contact on WhatsApp"
                  style={{
                    background: "var(--hex-surface)",
                    border: "1px solid var(--hex-border)",
                    color: "#25D366",
                  }}
                >
                  <i className="ph-fill ph-whatsapp-logo text-[20px]" aria-hidden />
                </a>
              )}

              <button
                type="button"
                onClick={handleNewChat}
                title="New chat"
                className="w-10 h-10 rounded-full flex items-center justify-center chat-hdr-btn shadow-sm"
                style={{
                  background: "var(--hex-surface)",
                  border: "1px solid var(--hex-border)",
                  color: "var(--hex-text)",
                }}
              >
                <i className="ph-bold ph-plus text-lg" aria-hidden />
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteChat}
                  title="Clear chat"
                  className="w-10 h-10 rounded-full flex items-center justify-center chat-hdr-btn shadow-sm"
                  style={{
                    background: "var(--hex-surface)",
                    border: "1px solid var(--hex-border)",
                    color: "var(--hex-danger)",
                  }}
                >
                  <i className="ph-bold ph-trash text-lg" aria-hidden />
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-10 h-10 rounded-full flex items-center justify-center chat-hdr-btn shadow-sm"
                style={{
                  background: "var(--hex-primary)",
                  color: "var(--hex-primary-fg)",
                }}
              >
                <i className="ph-bold ph-x text-lg" aria-hidden />
              </button>
            </div>
          </div>

          {/* Toast Notifications */}
          {toastMessage && (
            <div
              className="absolute top-[56px] inset-x-3 z-50 px-4 py-2.5 rounded-2xl text-[13px] font-semibold flex items-center justify-between shadow-lg"
              style={{
                background: toastMessage.type === "success" ? "var(--hex-success)" : "var(--hex-danger)",
                color: "#fff",
                animation: "chatSlideDown 300ms cubic-bezier(0.16,1,0.3,1) forwards",
              }}
            >
              <div className="flex items-center gap-2">
                <i
                  className={
                    toastMessage.type === "success"
                      ? "ph-bold ph-check-circle text-sm"
                      : "ph-bold ph-warning-circle text-sm"
                  }
                />
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="w-8 h-8 -mr-2 rounded-full flex items-center justify-center transition-all active:scale-90 opacity-70 hover:opacity-100"
                aria-label="Close toast"
              >
                <i className="ph-bold ph-x text-[11px]" />
              </button>
            </div>
          )}

          {/* Scroll Up indicator */}
          {userHasScrolledUp && (
            <button
              type="button"
              onClick={() => {
                setUserHasScrolledUp(false)
                const el = scrollRef.current
                if (el) el.scrollTop = el.scrollHeight
              }}
              className="absolute bottom-[88px] right-4 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold shadow-lg active:scale-95 transition-all"
              style={{
                background: "var(--hex-primary)",
                color: "var(--hex-primary-fg)",
                animation: "chatBounceIn 350ms cubic-bezier(0.34,1.56,0.64,1) forwards",
                boxShadow: "0 4px 16px color-mix(in srgb, var(--hex-primary) 30%, transparent)",
              }}
            >
              <i className="ph-bold ph-arrow-down text-[10px]" />
              Latest
            </button>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth"
            style={{
              overscrollBehavior: "contain",
              background: "var(--hex-bg)",
            }}
          >
            {messages.length === 0 && !isSending ? (
              <div
                className="flex flex-col py-2 space-y-5"
                style={{ animation: "chatFadeIn 400ms ease forwards" }}
              >
                {/* Welcome Banner — Premium Zizu */}
                <div
                  className="relative rounded-3xl p-6 text-center overflow-hidden"
                  style={{ background: "var(--hex-surface)" }}
                >
                  {/* Animated gradient mesh orb */}
                  <div className="chat-orb" />
                  <div className="zizu-welcome-glow" />

                  <div className="flex flex-col items-center gap-4 relative z-10">
                    {/* Zizu Avatar with glow ring */}
                    <div className="relative" style={{ animation: "chatBounceIn 600ms cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                      <img
                        src={ZIZU_AVATAR}
                        alt="Zizu"
                        className="w-16 h-16 rounded-full object-cover"
                        style={{
                          border: "3px solid var(--hex-primary)",
                          boxShadow: "0 0 20px color-mix(in srgb, var(--hex-primary) 35%, transparent), 0 4px 16px rgba(0,0,0,0.1)",
                        }}
                      />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] flex items-center justify-center"
                        style={{
                          background: "var(--hex-success)",
                          borderColor: "var(--hex-surface)",
                          boxShadow: "0 0 8px var(--hex-success)",
                          animation: "chatPulse 2s ease-in-out infinite",
                        }}
                      >
                        <i className="ph-bold ph-check text-[6px] text-white" />
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p
                        className="text-lg font-bold leading-tight"
                        style={{ color: "var(--hex-text)" }}
                      >
                        Salaam! Main <span style={{ color: "var(--hex-primary)" }}>Zizu</span> hun 👋
                      </p>
                      <p
                        className="text-[13px] leading-relaxed max-w-[300px] mx-auto"
                        style={{ color: "var(--hex-text-muted)" }}
                      >
                        Phones, specs, prices, comparisons — jo bhi chahiye, puchh lo!
                      </p>
                    </div>
                  </div>
                </div>

                {/* PDP Context Banner */}
                {currentProduct && (
                  <div
                    className="p-3 rounded-2xl flex items-center gap-3 select-none"
                    style={{
                      background: "var(--hex-surface)",
                      border: "1px solid var(--hex-border)",
                      animation: "chatFadeIn 300ms ease forwards",
                    }}
                  >
                    {currentProduct.thumbnail && (
                      <div
                        className={`w-10 rounded-xl overflow-hidden shrink-0 ${globalAspectClass}`}
                        style={{ border: "1px solid var(--hex-border)" }}
                      >
                        <Thumbnail thumbnail={currentProduct.thumbnail} size="full" alt={currentProduct.title} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--hex-text-muted)" }}
                      >
                        Currently Viewing
                      </p>
                      <p
                        className="text-[13px] font-semibold truncate mt-0.5"
                        style={{ color: "var(--hex-text)" }}
                      >
                        {currentProduct.title}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
                      style={{
                        background: "var(--hex-primary)",
                        color: "var(--hex-primary-fg)",
                      }}
                    >
                      Context
                    </span>
                  </div>
                )}

                {/* Suggestion Cards — Premium with Shine Effect */}
                <div className="flex flex-col gap-2.5 w-full">
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider pl-1"
                    style={{ color: "var(--hex-text-muted)", opacity: 0.6 }}
                  >
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestionsToRender.map((s, idx) => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => onSend(s.prompt)}
                        className="zizu-suggestion-card flex flex-col items-start gap-2 p-3 rounded-2xl text-left group transition-all active:scale-[0.97] relative overflow-hidden"
                        style={{
                          background: "var(--hex-surface)",
                          border: "1px solid var(--hex-border)",
                          animationDelay: `${idx * 80}ms`,
                          animation: "chatBounceIn 400ms cubic-bezier(0.34,1.56,0.64,1) forwards",
                          opacity: 0,
                          animationFillMode: "forwards",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--hex-primary)"
                          ;(e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
                          ;(e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px -4px color-mix(in srgb, var(--hex-primary) 15%, transparent)"
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--hex-border)"
                          ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
                          ;(e.currentTarget as HTMLElement).style.boxShadow = "none"
                        }}
                      >
                        {/* Shine sweep overlay */}
                        <span className="zizu-shine" />
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                          style={{
                            background: "var(--hex-bg)",
                            color: "var(--hex-text-muted)",
                          }}
                        >
                          <i className={`${s.icon} text-base`} />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-semibold leading-tight"
                            style={{ color: "var(--hex-text)" }}
                          >
                            {s.title}
                          </p>
                          <p
                            className="text-[10px] mt-0.5 leading-snug"
                            style={{ color: "var(--hex-text-muted)" }}
                          >
                            {s.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m, mi) => (
                <MessageRow
                  key={m.id}
                  message={m}
                  shouldAnimate={m.id === latestMessageIdRef.current}
                  isLast={mi === messages.length - 1}
                  addingId={addingId}
                  globalAspectClass={globalAspectClass}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  onSuggest={(prompt: string) => onSend(prompt)}
                  onAction={async (a: any) => {
                    if (a?.type === "checkout") window.location.href = "/checkout"
                    else if (a?.type === "view_cart") window.location.href = "/cart"
                    else if (a?.type === "sign_in_required") window.location.href = "/account"
                    else if (a?.type === "contact_page") window.location.href = "/contact"
                    else if (a?.type === "whatsapp" && a.url) window.open(a.url, "_blank", "noopener")
                    else if (a?.type === "confirm_order" && a.cart_id) {
                      const r = await confirmChatOrder(a.cart_id)
                      if (r.redirect) window.location.href = r.redirect
                      else showToast(r.message || "Could not place the order.", "error")
                    }
                  }}
                />
              ))
            )}

            {/* Action Log */}
            <ActionLog pending={isSending} />

            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-2xl text-[13px] font-semibold"
                style={{
                  background: "var(--hex-danger)",
                  color: "#fff",
                  animation: "chatFadeIn 250ms ease forwards",
                }}
              >
                <i className="ph-bold ph-warning-circle text-sm" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Composer */}
          <div
            className="p-3 shrink-0"
            style={{
              borderTop: "1px solid var(--hex-border)",
              background: "var(--hex-bg)",
              paddingBottom: keyboardHeightOffset > 0
                ? "12px"
                : "calc(12px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <form
              className="flex flex-col gap-1.5 rounded-[22px] p-1.5 transition-all w-full"
              style={{
                background: "var(--hex-surface)",
                border: "1px solid var(--hex-border)",
                transition: "border-color 200ms ease, box-shadow 200ms ease",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--hex-primary)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--hex-primary) 15%, transparent)"
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--hex-border)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none"
                }
              }}
              onSubmit={(e) => {
                e.preventDefault()
                onSend()
              }}
            >
              {/* Previews for selected attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-2.5 pt-1">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative flex items-center gap-1.5 p-1 bg-white border border-neutral-200 rounded-xl"
                      style={{ maxWidth: "150px" }}
                    >
                      {att.type === "image" ? (
                        att.loading ? (
                          <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center shrink-0">
                            <i className="ph-bold ph-spinner animate-spin text-neutral-400" />
                          </div>
                        ) : (
                          <img
                            src={att.url}
                            alt="preview"
                            className="w-9 h-9 object-cover rounded-lg shrink-0"
                          />
                        )
                      ) : (
                        <div className="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                          {att.loading ? (
                            <i className="ph-bold ph-spinner animate-spin text-red-400" />
                          ) : (
                            <i className="ph-fill ph-file-pdf text-xl" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-[10px] font-semibold truncate leading-tight text-neutral-700">
                          {att.name}
                        </p>
                        <p className="text-[8px] font-medium text-neutral-400 mt-0.5">
                          {att.loading ? "Uploading..." : att.type.toUpperCase()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        disabled={isSending}
                        className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-neutral-800 text-white rounded-full flex items-center justify-center text-[9px] hover:bg-neutral-600 transition-colors shadow-sm"
                        aria-label="Remove attachment"
                      >
                        <i className="ph-bold ph-x text-[9px]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom input area */}
              <div className="flex items-end gap-2 w-full">
                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={triggerFileSelect}
                  disabled={isSending}
                  className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center active:scale-95 transition-all mb-0.5 ml-0.5 hover:bg-neutral-200/50"
                  style={{
                    color: "var(--hex-text-muted)",
                  }}
                  aria-label="Attach file"
                >
                  <i className="ph-bold ph-paperclip text-lg" />
                </button>

                <input
                  type="file"
                  id="chat-file-input"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isSending}
                />

                <textarea
                  ref={textareaRef}
                  placeholder="Ask about phones, specs, or order..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 max-h-32 min-h-[38px] py-2.5 px-1 bg-transparent text-[15px] outline-none resize-none leading-normal font-medium"
                  style={{
                    color: "var(--hex-text)",
                  }}
                  disabled={isSending}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && attachments.length === 0) || isSending || attachments.some(a => a.loading)}
                  className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center active:scale-90 transition-all mb-0.5 mr-0.5 disabled:opacity-30"
                  style={{
                    background: "var(--hex-primary)",
                    color: "var(--hex-primary-fg)",
                  }}
                  aria-label="Send"
                >
                  <i className="ph-bold ph-arrow-up text-lg" aria-hidden />
                </button>
              </div>
            </form>
            <div className="text-center mt-2 pb-0.5">
              <span
                className="text-[9px] font-medium tracking-wider uppercase"
                style={{ color: "var(--hex-text-muted)", opacity: 0.4 }}
              >
                Zizu AI · Verify stock before payment
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      <style>{`
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatBounceIn {
          0% { opacity: 0; transform: scale(0.85) translateY(8px); }
          60% { opacity: 1; transform: scale(1.03) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes chatSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatTeaser {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes chatPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes chatCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes chatDotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
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
        @keyframes chatOrbShift {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.08;
          }
          33% {
            transform: translate(-40%, -60%) scale(1.15);
            opacity: 0.14;
          }
          66% {
            transform: translate(-60%, -40%) scale(0.9);
            opacity: 0.06;
          }
        }
        @keyframes chatStepPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes chatShineSwipe {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
        @keyframes chatWelcomeGlow {
          0%, 100% { opacity: 0.06; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.12; transform: translate(-50%, -50%) scale(1.2); }
        }
        .chat-orb {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 120%;
          height: 120%;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            var(--hex-primary) 0%,
            transparent 70%
          );
          opacity: 0.06;
          animation: chatOrbShift 12s ease-in-out infinite;
          pointer-events: none;
        }
        .zizu-welcome-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 80%;
          height: 80%;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            var(--hex-primary) 0%,
            transparent 60%
          );
          animation: chatWelcomeGlow 6s ease-in-out infinite;
          pointer-events: none;
        }
        .chat-msg-enter {
          animation: chatBounceIn 320ms cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .zizu-trigger-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          animation: chatGlowPulse 2.5s ease-in-out infinite;
          pointer-events: none;
        }
        .zizu-shine {
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255,255,255,0.08) 40%,
            rgba(255,255,255,0.15) 50%,
            rgba(255,255,255,0.08) 60%,
            transparent 100%
          );
          pointer-events: none;
          opacity: 0;
          transition: opacity 200ms ease;
        }
        .zizu-suggestion-card:hover .zizu-shine {
          opacity: 1;
          animation: chatShineSwipe 800ms ease forwards;
        }
        .chat-sheet-wrapper {
          position: fixed;
          z-index: 60;
          display: flex;
          flex-direction: column;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          transform-origin: bottom right;
          transition: opacity 280ms ease, transform 380ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .chat-sheet-wrapper.chat-closed {
          opacity: 0;
          transform: scale(0.95) translateY(12px);
          pointer-events: none;
        }
        .chat-sheet-wrapper.chat-open {
          opacity: 1;
          transform: scale(1) translateY(0);
          pointer-events: auto;
        }
        @media (min-width: 640px) {
          .chat-sheet-wrapper {
            left: auto;
            top: auto;
            right: 24px;
            bottom: 24px;
            width: 420px;
            height: auto;
          }
        }
        .chat-hdr-btn {
          transition: all 200ms ease;
        }
        .chat-hdr-btn:hover {
          filter: brightness(0.95);
          transform: scale(1.05);
        }
        .chat-hdr-btn:active {
          transform: scale(0.9);
        }
      `}</style>
    </>
  )
}

/* ─── MessageRow Component ─── */
function MessageRow({
  message,
  shouldAnimate,
  isLast,
  addingId,
  globalAspectClass,
  onAddToCart,
  onBuyNow,
  onAction,
  onSuggest,
}: {
  message: ChatMessage
  shouldAnimate: boolean
  isLast?: boolean
  addingId: string | null
  globalAspectClass: string
  onAddToCart: (vid: string, title: string) => void
  onBuyNow: (vid: string, title: string) => void
  onAction: (a: any) => void
  onSuggest?: (prompt: string) => void
}) {
  const isUser = message.role === "user"
  const meta = parseMeta(message.metadata)

  // The AI reply can occasionally come back null/empty (e.g. gpt-5 spends
  // its whole token budget on reasoning, or the tool loop hits its ceiling
  // with no final text). `null.split()` below would throw and — because the
  // widget lives in the root layout — take the whole UI down (icon vanished
  // / "chat band ho jati hai"). Always work off a guaranteed string.
  const safeContent = typeof message.content === "string" ? message.content : ""

  const [displayContent, setDisplayContent] = useState(
    shouldAnimate ? "" : safeContent
  )
  const [isTyping, setIsTyping] = useState(shouldAnimate)

  // Fast chunked reveal. The old loop crawled one word every 25ms, so a
  // long reply took several seconds to finish drawing — felt slow even
  // when the API was quick. Now we reveal MANY words per tick on a short
  // interval, sized so any reply finishes in ~300ms regardless of length:
  // short answers feel instant, long ones still get a quick "typing" feel.
  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayContent(safeContent)
      setIsTyping(false)
      return
    }

    const words = safeContent.split(/(\s+)/)
    const INTERVAL = 16 // ~1 frame
    const TARGET_MS = 300 // total reveal time budget
    const step = Math.max(2, Math.ceil(words.length / (TARGET_MS / INTERVAL)))
    let i = 0
    const timer = setInterval(() => {
      if (i < words.length) {
        i += step
        setDisplayContent(words.slice(0, i).join(""))
      } else {
        setIsTyping(false)
        clearInterval(timer)
      }
    }, INTERVAL)

    return () => clearInterval(timer)
  }, [safeContent, shouldAnimate])

  const handleSkip = () => {
    if (isTyping) {
      setDisplayContent(safeContent)
      setIsTyping(false)
    }
  }

  const renderFormattedContent = (content: string) => {
    if (!content) return null

    const lines = content.split("\n")
    const rendered: React.ReactNode[] = []

    let tableLines: string[] = []
    let listLines: string[] = []

    const flushTable = (key: number) => {
      if (tableLines.length === 0) return
      const rows = tableLines
        .map((l) =>
          l
            .split("|")
            .map((cell) => cell.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        )
        .filter(
          (row) =>
            row.length > 0 &&
            !row.every(
              (cell) =>
                cell.startsWith("---") ||
                cell.startsWith(" :---") ||
                cell.startsWith("---:")
            )
        )

      if (rows.length > 0) {
        rendered.push(
          <div
            key={`table-${key}`}
            className="overflow-x-auto my-2 rounded-xl"
            style={{ border: "1px solid var(--hex-border)" }}
          >
            <table
              className="w-full text-xs text-left border-collapse"
              style={{ background: "var(--hex-bg)" }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--hex-border)",
                    background: "var(--hex-surface)",
                  }}
                >
                  {rows[0].map((cell, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-2 font-bold"
                      style={{ color: "var(--hex-text)" }}
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: rIdx < rows.length - 2 ? "1px solid var(--hex-border)" : "none",
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-3 py-2 font-medium"
                        style={{ color: "var(--hex-text-muted)" }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      tableLines = []
    }

    const flushList = (key: number) => {
      if (listLines.length === 0) return
      rendered.push(
        <ul
          key={`list-${key}`}
          className="list-disc pl-5 my-1.5 space-y-0.5"
          style={{ color: "var(--hex-text-muted)" }}
        >
          {listLines.map((l, idx) => {
            const itemText = l.replace(/^[-*+]\s+/, "")
            return (
              <li
                key={idx}
                className="text-[13px] font-medium leading-relaxed"
              >
                {parseInlineMarkdown(itemText)}
              </li>
            )
          })}
        </ul>
      )
      listLines = []
    }

    const parseInlineMarkdown = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/)
      return parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong
              key={idx}
              className="font-bold"
              style={{ color: "var(--hex-text)" }}
            >
              {part.slice(2, -2)}
            </strong>
          )
        }
        return part
      })
    }

    lines.forEach((line, idx) => {
      const isTableLine = line.trim().startsWith("|") && line.trim().endsWith("|")
      const isListLine = /^\s*[-*+]\s+/.test(line)

      if (isTableLine) {
        flushList(idx)
        tableLines.push(line)
      } else if (isListLine) {
        flushTable(idx)
        listLines.push(line)
      } else {
        flushTable(idx)
        flushList(idx)
        if (line.trim()) {
          rendered.push(
            <p
              key={idx}
              className="text-[13px] leading-relaxed mb-1 font-medium"
              style={{ color: "var(--hex-text-muted)" }}
            >
              {parseInlineMarkdown(line)}
            </p>
          )
        } else {
          rendered.push(<div key={idx} className="h-1" />)
        }
      }
    })

    flushTable(lines.length)
    flushList(lines.length)

    return (
      <div className="relative">
        {rendered}
        {isTyping && (
          <span
            className="inline-block w-0.5 h-3.5 ml-0.5 rounded-full"
            style={{
              background: "var(--hex-primary)",
              animation: "chatCursor 800ms steps(2) infinite",
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex ${isUser ? "flex-col items-end" : "flex-row items-start"} gap-1.5 chat-msg-enter`}
    >
      {/* Small Zizu avatar beside bot messages */}
      {!isUser && (
        <img
          src={ZIZU_AVATAR}
          alt="Zizu"
          className="w-6 h-6 rounded-full object-cover shrink-0 mt-1"
          style={{
            border: "1.5px solid var(--hex-border)",
          }}
        />
      )}
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5 flex-1 min-w-0`}>
      {/* Message Bubble */}
      <div
        onClick={handleSkip}
        title={isTyping ? "Click to skip" : undefined}
        className={`max-w-[85%] px-4 py-3 text-[13px] whitespace-pre-wrap break-words leading-relaxed select-none transition-all ${
          isTyping ? "cursor-pointer" : ""
        }`}
        style={
          isUser
            ? {
                background: "var(--hex-primary)",
                color: "var(--hex-primary-fg)",
                borderRadius: "20px 20px 4px 20px",
              }
            : {
                background: "var(--hex-surface)",
                color: "var(--hex-text)",
                borderRadius: "20px 20px 20px 4px",
                border: "1px solid var(--hex-border)",
              }
        }
      >
        {isUser ? displayContent : renderFormattedContent(displayContent)}
        
        {/* Render Attachments inside user message bubble */}
        {isUser && meta?.images && meta.images.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {meta.images.map((imgUrl: string, idx: number) => (
              <img
                key={idx}
                src={imgUrl}
                alt="user attachment"
                className="max-w-[140px] max-h-[140px] object-cover rounded-xl border border-white/20"
              />
            ))}
          </div>
        )}
        {isUser && meta?.files && meta.files.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2">
            {meta.files.map((file: any, idx: number) => (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold w-fit border border-white/10 transition-colors hover:bg-white/20"
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  color: "var(--hex-primary-fg)"
                }}
              >
                <i className="ph-fill ph-file-pdf text-[14px] text-red-300" />
                <span className="truncate max-w-[180px]">{file.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Product Cards */}
      {!isUser && meta?.products && meta.products.length > 0 && !isTyping && (
        <div className="flex flex-col gap-2 w-full max-w-[85%]">
          {meta.products.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="flex flex-col p-3 rounded-2xl gap-2.5 transition-all active:scale-[0.99] chat-msg-enter"
              style={{
                background: "var(--hex-surface)",
                border: "1px solid var(--hex-border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--hex-primary)"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--hex-border)"
              }}
            >
              <a href={`/products/${p.handle}`} className="flex items-center gap-3">
                {p.thumbnail ? (
                  <div
                    className={`w-14 rounded-xl overflow-hidden shrink-0 ${globalAspectClass}`}
                    style={{ border: "1px solid var(--hex-border)" }}
                  >
                    <Thumbnail thumbnail={p.thumbnail} size="full" alt={p.title} />
                  </div>
                ) : (
                  <div
                    className={`w-14 rounded-xl flex items-center justify-center shrink-0 ${globalAspectClass}`}
                    style={{
                      background: "var(--hex-bg)",
                      border: "1px solid var(--hex-border)",
                      color: "var(--hex-text-muted)",
                    }}
                  >
                    <i className="ph-fill ph-device-mobile text-lg" aria-hidden />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-semibold truncate"
                    style={{ color: "var(--hex-text)" }}
                  >
                    {p.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {p.brand && (
                      <span
                        className="text-[11px] font-semibold truncate"
                        style={{ color: "var(--hex-text-muted)" }}
                      >
                        {p.brand}
                      </span>
                    )}
                    {p.pack_size && (
                      <span
                        className="text-[10px] rounded px-1.5 py-0.5 font-medium shrink-0"
                        style={{
                          background: "var(--hex-bg)",
                          color: "var(--hex-text-muted)",
                        }}
                      >
                        {p.pack_size}
                      </span>
                    )}
                  </div>
                </div>
                {typeof p.price === "number" && (
                  <p
                    className="text-[13px] font-bold shrink-0"
                    style={{ color: "var(--hex-text)" }}
                  >
                    {formatMoney(p.price, p.currency)}
                  </p>
                )}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {!isUser && meta?.actions && meta.actions.length > 0 && !isTyping && (
        <div className="flex flex-wrap gap-1.5 max-w-[85%]">
          {meta.actions.map((a, i) => {
            if (a.type === "added_to_cart") {
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 font-semibold"
                  style={{
                    background: "var(--hex-success)",
                    color: "#fff",
                  }}
                >
                  <i className="ph-fill ph-check-circle text-[10px]" aria-hidden />
                  Added {a.quantity}x {a.title}
                </span>
              )
            }
            if (a.type === "sign_in_required") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(a)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-2 transition-all active:scale-95"
                  style={{
                    background: "var(--hex-surface)",
                    border: "1px solid var(--hex-border)",
                    color: "var(--hex-text)",
                  }}
                >
                  <i className="ph-bold ph-sign-in text-[10px]" aria-hidden />
                  Sign in
                </button>
              )
            }
            if (a.type === "view_cart") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(a)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-2 transition-all active:scale-95"
                  style={{
                    background: "var(--hex-surface)",
                    border: "1px solid var(--hex-border)",
                    color: "var(--hex-text)",
                  }}
                >
                  <i className="ph-bold ph-shopping-bag text-[10px]" aria-hidden />
                  View cart
                </button>
              )
            }
            if (a.type === "checkout") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(a)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-4 py-2 transition-all active:scale-95 shadow-sm"
                  style={{
                    background: "var(--hex-primary)",
                    color: "var(--hex-primary-fg)",
                  }}
                >
                  <i className="ph-fill ph-lock-key text-[10px]" aria-hidden />
                  Go to checkout
                </button>
              )
            }
            if (a.type === "confirm_order") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(a)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-2 transition-all active:scale-95 shadow-sm"
                  style={{
                    background: "var(--hex-success)",
                    color: "#fff",
                  }}
                >
                  <i className="ph-fill ph-check-circle text-[10px]" aria-hidden />
                  Confirm order (COD)
                </button>
              )
            }
            if (a.type === "whatsapp") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(a)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-2 transition-all active:scale-95 shadow-sm"
                  style={{
                    background: "#25D366",
                    color: "#fff",
                  }}
                >
                  <i className="ph-fill ph-whatsapp-logo text-[10px]" aria-hidden />
                  {a.label || "Talk on WhatsApp"}
                </button>
              )
            }
            if (a.type === "contact_page") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(a)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3.5 py-2 transition-all active:scale-95"
                  style={{
                    background: "var(--hex-surface)",
                    border: "1px solid var(--hex-border)",
                    color: "var(--hex-text)",
                  }}
                >
                  <i className="ph-bold ph-headset text-[10px]" aria-hidden />
                  Contact support
                </button>
              )
            }
            if (a.type === "collect_info") {
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 font-medium"
                  style={{
                    background: "var(--hex-surface)",
                    color: "var(--hex-text-muted)",
                  }}
                >
                  <i className="ph-bold ph-note-pencil text-[10px]" aria-hidden />
                  Please share delivery details above to continue.
                </span>
              )
            }
            return null
          })}
        </div>
      )}

      {/* Follow-up quick replies — shown under the LATEST assistant message
          only. Context-aware, friendly, English. Gives the shopper an easy
          next step on every answer (no typing needed). */}
      {!isUser && isLast && !isTyping && onSuggest && (() => {
        const followUps = getFollowUps(safeContent, meta)
        if (!followUps.length) return null
        return (
          <div className="flex flex-wrap gap-1.5 max-w-[90%] mt-0.5">
            {followUps.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSuggest(f)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-3 py-1.5 transition-all active:scale-95"
                style={{
                  background: "var(--hex-surface)",
                  border: "1px solid var(--hex-border)",
                  color: "var(--hex-primary)",
                  animationDelay: `${i * 60}ms`,
                  animation: "chatBounceIn 350ms cubic-bezier(0.34,1.56,0.64,1) forwards",
                  opacity: 0,
                  animationFillMode: "forwards",
                }}
              >
                <i className="ph-bold ph-arrow-bend-up-right text-[10px]" aria-hidden />
                {f}
              </button>
            ))}
          </div>
        )
      })()}
      </div>
    </div>
  )
}

/* ─── ActionLog Component — Premium Typing Indicator ─── */
function ActionLog({ pending }: { pending: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!pending) {
      setStep(0)
      return
    }

    const t1 = setTimeout(() => setStep(1), 1200)
    const t2 = setTimeout(() => setStep(2), 2600)
    const t3 = setTimeout(() => setStep(3), 4500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pending])

  if (!pending) return null

  const steps = [
    { text: "Processing your message", icon: "ph-arrow-clockwise" },
    { text: "Searching products & specs", icon: "ph-magnifying-glass" },
    { text: "Preparing response", icon: "ph-note-pencil" },
    { text: "Almost ready", icon: "ph-sparkle" },
  ]

  return (
    <div className="flex items-start gap-1.5">
      {/* Small Zizu avatar beside typing indicator */}
      <img
        src={ZIZU_AVATAR}
        alt="Zizu"
        className="w-6 h-6 rounded-full object-cover shrink-0 mt-1"
        style={{ border: "1.5px solid var(--hex-border)" }}
      />
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium w-fit max-w-[85%] chat-msg-enter"
        style={{
          background: "var(--hex-surface)",
          border: "1px solid var(--hex-border)",
          color: "var(--hex-text-muted)",
        }}
      >
        {/* Animated bouncing dots */}
        <div className="flex gap-1">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="w-2 h-2 rounded-full"
              style={{
                background: "var(--hex-primary)",
                animation: `chatDotBounce 1.4s ease-in-out ${d * 160}ms infinite`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
        <span>{steps[Math.min(step, steps.length - 1)].text}</span>
      </div>
    </div>
  )
}