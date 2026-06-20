import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTACT_LEADS_MODULE } from "../../../modules/contact-leads"
import ContactLeadsModuleService from "../../../modules/contact-leads/service"

/**
 * POST /store/contact — submit a contact form lead.
 * Public endpoint — no auth required.
 *
 * After saving the lead, emits `contact.created` so the notification
 * subscriber can send an admin alert email.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: ContactLeadsModuleService = req.scope.resolve(CONTACT_LEADS_MODULE)
  const body = (req.body || {}) as Record<string, any>

  const name = (body.name || "").toString().trim()
  const email = (body.email || "").toString().trim()
  const message = (body.message || "").toString().trim()

  if (!name) return res.status(400).json({ error: "Name is required" })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Valid email is required" })
  }
  if (!message) return res.status(400).json({ error: "Message is required" })

  const phone = body.phone ? body.phone.toString().trim() : null
  const subject = body.subject ? body.subject.toString().trim() : null

  const [lead] = await (svc as any).createContactLeads([
    {
      name,
      email,
      phone,
      subject,
      message,
      status: "new",
    },
  ])

  // Emit event for notification subscriber
  try {
    const eventBus = req.scope.resolve("event_bus") as any
    if (eventBus?.emit) {
      await eventBus.emit("contact.created", {
        name,
        email,
        phone: phone || "",
        subject: subject || "",
        message,
      })
    }
  } catch {
    // Non-critical — don't fail the request if event emit fails
  }

  res.status(201).json({ success: true, id: lead.id })
}
