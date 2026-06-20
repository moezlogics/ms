import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SPEC_TEMPLATE_MODULE } from "../../../../modules/spec-template"
import SpecTemplateModuleService from "../../../../modules/spec-template/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { categoryId } = req.params
  if (!categoryId) {
    return res.status(400).json({ error: "categoryId is required" })
  }

  const query = req.scope.resolve("query") as any
  const specTemplateSvc: SpecTemplateModuleService = req.scope.resolve(SPEC_TEMPLATE_MODULE)

  let category: any = null
  try {
    const { data } = await query.graph({
      entity: "product_category",
      fields: [
        "id",
        "name",
        "metadata",
        "parent_category.id",
        "parent_category.name",
        "parent_category.metadata",
        "parent_category.parent_category.id",
        "parent_category.parent_category.name",
        "parent_category.parent_category.metadata",
        "parent_category.parent_category.parent_category.id",
        "parent_category.parent_category.parent_category.name",
        "parent_category.parent_category.parent_category.metadata",
      ],
      filters: { id: categoryId },
    })
    category = (data || [])[0]
  } catch (e: any) {
    return res.status(500).json({
      error: "Failed to load category",
      detail: e?.message || String(e),
    })
  }

  if (!category) {
    return res.status(404).json({ error: "Category not found" })
  }

  // Helper guard for inline backward-compatible template objects
  const isSpecTemplate = (x: any): boolean => {
    return (
      !!x &&
      typeof x === "object" &&
      Array.isArray(x.groups) &&
      x.groups.every(
        (g: any) =>
          g &&
          typeof g.name === "string" &&
          Array.isArray(g.fields) &&
          g.fields.every(
            (f: any) =>
              f && typeof f.key === "string" && typeof f.label === "string"
          )
      )
    )
  }

  // Walk parents to find the nearest `spec_template_id` or inline `spec_template`
  const visited = new Set<string>()
  let cur: any = category
  let depth = 0
  let isSelf = true

  while (cur && depth++ < 10) {
    if (cur.id && visited.has(cur.id)) break
    if (cur.id) visited.add(cur.id)
    const meta = (cur.metadata || {}) as Record<string, any>

    // 1. Try DB spec_template_id first
    const templateId = meta.spec_template_id
    if (typeof templateId === "string" && templateId.trim()) {
      try {
        const specTemplate = await specTemplateSvc.retrieveSpecTemplate(templateId)
        if (specTemplate && specTemplate.template_data) {
          return res.json({
            template: specTemplate.template_data,
            source: isSelf ? "self" : "ancestor",
            source_id: cur.id || null,
            source_name: cur.name || null,
            template_id: specTemplate.id,
            template_name: specTemplate.name,
          })
        }
      } catch (e) {
        // Fall through if template not found in DB
      }
    }

    // 2. Try inline template object (backward-compatibility)
    const candidate = meta.spec_template
    if (isSpecTemplate(candidate)) {
      return res.json({
        template: candidate,
        source: isSelf ? "self" : "ancestor",
        source_id: cur.id || null,
        source_name: cur.name || null,
        template_id: null,
        template_name: "Legacy Template",
      })
    }

    isSelf = false
    cur = cur.parent_category
  }

  return res.json({
    template: null,
    source: "none",
    source_id: null,
    source_name: null,
  })
}
