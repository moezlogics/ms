import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPEC_TEMPLATE_MODULE } from "../../../modules/spec-template"
import SpecTemplateModuleService from "../../../modules/spec-template/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: SpecTemplateModuleService = req.scope.resolve(SPEC_TEMPLATE_MODULE)

  const [specTemplates, count] = await svc.listAndCountSpecTemplates(
    {},
    { order: { sort_order: "ASC", name: "ASC" } as any, take: 500 }
  )

  res.json({ spec_templates: specTemplates, count })
}
