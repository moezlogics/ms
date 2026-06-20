import { ModuleProvider } from "@medusajs/framework/utils"
import SmtpNotificationService from "./service"

export default ModuleProvider("smtp-notification", {
  services: [SmtpNotificationService],
})
