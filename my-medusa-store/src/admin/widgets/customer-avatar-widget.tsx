import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminCustomer } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"

/**
 * Customer details — avatar widget.
 *
 * Renders at the top of every customer detail page in the admin so an
 * operator can recognise the user at a glance:
 *
 *   ┌────────────────────────────────────────┐
 *   │  ●●●  Sarah Khan                       │
 *   │  ●●●  Female · sarah@example.com       │
 *   │  ●●●  Profile 100% · 12 orders         │
 *   └────────────────────────────────────────┘
 *
 * The same fallback chain the storefront `<Avatar />` uses applies:
 *   1. `customer.metadata.avatar_url` (uploaded photo on the CDN)
 *   2. `customer.metadata.gender` ("male" / "female") → tinted glyph
 *   3. Initials on a neutral pill
 *
 * No edit affordance here — the admin shouldn't be silently changing
 * a customer's profile photo; that's the customer's own decision.
 */

const FEMALE_BG = "linear-gradient(135deg,#fbcfe8 0%,#f9a8d4 100%)"
const MALE_BG = "linear-gradient(135deg,#bfdbfe 0%,#93c5fd 100%)"
const NEUTRAL_BG = "linear-gradient(135deg,#e5e7eb 0%,#d1d5db 100%)"

function initialsFrom(first?: string | null, last?: string | null): string {
  const f = (first || "").trim()
  const l = (last || "").trim()
  if (!f && !l) return ""
  return (
    (f[0] || "").toUpperCase() + (l[0] || "").toUpperCase()
  ).slice(0, 2)
}

const CustomerAvatarWidget = ({ data }: DetailWidgetProps<AdminCustomer>) => {
  const meta = ((data as any)?.metadata || {}) as Record<string, any>
  const avatarUrl =
    typeof meta.avatar_url === "string" && meta.avatar_url.trim()
      ? meta.avatar_url.trim()
      : null
  const gender =
    typeof meta.gender === "string" ? meta.gender.trim().toLowerCase() : ""
  const completionStamp =
    typeof meta.profile_completion_rewarded_at === "string"
      ? meta.profile_completion_rewarded_at
      : null

  const fullName = [data.first_name, data.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  const displayName = fullName || data.email || "Customer"

  let avatarBlock: React.ReactNode
  if (avatarUrl) {
    avatarBlock = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${displayName} profile photo`}
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      />
    )
  } else if (gender === "female" || gender === "male") {
    avatarBlock = (
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: gender === "female" ? FEMALE_BG : MALE_BG,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          color: gender === "female" ? "#9d174d" : "#1e40af",
        }}
        aria-label={`${displayName} avatar`}
      >
        {gender === "female" ? "♀" : "♂"}
      </div>
    )
  } else {
    const initials = initialsFrom(data.first_name, data.last_name)
    avatarBlock = (
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: NEUTRAL_BG,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 600,
          color: "#525252",
        }}
        aria-label={`${displayName} avatar`}
      >
        {initials || "U"}
      </div>
    )
  }

  const genderLabel = gender
    ? gender.charAt(0).toUpperCase() + gender.slice(1)
    : null

  return (
    <Container className="p-0 overflow-hidden">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: 20,
        }}
      >
        {avatarBlock}
        <div style={{ minWidth: 0, flex: 1 }}>
          <Heading level="h2" className="mb-0">
            {displayName}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {[
              genderLabel,
              data.email,
              avatarUrl ? "Photo on CDN" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {completionStamp && (
            <Text size="xsmall" className="text-ui-fg-muted mt-1">
              Profile completed {new Date(completionStamp).toLocaleDateString()}
            </Text>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.before",
})

export default CustomerAvatarWidget
