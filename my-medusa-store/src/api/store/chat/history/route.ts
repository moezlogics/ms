import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AGENTIC_COMMERCE_MODULE } from "../../../../modules/agentic-commerce"

/**
 * GET /store/chat/history?session_id=xxx
 *   Returns the full message history for a session. Used when the chat
 *   widget reopens after a navigation and needs to repaint quickly.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(AGENTIC_COMMERCE_MODULE) as any
  const session_id = (req.query.session_id || "").toString()
  if (!session_id) return res.status(400).json({ error: "session_id required" })

  const messages = await svc.listMessages(session_id, 100)
  res.json({ messages })
}
