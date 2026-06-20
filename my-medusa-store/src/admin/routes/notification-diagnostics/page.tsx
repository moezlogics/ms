import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BellAlert } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Badge,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

/**
 * Notification Diagnostics admin page.
 *
 * One-click tests for every notification path the storefront uses:
 *   - SMTP send (via Notification Module)
 *   - Web push to a single subscription
 *   - Re-emit an order.* event for an existing order
 *   - Run the abandoned-cart cron job inline
 *
 * Each test surfaces the raw response from the server (including
 * stack traces on 500s) so the marketer / dev can copy-paste the
 * exact failure message instead of digging through pm2 logs.
 */

type Snapshot = {
  ok: boolean
  smtp: {
    host: string
    port: number
    user: string
    from: string
    from_name: string
    from_header_preview: string
    password_set: boolean
  }
  vapid: {
    configured: boolean
    public_key_set: boolean
    private_key_set: boolean
    subject: string
    public_key_fingerprint: string | null
  }
  env: {
    worker_mode: string
    node_env: string
    backend_url: string
    storefront_url: string
  }
}

async function postDiagnostic(action: string, payload: Record<string, any> = {}) {
  const res = await fetch("/admin/notification-diagnostics", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  })
  const text = await res.text()
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    body = { ok: false, error: text }
  }
  return { status: res.status, body }
}

