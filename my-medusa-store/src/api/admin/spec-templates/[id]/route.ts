import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPEC_TEMPLATE_MODULE } from "../../../../modules/spec-template"
import SpecTemplateModuleService from "../../../../modules/spec-template/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: SpecTemplateModuleService = req.scope.resolve(SPEC_TEMPLATE_MODULE)
  const { id } = req.params

  try {
    const specTemplate = await svc.retrieveSpecTemplate(id)
    res.json({ spec_template: specTemplate })
  } catch (e: any) {
    res.status(404).json({ error: `Spec template with ID ${id} not found` })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return PATCH(req, res)
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc: SpecTemplateModuleService = req.scope.resolve(SPEC_TEMPLATE_MODULE)
  const { id } = req.params
  const body = (req.body || {}) as Record<string, any>

  const update: Record<string, any> = { id }
  const allowed = [
    "name",
    "handle",
    "description",
    "icon",
    "is_preset",
    "sort_order",
    "template_data",
  ]
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (typeof update.sort_order === "string") {
    update.sort_order = parseInt(update.sort_order, 10) || 0
  }

  // Handle handle change check
  if (update.handle) {
    const existing = await svc.listSpecTemplates({ handle: update.handle })
    const other = existing.find((t) => t.id !== id)
    if (other) {
      return res.status(400).json({ error: `A spec template with handle "${update.handle}" already exists` })
    }
  }

  try {
    const [specTemplate] = await svc.updateSpecTemplates([update as any])
    res.json({ spec_template: specTemplate })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to update spec template" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: SpecTemplateModuleService = req.scope.resolve(SPEC_TEMPLATE_MODULE)
  const { id } = req.params

  try {
    await svc.deleteSpecTemplates([id])
    res.json({ id, deleted: true })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to delete spec template" })
  }
}
