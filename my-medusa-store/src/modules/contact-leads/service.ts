import { MedusaService } from "@medusajs/framework/utils"
import { ContactLead } from "./models/contact-lead"

class ContactLeadsModuleService extends MedusaService({
  ContactLead,
}) {}

export default ContactLeadsModuleService
