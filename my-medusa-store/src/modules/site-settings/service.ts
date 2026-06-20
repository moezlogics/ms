import { MedusaService } from "@medusajs/framework/utils"
import { SiteSetting } from "./models/site-setting"

class SiteSettingsModuleService extends MedusaService({
  SiteSetting,
}) {
  /**
   * Returns all settings as a plain key/value object.
   * Missing keys simply don't appear.
   */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.listSiteSettings({}, { take: 1000 } as any)
    const result: Record<string, string> = {}
    for (const row of rows) {
      if (row.key) result[row.key] = row.value ?? ""
    }
    return result
  }

  /**
   * Creates or updates a single setting by key.
   */
  async upsert(key: string, value: string | null): Promise<void> {
    const [existing] = await this.listSiteSettings({ key }, { take: 1 } as any)
    if (existing) {
      await this.updateSiteSettings([{ id: existing.id, value } as any])
    } else {
      await this.createSiteSettings([{ key, value } as any])
    }
  }

  /**
   * Bulk upsert — used by the admin settings page save action.
   */
  async bulkUpsert(settings: Record<string, any>): Promise<void> {
    const keys = Object.keys(settings)
    if (keys.length === 0) return

    const existing = await this.listSiteSettings(
      { key: keys } as any,
      { take: 1000 } as any
    )
    const byKey = new Map(existing.map((r: any) => [r.key, r]))

    const toUpdate: any[] = []
    const toCreate: any[] = []

    for (const key of keys) {
      const raw = settings[key]
      const value = raw === null || raw === undefined ? null : String(raw)
      const existingRow = byKey.get(key)
      if (existingRow) {
        toUpdate.push({ id: (existingRow as any).id, value })
      } else {
        toCreate.push({ key, value })
      }
    }

    if (toUpdate.length) await this.updateSiteSettings(toUpdate)
    if (toCreate.length) await this.createSiteSettings(toCreate)
  }
}

export default SiteSettingsModuleService
