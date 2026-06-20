import { model } from "@medusajs/framework/utils"

/**
 * Conversational AI chat session.
 *
 * One row per visitor conversation. Anonymous visitors get a session
 * keyed by a client-generated id stored in localStorage. Logged-in
 * customers have `customer_id` populated so the conversation can be
 * picked up across devices.
 */
export const ChatSession = model.define("chat_session", {
  id: model.id({ prefix: "chat" }).primaryKey(),
  customer_id: model.text().nullable(),
  // Browser-side identifier for anonymous sessions
  visitor_token: model.text().nullable(),
  title: model.text().nullable(),
  // Human-readable summary for the admin/history view
  last_message_preview: model.text().nullable(),
  message_count: model.number().default(0),
})
