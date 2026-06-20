import { model } from "@medusajs/framework/utils"

/**
 * Admin Web Push subscription — one row per admin browser / installed
 * PWA that has granted notification permission in the admin mobile app.
 *
 * Kept SEPARATE from the customer `push_subscription` table on purpose:
 *   - admins must never receive marketing campaigns / customer pushes,
 *   - and they must not pollute the customer push analytics + segments.
 *
 * `admin_id` links the subscription to the Medusa admin `user` that
 * registered it (so we could target a specific admin later). Sends use
 * the SAME web-push client (`lib/web-push-client.ts`) as customers — a
 * subscription is just endpoint + p256dh + auth.
 */
export const AdminPushSubscription = model.define("admin_push_subscription", {
  id: model.id({ prefix: "apsub" }).primaryKey(),
  endpoint: model.text().unique(),
  p256dh: model.text(),
  auth: model.text(),
  admin_id: model.text().nullable(),
  label: model.text().nullable(),
  device_browser: model.text().nullable(),
  is_active: model.boolean().default(true),
  last_sent_at: model.dateTime().nullable(),
})
