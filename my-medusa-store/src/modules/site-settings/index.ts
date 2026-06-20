import { Module } from "@medusajs/framework/utils"
import SiteSettingsModuleService from "./service"

export const SITE_SETTINGS_MODULE = "site_settings"

export default Module(SITE_SETTINGS_MODULE, {
  service: SiteSettingsModuleService,
})
