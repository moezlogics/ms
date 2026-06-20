import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"
import SiteSettingsModuleService from "../../../modules/site-settings/service"

// GET /admin/site-settings — fetch all settings as key-value map
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: SiteSettingsModuleService = req.scope.resolve(SITE_SETTINGS_MODULE)
  const settings = await svc.getAll()
  res.json({ settings })
}

// POST/PUT /admin/site-settings — bulk upsert
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return PUT(req, res)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const svc: SiteSettingsModuleService = req.scope.resolve(SITE_SETTINGS_MODULE)
  const body = (req.body || {}) as Record<string, any>
  const payload = (body.settings || body) as Record<string, any>
  await svc.bulkUpsert(payload)
  const settings = await svc.getAll()
  res.json({ settings })
}
