import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../modules/push-notifications"
import {
  configureWebPush,
  sendPushBatch,
} from "../../../modules/push-notifications/lib/web-push-client"
import { buildEmailThemeFromSettings } from "../../../modules/email-notifications/util/theme-from-settings"

/**
 * Customer-Group-targeted broadcast endpoint.
 *
 * The marketer picks one or more customer groups (Medusa's built-in
 * `customer_group` resource) plus a channel ("email" or "push") and
 * we resolve the membership, fan out the message, and report stats.
 *
 * Why a separate route from `/admin/push-campaigns`:
 *   - Push campaigns target *push subscribers* (which include
 *     anonymous visitors). Customer groups target *customers*
 *     (logged-in only). Different audience source = different
 *     resolution path.
 *   - Push campaigns persist a `PushCampaign` row for stats history.
 *     Group broadcasts are intentionally one-off and don't need
 *     their own model — keeps migrations small.
 *
 * Body:
 *   {
 *     channel: "email" | "push",
 *     customer_group_ids: string[],
 *
 *     // Email fields
 *     subject?: string,
 *     html?: string,            // Inline HTML (optional)
 *     message?: string,         // Plain text fallback / generic body
 *
 *     // Push fields
 *     title?: string,
 *     body?: string,
 *     icon_url?: string,
 *     image_url?: string,
 *     action_url?: string,
 *
 *     // Common
 *     dry_run?: boolean,
 *   }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, any>
  const channel = (body.channel || "").toString()
  const groupIds: string[] = Array.isArray(body.customer_group_ids)
    ? body.customer_group_ids.filter(Boolean).map(String)
    : []
  const dryRun = body.dry_run === true

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as any

  if (!groupIds.length) {
    return res
      .status(400)
      .json({ ok: false, error: "customer_group_ids is required" })
  }

  if (channel !== "email" && channel !== "push") {
    return res
      .status(400)
      .json({ ok: false, error: "channel must be 'email' or 'push'" })
  }

  // Resolve customers in the chosen groups. Medusa's customer-group
  // module exposes the m2m relation through the query graph; we
  // pull only the fields we actually use to keep the SQL light.
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: groups } = await query.graph({
    entity: "customer_group",
    fields: ["id", "name", "customers.id", "customers.email"],
    filters: { id: groupIds },
  })

  // De-dupe customers across overlapping groups by id
  const customers = new Map<
    string,
    { id: string; email: string | null }
  >()
  for (const g of groups || []) {
    for (const c of (g as any).customers || []) {
      if (c?.id && !customers.has(c.id)) {
        customers.set(c.id, { id: c.id, email: c.email || null })
      }
    }
  }

  if (customers.size === 0) {
    return res.json({
      ok: true,
      total_resolved: 0,
      sent: 0,
      failed: 0,
      note: "Selected groups contain no customers.",
    })
  }

  if (channel === "email") {
    return res.json(
      await broadcastEmail(req, body, [...customers.values()], dryRun, logger)
    )
  }

  return res.json(
    await broadcastPush(req, body, [...customers.values()], dryRun, logger)
  )
}

/**
 * Email broadcast. Skips customers without an email (they'd just
 * fail silently). Routes through the Notification Module so the
 * SMTP provider, logging, and from-address rules are identical
 * to transactional emails.
 */
