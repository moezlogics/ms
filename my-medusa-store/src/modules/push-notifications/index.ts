import { Module } from "@medusajs/framework/utils"
import PushNotificationsService from "./service"

export const PUSH_NOTIFICATIONS_MODULE = "push_notifications"

export default Module(PUSH_NOTIFICATIONS_MODULE, {
  service: PushNotificationsService,
})
