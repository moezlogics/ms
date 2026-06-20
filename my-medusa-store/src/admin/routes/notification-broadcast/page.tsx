import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EnvelopeSolid } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Checkbox,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

/**
 * Customer Groups → Broadcast page.
 *
 * Lets the marketer pick one or more Medusa customer groups, then
 * either send a branded email or a web push to every customer in
 * those groups (with a push subscription, in the push case).
 *
 * Why a single page for both channels:
 *   - The audience picker (group multi-select + dry-run reach) is
 *     identical for both. Re-rendering it twice would just split
 *     the surface area without giving the marketer anything new.
 *   - Channel is a tab toggle, so they can compose an email AND
 *     a complementary push in one session without losing context.
 */

type Group = {
  id: string
  name: string
  customer_count?: number
}

async function fetchGroups(): Promise<Group[]> {
  // Medusa admin exposes /admin/customer-groups. We pull just the
  // fields we actually render to keep the request light.
  const r = await fetch("/admin/customer-groups?limit=100&fields=id,name", {
    credentials: "include",
  })
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  return (data.customer_groups || data.groups || []) as Group[]
}

async function broadcast(payload: Record<string, any>) {
  const res = await fetch("/admin/notification-broadcast", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [channel, setChannel] = useState<"email" | "push">("email")

  // Email form
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  // Push form
  const [pushTitle, setPushTitle] = useState("")
  const [pushBody, setPushBody] = useState("")
  const [pushIcon, setPushIcon] = useState("")
  const [pushImage, setPushImage] = useState("")
  const [pushUrl, setPushUrl] = useState("")

  const [busy, setBusy] = useState(false)
  const [estimate, setEstimate] = useState<{
    customers: number
    eligible: number
  } | null>(null)
  const [lastResponse, setLastResponse] = useState<{
    status: number
    body: any
  } | null>(null)

  useEffect(() => {
    fetchGroups()
      .then((g) => setGroups(g))
      .catch((e) =>
        toast.error("Failed to load customer groups: " + (e as Error).message)
      )
      .finally(() => setLoadingGroups(false))
  }, [])

  const groupIds = useMemo(() => [...selected], [selected])

  // Run a dry-run whenever audience changes so the marketer sees
  // reach in real time. Debounced so toggling 5 groups in a row
  // only fires one estimate.
  useEffect(() => {
    if (groupIds.length === 0) {
      setEstimate(null)
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const r = await broadcast({
          channel,
          customer_group_ids: groupIds,
          dry_run: true,
          // dummy fields so server validation passes; server ignores them
          // when dry_run=true is set.
          subject: "preview",
          message: "preview",
          title: "preview",
          body: "preview",
        })
        if (cancelled) return
        if (channel === "email") {
          setEstimate({
            customers: r.body?.total_resolved ?? 0,
            eligible: r.body?.total_with_email ?? 0,
          })
        } else {
          setEstimate({
            customers: r.body?.total_resolved_customers ?? 0,
            eligible: r.body?.total_subscriptions ?? 0,
          })
        }
      } catch {
        if (!cancelled) setEstimate(null)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [groupIds, channel])

  const toggleGroup = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onSend = async () => {
    if (groupIds.length === 0) {
      toast.error("Select at least one customer group")
      return
    }

    let payload: Record<string, any>
    if (channel === "email") {
      if (!subject.trim() || !message.trim()) {
        toast.error("Subject and message are required")
        return
      }
      payload = {
        channel: "email",
        customer_group_ids: groupIds,
        subject: subject.trim(),
        message: message.trim(),
      }
    } else {
      if (!pushTitle.trim() || !pushBody.trim()) {
        toast.error("Push title and body are required")
        return
      }
      payload = {
        channel: "push",
        customer_group_ids: groupIds,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        icon_url: pushIcon.trim() || undefined,
        image_url: pushImage.trim() || undefined,
        action_url: pushUrl.trim() || undefined,
      }
    }

    if (
      !window.confirm(
        `Send this ${channel} to ${estimate?.eligible ?? "?"} ${
          channel === "email" ? "recipients" : "push subscribers"
        }? This cannot be undone.`
      )
    ) {
      return
    }

    setBusy(true)
    setLastResponse(null)
    try {
      const r = await broadcast(payload)
      setLastResponse({ status: r.status, body: r.body })
      if (r.body?.ok) {
        toast.success(
          `Sent ${r.body.sent ?? "?"} / ${
            r.body.total_with_email ?? r.body.total_subscriptions ?? "?"
          } — failed: ${r.body.failed ?? 0}`
        )
        // Clear composition after success but keep the audience selection
        // — the marketer often wants to send a follow-up to the same group.
        if (channel === "email") {
          setSubject("")
          setMessage("")
        } else {
          setPushTitle("")
          setPushBody("")
          setPushIcon("")
          setPushImage("")
          setPushUrl("")
        }
      } else {
        toast.error("Broadcast failed — see response below")
      }
    } catch (e: any) {
      toast.error(`Threw: ${e?.message || e}`)
      setLastResponse({ status: 0, body: { error: e?.message || String(e) } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="p-6 space-y-6">
      <div>
        <Heading level="h1">Customer Group Broadcast</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          Send a branded email or web push to every customer in the selected
          customer groups.
        </Text>
      </div>

      {/* ── Audience picker ── */}
      <div className="rounded-lg border border-ui-border-base p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Heading level="h3">Audience</Heading>
          {estimate && (
            <Badge color={estimate.eligible > 0 ? "green" : "orange"}>
              {estimate.customers} customers · {estimate.eligible}{" "}
              {channel === "email" ? "with email" : "push subs"}
            </Badge>
          )}
        </div>
        {loadingGroups ? (
          <Text className="text-ui-fg-subtle">Loading groups…</Text>
        ) : groups.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No customer groups exist yet. Create one in Customers → Groups.
          </Text>
        ) : (
          <div className="grid grid-cols-1 medium:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto">
            {groups.map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-ui-border-base hover:bg-ui-bg-subtle cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(g.id)}
                  onCheckedChange={() => toggleGroup(g.id)}
                />
                <span className="text-sm">{g.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Channel toggle ── */}
      <div className="flex gap-2">
        <Button
          variant={channel === "email" ? "primary" : "secondary"}
          onClick={() => setChannel("email")}
        >
          Email
        </Button>
        <Button
          variant={channel === "push" ? "primary" : "secondary"}
          onClick={() => setChannel("push")}
        >
          Push
        </Button>
      </div>

      {/* ── Composition ── */}
      <div className="rounded-lg border border-ui-border-base p-4 space-y-3">
        {channel === "email" ? (
          <>
            <Heading level="h3">Compose email</Heading>
            <div>
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Special offer for you"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Plain text or basic HTML — branded layout is added automatically."
                rows={8}
              />
            </div>
          </>
        ) : (
          <>
            <Heading level="h3">Compose push</Heading>
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
              <div>
                <Label>Icon URL</Label>
                <Input
                  value={pushIcon}
                  onChange={(e) => setPushIcon(e.target.value)}
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={pushImage}
                  onChange={(e) => setPushImage(e.target.value)}
                />
              </div>
              <div className="medium:col-span-2">
                <Label>Action URL (where the click goes)</Label>
                <Input
                  value={pushUrl}
                  onChange={(e) => setPushUrl(e.target.value)}
                  placeholder="/products/special-offer"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button variant="primary" isLoading={busy} onClick={onSend}>
            Send {channel}
          </Button>
        </div>
      </div>

      {lastResponse && (
        <div className="rounded-lg border border-ui-border-base p-4 bg-ui-bg-base space-y-2">
          <div className="flex items-center gap-2">
            <Heading level="h3">Last response</Heading>
            <Badge color={lastResponse.body?.ok ? "green" : "red"}>
              HTTP {lastResponse.status}
            </Badge>
          </div>
          <pre className="bg-ui-bg-subtle p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-[300px]">
            {JSON.stringify(lastResponse.body, null, 2)}
          </pre>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Group Broadcast",
  icon: EnvelopeSolid,
})

export default Page
