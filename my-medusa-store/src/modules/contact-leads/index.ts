import { Module } from "@medusajs/framework/utils"
import ContactLeadsModuleService from "./service"

export const CONTACT_LEADS_MODULE = "contact_leads"

export default Module(CONTACT_LEADS_MODULE, {
  service: ContactLeadsModuleService,
})