const Page = () => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<{
    title: string
    status: number
    body: any
  } | null>(null)

  // Form state for each test
  const [smtpTo, setSmtpTo] = useState("")
  const [pushEndpoint, setPushEndpoint] = useState("")
  const [pushTitle, setPushTitle] = useState("Diagnostic Push")
  const [pushBody, setPushBody] = useState(
    "If you can read this, web-push + VAPID are working."
  )
  const [orderId, setOrderId] = useState("")
  const [eventName, setEventName] = useState("order.placed")

  const refreshSnapshot = async () => {
    try {
      const r = await fetch("/admin/notification-diagnostics", {
        credentials: "include",
      })
      const data = await r.json()
      setSnapshot(data)
    } catch (e) {
      toast.error("Failed to load config snapshot")
    }
  }

  useEffect(() => {
    refreshSnapshot()
  }, [])

  const run = async (
    action: string,
    label: string,
    payload: Record<string, any> = {}
  ) => {
    setBusy(action)
    setLastResponse(null)
    try {
      const r = await postDiagnostic(action, payload)
      setLastResponse({ title: label, status: r.status, body: r.body })
      if (r.body?.ok) toast.success(`${label} succeeded`)
      else toast.error(`${label} failed — see response below`)
    } catch (e: any) {
      setLastResponse({
        title: label,
        status: 0,
        body: { ok: false, error: e?.message || String(e) },
      })
      toast.error(`${label} threw: ${e?.message || e}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Container className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Heading level="h1">Notification Diagnostics</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Test every notification path. Each test surfaces the raw
            backend response so silent failures become visible.
          </Text>
        </div>
        <Button variant="secondary" size="small" onClick={refreshSnapshot}>
          Refresh config
        </Button>
      </div>

      {/* ── Config Snapshot ── */}
      {snapshot && (
        <div className="rounded-lg border border-ui-border-base p-4 bg-ui-bg-subtle space-y-3">
          <Heading level="h3">Live config (what the running server sees)</Heading>
          <div className="grid grid-cols-1 medium:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="font-semibold text-ui-fg-base">SMTP</div>
              <KV k="Host" v={snapshot.smtp.host} />
              <KV k="Port" v={String(snapshot.smtp.port)} />
              <KV k="User" v={snapshot.smtp.user} />
              <KV k="From email" v={snapshot.smtp.from} />
              <KV
                k="From name"
                v={snapshot.smtp.from_name}
                bad={snapshot.smtp.from_name.startsWith("(none")}
              />
              <KV
                k="From header"
                v={snapshot.smtp.from_header_preview}
              />
              <KV
                k="Password"
                v={snapshot.smtp.password_set ? "✅ set" : "❌ missing"}
                bad={!snapshot.smtp.password_set}
              />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-ui-fg-base">VAPID</div>
              <KV
                k="Configured"
                v={snapshot.vapid.configured ? "✅ yes" : "❌ no"}
                bad={!snapshot.vapid.configured}
              />
              <KV k="Subject" v={snapshot.vapid.subject} />
              <KV
                k="Pub key fp"
                v={snapshot.vapid.public_key_fingerprint || "(none)"}
              />
              <KV
                k="Priv key"
                v={snapshot.vapid.private_key_set ? "✅ set" : "❌ missing"}
                bad={!snapshot.vapid.private_key_set}
              />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-ui-fg-base">Runtime</div>
              <KV k="NODE_ENV" v={snapshot.env.node_env} />
              <KV k="Worker mode" v={snapshot.env.worker_mode} />
              <KV k="Backend URL" v={snapshot.env.backend_url} />
              <KV k="Storefront URL" v={snapshot.env.storefront_url} />
            </div>
          </div>
          <Text size="xsmall" className="text-ui-fg-muted">
            If "Worker mode" is <code>server</code>, scheduled jobs (like
            abandoned-cart) won't run. Use <code>shared</code> (default) on
            single-process deployments.
          </Text>
        </div>
      )}

      {/* ── Test SMTP ── */}
      <Section
        title="1. Test SMTP"
        description="Sends an email via the Notification Module → SMTP provider → nodemailer. If this fails, transactional emails (order placed, etc.) will too."
      >
        <Label>Send test to</Label>
        <Input
          type="email"
          value={smtpTo}
          onChange={(e) => setSmtpTo(e.target.value)}
          placeholder="you@example.com"
        />
        <Button
          variant="primary"
          isLoading={busy === "test-smtp"}
          disabled={!smtpTo.trim()}
          onClick={() => run("test-smtp", "Test SMTP", { to: smtpTo.trim() })}
        >
          Send test email
        </Button>
      </Section>

      {/* ── Test Push ── */}
      <Section
        title="2. Test Push"
        description="Sends a web push to one subscription. Leave endpoint empty to use the most recently active subscriber (handy for testing your own browser)."
      >
        <Label>Specific endpoint (optional)</Label>
        <Input
          value={pushEndpoint}
          onChange={(e) => setPushEndpoint(e.target.value)}
          placeholder="https://fcm.googleapis.com/fcm/send/..."
        />
        <div className="grid grid-cols-1 medium:grid-cols-2 gap-3">
          <div>
            <Label>Title</Label>
            <Input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Body</Label>
            <Input
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="primary"
          isLoading={busy === "test-push"}
          onClick={() =>
            run("test-push", "Test Push", {
              endpoint: pushEndpoint.trim() || undefined,
              title: pushTitle,
              body: pushBody,
            })
          }
        >
          Send test push
        </Button>
      </Section>

      {/* ── Test Order Event ── */}
      <Section
        title="3. Re-emit Order Event"
        description="Re-emits an order.* event. Lets you re-trigger order-notification + order-push-notification subscribers on an existing order. Leave order ID empty to use the most recent order."
      >
        <div className="grid grid-cols-1 medium:grid-cols-2 gap-3">
          <div>
            <Label>Order ID (optional)</Label>
            <Input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="order_01HX..."
            />
          </div>
          <div>
            <Label>Event name</Label>
            <select
              className="w-full h-9 px-2 border border-ui-border-base rounded-md bg-ui-bg-base text-sm"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            >
              <option value="order.placed">order.placed</option>
              <option value="order.completed">order.completed</option>
              <option value="order.canceled">order.canceled</option>
              <option value="order.fulfillment_created">
                order.fulfillment_created
              </option>
              <option value="shipment.created">shipment.created</option>
              <option value="delivery.created">delivery.created</option>
              <option value="payment.refunded">payment.refunded</option>
            </select>
          </div>
        </div>
        <Button
          variant="primary"
          isLoading={busy === "test-order-event"}
          onClick={() =>
            run("test-order-event", "Test Order Event", {
              order_id: orderId.trim() || undefined,
              event_name: eventName,
            })
          }
        >
          Emit event
        </Button>
      </Section>

      {/* ── Run Abandoned Cart Job ── */}
      <Section
        title="4. Run Abandoned-Cart Job Now"
        description="Invokes the cron job inline. Normally runs at 00:00 UTC daily. Use this to verify the job actually finds + emails carts without waiting until midnight."
      >
        <Button
          variant="primary"
          isLoading={busy === "run-abandoned-cart"}
          onClick={() =>
            run("run-abandoned-cart", "Run Abandoned-Cart Job")
          }
        >
          Run job now
        </Button>
      </Section>

      {/* ── Last Response ── */}
      {lastResponse && (
        <div className="rounded-lg border border-ui-border-base p-4 bg-ui-bg-base space-y-2">
          <div className="flex items-center gap-2">
            <Heading level="h3">{lastResponse.title}</Heading>
            <Badge color={lastResponse.body?.ok ? "green" : "red"}>
              HTTP {lastResponse.status}
            </Badge>
            <Badge color={lastResponse.body?.ok ? "green" : "red"}>
              {lastResponse.body?.ok ? "OK" : "FAIL"}
            </Badge>
          </div>
          <pre className="bg-ui-bg-subtle p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-[400px]">
            {JSON.stringify(lastResponse.body, null, 2)}
          </pre>
        </div>
      )}
    </Container>
  )
}

const Section = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) => (
  <div className="rounded-lg border border-ui-border-base p-4 space-y-3">
    <div>
      <Heading level="h3">{title}</Heading>
      <Text size="small" className="text-ui-fg-subtle mt-0.5">
        {description}
      </Text>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
)

const KV = ({ k, v, bad }: { k: string; v: string; bad?: boolean }) => (
  <div className="flex justify-between gap-4">
    <span className="text-ui-fg-subtle">{k}</span>
    <span
      className={`font-mono text-xs truncate max-w-[60%] ${
        bad ? "text-ui-fg-error" : "text-ui-fg-base"
      }`}
      title={v}
    >
      {v}
    </span>
  </div>
)

export const config = defineRouteConfig({
  label: "Notification Diagnostics",
  icon: BellAlert,
})

export default Page