async function broadcastEmail(
  req: MedusaRequest,
  body: Record<string, any>,
  customers: { id: string; email: string | null }[],
  dryRun: boolean,
  logger: any
) {
  const subject = (body.subject || "").toString().trim()
  const message = (body.message || body.html || "").toString().trim()

  if (!subject) return { ok: false, error: "subject is required for email" }
  if (!message) return { ok: false, error: "message (or html) is required" }

  const recipients = customers.filter((c) => !!c.email)

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      total_resolved: customers.length,
      total_with_email: recipients.length,
      sample: recipients.slice(0, 5).map((r) => maskEmail(r.email!)),
    }
  }

  // Pull branding once so each email looks identical to transactional
  // emails the customer already trusts.
  let settings: Record<string, string> = {}
  try {
    const settingsModule = req.scope.resolve("site-settings" as any) as any
    if (settingsModule?.getAll) settings = await settingsModule.getAll()
  } catch {
    // optional
  }
  const brand = {
    store_name:
      settings.site_name ||
      process.env.STORE_NAME ||
      process.env.MEDUSA_STORE_NAME ||
      "Welcome",
    logo_url: settings.site_logo_url || undefined,
    copyright: settings.footer_copyright || undefined,
    theme: buildEmailThemeFromSettings(settings),
  }

  const notificationService = req.scope.resolve(Modules.NOTIFICATION) as any
  let sent = 0
  let failed = 0
  const errors: { email: string; error: string }[] = []

  // Fan out sequentially with a small concurrency window so we don't
  // hammer Gmail's rate limit (it caps at ~100 sends / 60s for
  // free accounts).
  const CONCURRENCY = 5
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map((c) =>
        notificationService.createNotifications({
          to: c.email,
          channel: "email",
          // Re-uses the contact-received template since it accepts
          // arbitrary subject/message and is already branded.
          // For richer templates, add a dedicated "broadcast" template
          // to the SMTP service in a follow-up.
          template: "contact-received",
          data: {
            ...brand,
            name: brand.store_name,
            email: process.env.SMTP_FROM || "no-reply",
            phone: "",
            subject,
            message,
          },
        })
      )
    )
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") sent++
      else {
        failed++
        errors.push({
          email: maskEmail(batch[idx].email!),
          error: r.reason?.message || String(r.reason),
        })
      }
    })
  }

  logger?.info?.(
    `[NotificationBroadcast] email: resolved=${customers.length} eligible=${recipients.length} sent=${sent} failed=${failed}`
  )

  return {
    ok: failed === 0,
    total_resolved: customers.length,
    total_with_email: recipients.length,
    sent,
    failed,
    errors: errors.slice(0, 10), // cap so the response stays small
  }
}

/**
 * Push broadcast. Resolves each customer's active push
 * subscriptions and fans out via web-push. Customers who never
 * granted push permission are skipped silently (expected — most
 * won't have subscribed).
 */
async function broadcastPush(
  req: MedusaRequest,
  body: Record<string, any>,
  customers: { id: string; email: string | null }[],
  dryRun: boolean,
  logger: any
) {
  const cfg = configureWebPush()
  if (!cfg.configured) {
    return {
      ok: false,
      error:
        "VAPID keys not configured. Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in backend .env and restart.",
    }
  }

  const title = (body.title || "").toString().trim()
  const text = (body.body || "").toString().trim()
  if (!title || !text) {
    return { ok: false, error: "title and body are required for push" }
  }

  const svc: any = req.scope.resolve(PUSH_NOTIFICATIONS_MODULE)

  // Resolve all active subscriptions for the customer set in one shot.
  // listPushSubscriptions accepts an `$in` style filter natively.
  const customerIds = customers.map((c) => c.id)
  const subs = await svc.listPushSubscriptions(
    { customer_id: customerIds, is_active: true },
    { take: 100_000 }
  )

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      total_resolved_customers: customers.length,
      total_subscriptions: subs.length,
    }
  }

  if (!subs.length) {
    return {
      ok: true,
      total_resolved_customers: customers.length,
      total_subscriptions: 0,
      sent: 0,
      failed: 0,
      note: "No customer in the selected groups has a push subscription.",
    }
  }

  const payload = {
    title,
    body: text,
    icon: body.icon_url ? String(body.icon_url) : undefined,
    image: body.image_url ? String(body.image_url) : undefined,
    url: body.action_url ? String(body.action_url) : "/",
    tag: `broadcast-${Date.now()}`,
    backend_url:
      process.env.STORE_PUBLIC_BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      undefined,
  }

  const result = await sendPushBatch(
    subs.map((s: any) => ({
      id: s.id,
      endpoint: s.endpoint,
      p256dh: s.p256dh,
      auth: s.auth,
    })),
    payload
  )

  // Prune dead endpoints — same hygiene the campaign endpoint does.
  if (result.expiredIds.length) {
    try {
      await svc.deletePushSubscriptions(result.expiredIds)
    } catch (e: any) {
      logger?.warn?.(
        `[NotificationBroadcast] failed to prune ${result.expiredIds.length} dead subs: ${e?.message}`
      )
    }
  }

  logger?.info?.(
    `[NotificationBroadcast] push: customers=${customers.length} subs=${result.total} sent=${result.sent} failed=${result.failed} pruned=${result.expiredIds.length}`
  )

  return {
    ok: result.sent > 0,
    total_resolved_customers: customers.length,
    total_subscriptions: result.total,
    sent: result.sent,
    failed: result.failed,
    expired_pruned: result.expiredIds.length,
  }
}

function maskEmail(s: string): string {
  if (!s) return ""
  const [local, domain] = s.split("@")
  if (!domain) return s.slice(0, 2) + "***"
  return `${local.slice(0, 2)}***@${domain}`
}
