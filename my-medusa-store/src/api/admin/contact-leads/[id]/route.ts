import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTACT_LEADS_MODULE } from "../../../../modules/contact-leads"
import ContactLeadsModuleService from "../../../../modules/contact-leads/service"

/**
 * PATCH /admin/contact-leads/:id — update status (read, replied, archived, new)
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc: ContactLeadsModuleService = req.scope.resolve(CONTACT_LEADS_MODULE)
  const { id } = req.params as { id: string }
  const body = (req.body || {}) as Record<string, any>

  const allowed = ["new", "read", "replied", "archived"]
  if (body.status && !allowed.includes(body.status)) {
    return res.status(400).json({ error: "Invalid status" })
  }

  const [lead] = await (svc as any).updateContactLeads([
    { id, ...(body.status ? { status: body.status } : {}) },
  ])

  res.json({ lead })
}

/**
 * DELETE /admin/contact-leads/:id — permanently delete a lead
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: ContactLeadsModuleService = req.scope.resolve(CONTACT_LEADS_MODULE)
  const { id } = req.params as { id: string }

  await (svc as any).deleteContactLeads([id])
  res.json({ success: true })
}
