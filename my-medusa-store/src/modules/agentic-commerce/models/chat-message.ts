import { model } from "@medusajs/framework/utils"

/**
 * Single message in a chat session — user or assistant role.
 *
 * `metadata` is JSON-stringified data the assistant can attach to a
 * message (e.g. recommended product IDs, action suggestions). Kept as
 * text for portability across DB providers.
 */
export const ChatMessage = model.define("chat_message", {
  id: model.id({ prefix: "msg" }).primaryKey(),
  session_id: model.text(),
  role: model.enum(["user", "assistant", "system"]).default("user"),
  content: model.text(),
  metadata: model.text().nullable(),
})
