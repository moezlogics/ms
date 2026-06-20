import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Badge,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { A } from "../../lib/admin-theme"

type Lead = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: "new" | "read" | "replied" | "archived"
  created_at: string
}

const STATUS_COLORS: Record<string, "green" | "blue" | "orange" | "grey"> = {
  new: "green",
  read: "blue",
  replied: "orange",
  archived: "grey",
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
  archived: "Archived",
}

async function fetchLeads(status?: string): Promise<{ leads: Lead[]; count: number }> {
  const url = status
    ? `/admin/contact-leads?status=${status}`
    : "/admin/contact-leads"
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function updateStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/admin/contact-leads/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`/admin/contact-leads/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
}

const Page = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [selected, setSelected] = useState<Lead | null>(null)

  const refresh = async () => {
    try {
      const data = await fetchLeads(filterStatus || undefined)
      setLeads(data.leads)
      setCount(data.count)
    } catch (e) {
      toast.error("Load failed: " + (e as Error).message)
    }
  }

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  const onStatusChange = async (lead: Lead, status: string) => {
    try {
      await updateStatus(lead.id, status)
      toast.success("Status updated")
      if (selected?.id === lead.id) setSelected({ ...selected, status: status as any })
      await refresh()
    } catch (e) {
      toast.error("Update failed: " + (e as Error).message)
    }
  }

  const onDelete = async (lead: Lead) => {
    if (!window.confirm(`Delete lead from ${lead.name}? This can't be undone.`)) return
    try {
      await deleteLead(lead.id)
      toast.success("Lead deleted")
      if (selected?.id === lead.id) setSelected(null)
      await refresh()
    } catch (e) {
      toast.error("Delete failed: " + (e as Error).message)
    }
  }

  const onOpen = async (lead: Lead) => {
    setSelected(lead)
    // Auto-mark as read when opened
    if (lead.status === "new") {
      await onStatusChange(lead, "read")
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <p>Loading leads...</p>
      </Container>
    )
  }

  return (
    <Container className="p-6">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <Heading>Contact Leads</Heading>
          <p style={{ fontSize: 13, color: A.fgSubtle, marginTop: 4 }}>
            {count} total submission{count !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8 }}>
          {["", "new", "read", "replied", "archived"].map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "primary" : "secondary"}
              size="small"
              onClick={() => setFilterStatus(s)}
            >
              {s === "" ? "All" : STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selected ? "1fr 1fr" : "1fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Lead list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.length === 0 ? (
            <div
              style={{
                border: "1px dashed " + A.borderVal,
                borderRadius: 8,
                padding: 40,
                textAlign: "center",
                color: A.fgSubtle,
              }}
            >
              <p style={{ fontSize: 14 }}>No leads found.</p>
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => onOpen(lead)}
                style={{
                  border: `1px solid ${selected?.id === lead.id ? "#818cf8" : A.borderVal}`,
                  borderRadius: 8,
                  padding: 14,
                  background: lead.status === "new" ? "#052e16" : A.bgCard,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: lead.status === "new" ? 700 : 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lead.name}
                      </span>
                      <Badge color={STATUS_COLORS[lead.status] || "grey"} size="xsmall">
                        {STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: A.fgSubtle }}>{lead.email}</div>
                    {lead.subject && (
                      <div
                        style={{
                          fontSize: 13,
                          color: A.fg,
                          marginTop: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lead.subject}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 12,
                        color: A.fgMuted,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lead.message}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: A.fgMuted, whiteSpace: "nowrap" }}>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div
            style={{
              border: A.border,
              borderRadius: 8,
              padding: 20,
              background: A.bgCard,
              position: "sticky",
              top: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                Lead Details
              </h3>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Row label="Name" value={selected.name} />
              <Row
                label="Email"
                value={
                  <a
                    href={`mailto:${selected.email}`}
                    style={{ color: "#6366f1" }}
                  >
                    {selected.email}
                  </a>
                }
              />
              {selected.phone && <Row label="Phone" value={selected.phone} />}
              {selected.subject && <Row label="Subject" value={selected.subject} />}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  Message
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: A.fg,
                    whiteSpace: "pre-wrap",
                    background: A.bgField,
                    borderRadius: 6,
                    padding: 12,
                    border: A.border,
                  }}
                >
                  {selected.message}
                </div>
              </div>
              <Row
                label="Received"
                value={new Date(selected.created_at).toLocaleString()}
              />
              <Row
                label="Status"
                value={
                  <Badge color={STATUS_COLORS[selected.status] || "grey"}>
                    {STATUS_LABELS[selected.status] || selected.status}
                  </Badge>
                }
              />

              {/* Status actions */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  Change Status
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["new", "read", "replied", "archived"] as const).map((s) => (
                    <Button
                      key={s}
                      variant={selected.status === s ? "primary" : "secondary"}
                      size="small"
                      onClick={() => onStatusChange(selected, s)}
                    >
                      {STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: A.border, paddingTop: 12 }}>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onDelete(selected)}
                >
                  Delete Lead
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

const Row = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: A.fgSubtle,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 2,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 14, color: A.fg }}>{value}</div>
  </div>
)

export const config = defineRouteConfig({
  label: "Contact Leads",
})

export default Page
