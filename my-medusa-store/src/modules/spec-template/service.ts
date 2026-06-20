import { MedusaService } from "@medusajs/framework/utils"
import { SpecTemplate } from "./models/spec-template"

class SpecTemplateModuleService extends MedusaService({
  SpecTemplate,
}) {}

export default SpecTemplateModuleService
