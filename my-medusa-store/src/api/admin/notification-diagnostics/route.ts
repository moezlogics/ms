import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../modules/push-notifications"
import {
  configureWebPush,
  sendPushTo,
} from "../../../modules/push-notifications/lib/web-push-client"

/**
 * Notification diagnostics endpoint.
 *
 * Single POST route with an `action` discriminator so the admin
 * page can run any test from one fetch URL. Each branch returns
 * verbose, structured output (status, error message, error code,
 * env config snapshot) so the marketer can read exactly what
 * happened without SSH-ing into the server.
 *
 * Actions:
 *   - test-smtp           Send a one-off test email through the
 *                         configured SMTP provider. Surfaces auth
 *                         errors, connection errors, etc.
 *   - test-push           Send a test push to one specific
 *                         subscription (or the most-recently
 *                         updated active subscription if none
 *                         specified).
 *   - test-order-event    Emit one of the order.* events for an
 *                         existing order so the order-notification
 *                         and order-push-notification subscribers
 *                         fire end-to-end.
 *   - run-abandoned-cart  Run the abandoned-cart cron job inline
 *                         so we can confirm it works without
 *                         waiting until midnight UTC.
 *   - config-snapshot     Dump the env / VAPID / SMTP config so
 *                         the marketer can see at a glance what
 *                         the running process *thinks* the config
 *                         is, separate from the .env on disk.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, any>
  const action = (body.action || "").toString()

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as any

  try {
    switch (action) {
      case "config-snapshot":
        return res.json(buildConfigSnapshot())

      case "test-smtp":
        return res.json(await runTestSmtp(req, body))

      case "test-push":
        return res.json(await runTestPush(req, body))

      case "test-order-event":
        return res.json(await runTestOrderEvent(req, body))

      case "run-abandoned-cart":
        return res.json(await runAbandonedCartNow(req))

      default:
        return res.status(400).json({
          ok: false,
          error: `Unknown action "${action}". Valid: test-smtp, test-push, test-order-event, run-abandoned-cart, config-snapshot`,
        })
    }
  } catch (err: any) {
    logger?.error?.(
      `[notification-diagnostics] action=${action} threw: ${err?.message || err}`
    )
    return res.status(500).json({
      ok: false,
      action,
      error: err?.message || String(err),
      stack: err?.stack?.split("\n").slice(0, 8).join("\n"),
    })
  }
}

/** GET returns a quick config snapshot so the dashboard can render it on load. */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json(buildConfigSnapshot())
}

function buildConfigSnapshot() {
  const cfg = configureWebPush()
  return {
    ok: true,
    smtp: {
      host: process.env.SMTP_HOST || "smtp.gmail.com (default)",
      port: Number(process.env.SMTP_PORT) || 587,
      user: maskEmail(process.env.SMTP_USER || ""),
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "(empty)",
      from_name:
        process.env.SMTP_FROM_NAME ||
        process.env.STORE_NAME ||
        process.env.MEDUSA_STORE_NAME ||
        "(none — will fallback to email local-part)",
      from_header_preview: buildFromHeaderPreview(),
      password_set: Boolean(process.env.SMTP_PASS),
    },
    vapid: {
      configured: cfg.configured,
      public_key_set: Boolean(process.env.VAPID_PUBLIC_KEY),
      private_key_set: Boolean(process.env.VAPID_PRIVATE_KEY),
      subject: process.env.VAPID_SUBJECT || "(unset — using fallback)",
      public_key_fingerprint: cfg.publicKey
        ? `${cfg.publicKey.slice(0, 8)}…${cfg.publicKey.slice(-6)}`
        : null,
    },
    env: {
      worker_mode: process.env.MEDUSA_WORKER_MODE || "shared (default)",
      node_env: process.env.NODE_ENV || "(unset)",
      backend_url: process.env.MEDUSA_BACKEND_URL || "(unset)",
      storefront_url: process.env.STOREFRONT_URL || "(unset)",
    },
  }
}

/**
 * Mirror the SMTP service's From-header resolution so the admin can
 * see exactly what their recipients will see — without sending a
 * real email. Keep this in sync with `email-notifications/service.ts`.
 */
function buildFromHeaderPreview(): string {
  const fromRaw = (process.env.SMTP_FROM || process.env.SMTP_USER || "").trim()
  if (!fromRaw) return "(SMTP_FROM not set)"

  const fromAddressMatch = fromRaw.match(/<([^>]+)>/)
  const bareEmail = fromAddressMatch
    ? fromAddressMatch[1].trim()
    : fromRaw
  const embeddedDisplayName = (() => {
    const m = fromRaw.match(/^\s*"?([^"<]+?)"?\s*</)
    return m ? m[1].trim() : ""
  })()

  const localPartFallback = (() => {
    const local = bareEmail.split("@")[0] || ""
    if (!local) return ""
    return local
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  })()

  const displayName =
    process.env.SMTP_FROM_NAME?.trim() ||
    process.env.STORE_NAME?.trim() ||
    process.env.MEDUSA_STORE_NAME?.trim() ||
    embeddedDisplayName ||
    localPartFallback ||
    ""

  return displayName ? `"${displayName}" <${bareEmail}>` : bareEmail
}

function maskEmail(s: string): string {
  if (!s) return "(empty)"
  const [local, domain] = s.split("@")
  if (!domain) return s.slice(0, 2) + "***"
  return `${local.slice(0, 2)}***@${domain}`
}

/**
 * Send a test email through the SMTP provider. Routes through
 * `notificationModuleService.createNotifications` so we exercise
 * the same path the order subscriber uses — that way "if this
 * works, transactional emails should work too" is a real signal.
 */
