import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTACT_LEADS_MODULE } from "../../../modules/contact-leads"
import ContactLeadsModuleService from "../../../modules/contact-leads/service"

/**
 * GET /admin/contact-leads — list all leads, newest first.
 * Supports ?status=new|read|replied|archived filter.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: ContactLeadsModuleService = req.scope.resolve(CONTACT_LEADS_MODULE)

  const filter: Record<string, any> = {}
  if (req.query.status) filter.status = req.query.status

  const [leads, count] = await (svc as any).listAndCountContactLeads(filter, {
    order: { created_at: "DESC" } as any,
    take: 100,
  })

  res.json({ leads, count })
}
