import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGENTIC_COMMERCE_MODULE } from "../../../../modules/agentic-commerce"

/**
 * POST /store/chat/message
 *
 * Send a user message and get the assistant's reply.
 *
 * Body: { session_id, content, page_url?, cart_id? }
 *
 * SECURITY:
 *   - The session is re-resolved server-side. We refuse to operate on
 *     a session whose `customer_id` doesn't match the authed user, so
 *     a leaked session_id can't be used to inject messages into
 *     someone else's chat. Anonymous sessions get adopted (their
 *     customer_id set) on the first authed call so a guest who signs
 *     in keeps a single thread.
 *   - The body's `cart_id` is BOUND-CHECKED: we look the cart up
 *     server-side and only forward it to AI tools if it's anonymous
 *     OR owned by the authed user. Anything else → tools see
 *     `cartId = null`.
 *   - Per-session+IP rate limit: 60 messages / hour, in-memory token
 *     bucket. Trade up to Redis when REDIS_URL + multi-node arrives.
 *   - `content` is length-capped at 2000 chars; `page_url` is
 *     character-class-filtered before going into the system prompt
 *     so a crafted URL can't smuggle a prompt-injection payload.
 */

const MAX_MESSAGES_PER_HOUR = 60
type Bucket = { count: number; resetAt: number }
const RATE_BUCKETS: Map<string, Bucket> =
  (globalThis as any).__chatRateBuckets__ || new Map<string, Bucket>()
;(globalThis as any).__chatRateBuckets__ = RATE_BUCKETS

function rateLimitKey(req: MedusaRequest, sessionId: string): string {
  const ip =
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req as any).ip ||
    ""
  return `${sessionId}::${ip}`
}

function tryConsumeRateBudget(key: string): {
  ok: boolean
  retryInSeconds?: number
} {
  const now = Date.now()
  const bucket = RATE_BUCKETS.get(key)
  if (!bucket || bucket.resetAt < now) {
    RATE_BUCKETS.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return { ok: true }
  }
  if (bucket.count >= MAX_MESSAGES_PER_HOUR) {
    return { ok: false, retryInSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count += 1
  return { ok: true }
}

function sanitizePageUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null
  if (raw.length > 256) return null
  if (!/^[A-Za-z0-9._\-~:/?#[\]@!$&'()*+,;=%]+$/.test(raw)) return null
  return raw
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(AGENTIC_COMMERCE_MODULE) as any
  const body = (req.body || {}) as Record<string, any>

  const session_id = (body.session_id || "").toString().trim()
  const content = (body.content || "").toString().trim()
  const rawCartId = (body.cart_id || "").toString().trim() || null
  const images = Array.isArray(body.images) ? body.images : []
  const files = Array.isArray(body.files) ? body.files : []

  if (!session_id) return res.status(400).json({ error: "session_id required" })
  if (!content && !images.length && !files.length) {
    return res.status(400).json({ error: "content or attachments required" })
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: "Message is too long (max 2000 chars)" })
  }

  const authedCustomerId =
    ((req as any).auth_context?.actor_id as string | undefined) || null

  // ── Rate limit ─────────────────────────────────────────────────
  const rl = tryConsumeRateBudget(rateLimitKey(req, session_id))
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryInSeconds || 60))
    return res.status(429).json({
      error: "Too many messages. Take a break and try again in a bit.",
      retry_in_seconds: rl.retryInSeconds || 60,
    })
  }

  // ── Session ownership ──────────────────────────────────────────
  let session: any = null
  try {
    session = await (svc as any).retrieveChatSession(session_id)
  } catch {
    /* invalid id rejected below */
  }
  if (!session) {
    return res.status(404).json({ error: "Session not found" })
  }
  if (
    authedCustomerId &&
    session.customer_id &&
    session.customer_id !== authedCustomerId
  ) {
    return res.status(403).json({ error: "Forbidden" })
  }
  if (authedCustomerId && !session.customer_id) {
    try {
      await (svc as any).updateChatSessions({
        id: session_id,
        customer_id: authedCustomerId,
      })
    } catch {}
  }

  // ── Cart ownership ─────────────────────────────────────────────
  let safeCartId: string | null = null
  if (rawCartId) {
    try {
      const cartModule = req.scope.resolve("cart") as any
      const cart = await cartModule.retrieveCart(rawCartId)
      const ownedByAuth =
        authedCustomerId && cart?.customer_id === authedCustomerId
      const anonymousCart = !cart?.customer_id
      if (ownedByAuth || anonymousCart) {
        safeCartId = cart.id
      }
    } catch {
      safeCartId = null
    }
  }

  // ── Site context for the system prompt ─────────────────────────
  // We pass `siteContext` (structured) so the service can build a
  // vertical-aware base prompt (grocery / pharmacy / general). The
  // free-form `extraSystem` only carries per-request bits like the
  // current page URL and auth state.
  let siteContext: {
    siteName?: string | null
    tagline?: string | null
    description?: string | null
    businessType?: string | null
    businessCountry?: string | null
  } = {}
  try {
    const settingsModule = req.scope.resolve("site_settings") as any
    const settings = (await settingsModule.getAll?.()) || {}
    siteContext = {
      siteName: settings.site_name?.trim() || null,
      tagline: settings.site_tagline?.trim() || null,
      description: settings.site_description?.trim() || null,
      businessType:
        settings.business_type?.trim() ||
        // Back-compat: pre-grocery installs only had `pharmacy_*` keys.
        (settings.pharmacy_license_number ? "pharmacy" : null) ||
        "electronics",
      businessCountry:
        settings.business_country?.trim() ||
        settings.pharmacy_country?.trim() ||
        null,
    }
  } catch {}

  let extraSystem = ""
  const safePageUrl = sanitizePageUrl(body.page_url)
  if (safePageUrl) {
    extraSystem += `The user is currently viewing: ${safePageUrl}\n`
  }
  if (authedCustomerId) {
    extraSystem += `The user is signed in. You may use signed-in tools (get_my_orders, get_loyalty, prepare_order_for_confirmation).`
  } else {
    extraSystem += `The user is browsing as a guest. Recommend they sign in at /account when they want to place an order, see past orders, or redeem loyalty points.`
  }

  try {
    const { assistantMessage, userMessage } = await svc.sendUserMessage({
      sessionId: session_id,
      content,
      extraSystem,
      siteContext,
      cartId: safeCartId,
      authedCustomerId,
      container: req.scope,
      images,
      files,
    })
    res.json({ message: assistantMessage, user_message: userMessage })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to generate reply" })
  }
}