async function runTestSmtp(req: MedusaRequest, body: Record<string, any>) {
  const to = (body.to || "").toString().trim()
  if (!to || !to.includes("@")) {
    return { ok: false, error: "`to` must be a valid email address" }
  }

  const notificationService = req.scope.resolve(Modules.NOTIFICATION) as any
  const startedAt = Date.now()

  const result = await notificationService.createNotifications({
    to,
    channel: "email",
    template: "contact-received",
    data: {
      store_name: process.env.STORE_NAME || "Diagnostics Test",
      logo_url: undefined,
      copyright: undefined,
      theme: undefined,
      name: "Notification Diagnostics",
      email: process.env.SMTP_FROM || "no-reply@example.com",
      phone: "n/a",
      subject: "SMTP Diagnostic Test",
      message:
        "This is a test email sent from the admin notification-diagnostics endpoint. " +
        "If you can read it, the SMTP provider, credentials, and Medusa Notification " +
        "Module routing are all working correctly.",
    },
  })

  return {
    ok: true,
    duration_ms: Date.now() - startedAt,
    notification_ids: Array.isArray(result)
      ? result.map((r: any) => r?.id)
      : [result?.id],
    sent_to: to,
    note: "Check the recipient inbox AND the spam folder. Gmail can take 30–60s.",
  }
}

/**
 * Send a one-off push to a single subscription. If no `endpoint`
 * is given, we pick the most-recently-updated active subscription
 * — useful for "send a push to my own browser without copy-pasting
 * an endpoint URL."
 */
async function runTestPush(req: MedusaRequest, body: Record<string, any>) {
  const cfg = configureWebPush()
  if (!cfg.configured) {
    return {
      ok: false,
      error:
        "VAPID keys are not configured. Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in backend .env and restart.",
    }
  }

  const svc: any = req.scope.resolve(PUSH_NOTIFICATIONS_MODULE)
  const requestedEndpoint = body.endpoint
    ? String(body.endpoint).trim()
    : null
  const customerId = body.customer_id ? String(body.customer_id) : null

  let subs: any[] = []
  if (requestedEndpoint) {
    subs = await svc.listPushSubscriptions({ endpoint: requestedEndpoint })
  } else if (customerId) {
    subs = await svc.listPushSubscriptions(
      { customer_id: customerId, is_active: true },
      { take: 5 }
    )
  } else {
    subs = await svc.listPushSubscriptions(
      { is_active: true },
      { order: { updated_at: "DESC" } as any, take: 1 }
    )
  }

  if (!subs?.length) {
    return {
      ok: false,
      error:
        "No matching push subscription found. Subscribe a browser first, " +
        "or pass `endpoint` / `customer_id` in the request body.",
    }
  }

  const payload = {
    title: (body.title || "Diagnostic Push").toString(),
    body: (
      body.body ||
      "If you can read this, web-push + VAPID are working."
    ).toString(),
    icon: body.icon_url ? String(body.icon_url) : undefined,
    url: body.action_url ? String(body.action_url) : "/",
    tag: `diagnostic-${Date.now()}`,
  }

  const results: Array<{
    subscription_id: any
    customer_id: any
    city: any
    device_browser: any
    success: boolean
    status_code: number | undefined
    expired: boolean | undefined
    error: string | undefined
  }> = []
  for (const sub of subs) {
    const r = await sendPushTo(
      { id: sub.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    )
    results.push({
      subscription_id: sub.id,
      customer_id: sub.customer_id,
      city: sub.city,
      device_browser: sub.device_browser,
      success: r.success,
      status_code: r.statusCode,
      expired: r.expired,
      error: r.error,
    })
  }

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return {
    ok: sent > 0,
    targeted: results.length,
    sent,
    failed,
    payload,
    results,
  }
}

/**
 * Manually emit an order.* event so the order-notification and
 * order-push-notification subscribers fire. Useful when
 * "I placed an order but no email" — we re-fire the event for
 * the same order id and watch the logs / inbox.
 */
async function runTestOrderEvent(req: MedusaRequest, body: Record<string, any>) {
  const eventName = (body.event_name || "order.placed").toString()
  let orderId = body.order_id ? String(body.order_id) : null

  // If no order id, pick the most recent order so the test is one-click.
  if (!orderId) {
    const orderService = req.scope.resolve(Modules.ORDER) as any
    const [latest] = await orderService.listOrders(
      {},
      { order: { created_at: "DESC" } as any, take: 1 }
    )
    if (!latest) {
      return {
        ok: false,
        error:
          "No orders exist yet. Pass `order_id` or place an order first.",
      }
    }
    orderId = latest.id
  }

  const eventBus = req.scope.resolve(Modules.EVENT_BUS) as any
  await eventBus.emit({
    name: eventName,
    data: { id: orderId },
  })

  return {
    ok: true,
    emitted: eventName,
    order_id: orderId,
    note: "Subscribers run async. Check pm2 logs for [OrderNotification] / [PushNotification] lines within ~5s.",
  }
}

/**
 * Manually invoke the abandoned-cart cron job so the admin can
 * verify it works without waiting until midnight UTC. The job's
 * default file already encapsulates the full sweep — we just
 * dynamically import + call it with the live container.
 */
async function runAbandonedCartNow(req: MedusaRequest) {
  // Dynamic import keeps the diagnostic file decoupled — if the
  // job file is renamed we get a clear error here instead of
  // pulling everything into the bundle.
  const mod = await import("../../../jobs/send-abandoned-cart-notification.js")
  const handler = (mod as any).default
  if (typeof handler !== "function") {
    return {
      ok: false,
      error:
        "abandoned-cart-notification job did not export a default function",
    }
  }

  const startedAt = Date.now()
  await handler(req.scope)
  return {
    ok: true,
    duration_ms: Date.now() - startedAt,
    note: "See pm2 logs for `Sent N abandoned cart notifications` line.",
  }
}
