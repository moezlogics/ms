import { Module } from "@medusajs/framework/utils"
import SpecTemplateModuleService from "./service"

export const SPEC_TEMPLATE_MODULE = "specTemplate"

export default Module(SPEC_TEMPLATE_MODULE, {
  service: SpecTemplateModuleService,
})
