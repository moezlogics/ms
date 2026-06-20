/**
 * Storefront client for the AI chatbot endpoints under /store/chat.
 * All calls run from the browser — no auth required, the backend keys
 * sessions by `visitor_token` (a UUID stored in localStorage).
 */

const PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:3062"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export type ChatMessage = {
  id: string
  session_id: string
  role: "user" | "assistant" | "system"
  content: string
  metadata: string | null
  created_at: string
}

export type ChatSession = {
  id: string
  customer_id: string | null
  visitor_token: string | null
  title: string | null
  message_count: number
}

/**
 * Fetch wrapper with timeout + abort support.
 *
 * The AI message endpoint can take 10-30s when the model runs tool
 * loops. We set a generous timeout (45s) so it can finish, but we
 * don't hang the browser indefinitely. Callers can also pass their
 * own AbortSignal to cancel on unmount / navigation.
 */
async function call<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 45_000,
): Promise<T> {
  const controller = new AbortController()

  // Link caller's signal (if any) so abort propagates both ways.
  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort(init.signal.reason)
    } else {
      init.signal.addEventListener("abort", () =>
        controller.abort(init.signal!.reason)
      )
    }
  }

  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs)

  try {
    const res = await fetch(`${PUBLIC_BACKEND_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...(init.headers as any),
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(
        (data as any)?.error ||
          (data as any)?.message ||
          `Chat request failed (${res.status})`
      )
    }
    return data as T
  } catch (err: any) {
    // Translate abort into a friendlier message
    if (err?.name === "AbortError" || controller.signal.aborted) {
      const reason = controller.signal.reason
      if (reason === "timeout") {
        throw new Error("Response took too long. Please try again.")
      }
      throw new Error("Request was cancelled.")
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export async function startChatSession(
  visitorToken: string | null,
  customerId: string | null
) {
  return call<{ session: ChatSession; messages: ChatMessage[] }>(
    "/store/chat/session",
    {
      method: "POST",
      body: JSON.stringify({
        visitor_token: visitorToken,
        customer_id: customerId,
      }),
    },
    15_000 // session init should be fast — 15s timeout
  )
}

export async function sendChatMessage(
  args: {
    session_id: string
    content: string
    page_url?: string
    cart_id?: string | null
    images?: string[]
    files?: Array<{ name: string; text: string }>
  },
  signal?: AbortSignal
) {
  return call<{ message: ChatMessage; user_message: ChatMessage }>(
    "/store/chat/message",
    {
      method: "POST",
      body: JSON.stringify(args),
      signal,
    },
    45_000 // AI response can be slow — 45s timeout
  )
}

export async function getChatHistory(sessionId: string) {
  return call<{ messages: ChatMessage[] }>(
    `/store/chat/history?session_id=${encodeURIComponent(sessionId)}`,
    {},
    15_000
  )
}
