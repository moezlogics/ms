import { MedusaService } from "@medusajs/framework/utils"
import { PushCampaign, PushSubscription } from "./models/push-subscription"
import { AdminPushSubscription } from "./models/admin-push-subscription"

class PushNotificationsService extends MedusaService({
  PushSubscription,
  PushCampaign,
  AdminPushSubscription,
}) {}

export default PushNotificationsService
