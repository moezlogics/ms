import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGENTIC_COMMERCE_MODULE } from "../../../../modules/agentic-commerce"

/**
 * POST /store/chat/session
 *
 * Create or resume a chat session.
 *
 * Body:
 *   { visitor_token?: string }
 *
 * SECURITY:
 *   `customer_id` comes ONLY from the request's auth context (the
 *   bearer cookie). The body's `customer_id` is intentionally ignored —
 *   otherwise anyone could pass a stranger's id and read that customer's
 *   chat history. Anonymous visitors are namespaced by `visitor_token`
 *   (a UUID the chat widget generates and stores in localStorage).
 *   Knowing another guest's token at most exposes their transient chat —
 *   it never crosses into authenticated-customer data.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(AGENTIC_COMMERCE_MODULE) as any
  const body = (req.body || {}) as Record<string, any>

  const authedCustomerId =
    ((req as any).auth_context?.actor_id as string | undefined) || null

  // Visitor token only matters when the user isn't authenticated.
  const visitor_token = !authedCustomerId && body.visitor_token
    ? String(body.visitor_token).slice(0, 64)
    : null

  const session = await svc.findOrCreateSession({
    customer_id: authedCustomerId,
    visitor_token,
  })

  // Return the prior conversation alongside the session so the widget
  // can paint history on first open.
  const messages = await svc.listMessages(session.id, 50)

  res.json({ session, messages })
}
