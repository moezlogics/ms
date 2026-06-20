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

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: SpecTemplateModuleService = req.scope.resolve(SPEC_TEMPLATE_MODULE)
  const body = (req.body || {}) as Record<string, any>

  if (!body.name || typeof body.name !== "string") {
    return res.status(400).json({ error: "name is required" })
  }

  const handle =
    body.handle ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  // If handle already exists, update it to make seed operations idempotent
  const existing = await svc.listSpecTemplates({ handle })
  if (existing.length > 0) {
    const [updated] = await svc.updateSpecTemplates([
      {
        id: existing[0].id,
        name: body.name,
        description: body.description ?? null,
        icon: body.icon ?? "ph-list-checks",
        is_preset: body.is_preset === true,
        sort_order:
          typeof body.sort_order === "number"
            ? body.sort_order
            : parseInt(body.sort_order, 10) || 0,
        template_data: body.template_data ?? { groups: [] },
      } as any,
    ])
    return res.json({ spec_template: updated })
  }

  const [specTemplate] = await svc.createSpecTemplates([
    {
      name: body.name,
      handle,
      description: body.description ?? null,
      icon: body.icon ?? "ph-list-checks",
      is_preset: body.is_preset === true,
      sort_order:
        typeof body.sort_order === "number"
          ? body.sort_order
          : parseInt(body.sort_order, 10) || 0,
      template_data: body.template_data ?? { groups: [] },
    } as any,
  ])

  res.status(201).json({ spec_template: specTemplate })
}
