"use server"

import { getAuthHeaders } from "./cookies"

const BACKEND =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:3062"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Place the AI-prepared (COD) order. Runs as a server action so it can
 * forward the signed-in customer's auth token (httpOnly cookie) to the
 * backend — for guests it just sends the publishable key and the backend
 * completes an anonymous guest order. Returns a redirect path on success,
 * or a redirect to /checkout when the cart still needs shipping/payment.
 */
export async function confirmChatOrder(
  cartId: string
): Promise<{ ok: boolean; redirect?: string; message?: string }> {
  if (!cartId) return { ok: false, message: "No cart." }
  const auth = await getAuthHeaders()
  try {
    const res = await fetch(`${BACKEND}/store/chat/confirm-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PK,
        ...(auth as Record<string, string>),
      },
      body: JSON.stringify({ cart_id: cartId }),
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        ok: false,
        redirect: (data as any)?.redirect,
        message: (data as any)?.message || "Could not place the order.",
      }
    }
    return { ok: true, redirect: (data as any)?.redirect }
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error placing order." }
  }
}
