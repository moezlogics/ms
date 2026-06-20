import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"

/**
 * DELETE /admin/push-subscriptions/:id
 *   Soft-delete a subscription. Useful when the admin manually removes
 *   a subscriber or when pruning a dead endpoint.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  const id = (req.params as any).id
  if (!id) return res.status(400).json({ error: "id required" })
  await (svc as any).deletePushSubscriptions([id])
  res.json({ success: true })
}
