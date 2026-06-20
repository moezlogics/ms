import Image from "next/image"

/**
 * Universal customer avatar — WhatsApp-style.
 *
 * Fallback chain:
 *   1. `imageUrl` (from `customer.metadata.avatar_url`) — render the
 *      uploaded photo. Hosted on the site CDN; we never proxy it.
 *   2. Otherwise — render a flat, single-tone silhouette of a person
 *      on a tinted circle. The tint changes by gender so a logged-in
 *      customer still feels personalised before they upload a photo:
 *        - male   → cool blue
 *        - female → soft pink
 *        - other  → neutral slate
 *
 * Why no monogram fallback any more?
 *   The previous version mixed gender-illustrated SVGs with initials
 *   in different surfaces (sidebar showed letters, top-bar showed the
 *   illustration). Users complained the avatar looked "different
 *   everywhere". WhatsApp / Telegram / iMessage all use a flat
 *   silhouette as the universal default — we follow suit so a single
 *   `<Avatar>` call yields the same mark on every screen.
 *
 * Used everywhere a customer face is shown: account sidebar, account
 * dashboard hero, reviews, order timeline, admin customers list.
 */

export type AvatarProps = {
  /** Uploaded photo URL (CDN). Wins over every fallback when truthy. */
  imageUrl?: string | null
  /** Lower-cased gender value: "male" | "female" | anything else. */
  gender?: string | null
  /** Customer or guest name; used for initials in the bottom fallback. */
  name?: string | null
  /** Pixel size; defaults to 40. */
  size?: number
  /** Extra Tailwind classes for the outer wrapper. */
  className?: string
  /** Override `<img>` alt text. Defaults to `${name} profile photo` */
  alt?: string
  /** When true, render a small ring/border around the photo. */
  bordered?: boolean
}

// Flat palette — same hue family across the three default tints so
// the avatar has a uniform "silver/blue/pink chip" feel a la WA.
// Backgrounds are solid (no gradient) on purpose: gradients made the
// avatar feel like a marketing banner; flat fills sit better next to
// surrounding chrome on every page.
const TINTS: Record<"male" | "female" | "neutral", { bg: string; fg: string }> =
  {
    male: { bg: "#7baad6", fg: "#ffffff" },
    female: { bg: "#e6a4c9", fg: "#ffffff" },
    neutral: { bg: "#9ca3af", fg: "#ffffff" },
  }

export default function Avatar({
  imageUrl,
  gender,
  name,
  size = 40,
  className = "",
  alt,
  bordered = false,
}: AvatarProps) {
  const wrapperBase = `relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${
    bordered ? "ring-2 ring-bg" : ""
  } ${className}`

  const dim = { width: size, height: size }
  const dimStyle: React.CSSProperties = { width: size, height: size }

  // 1. Uploaded photo — best signal.
  if (imageUrl) {
    return (
      <span
        className={wrapperBase}
        style={dimStyle}
        data-avatar="photo"
      >
        <Image
          src={imageUrl}
          alt={alt || (name ? `${name} profile photo` : "Profile photo")}
          {...dim}
          className="object-cover"
          unoptimized
        />
      </span>
    )
  }

  // 2. Flat WhatsApp-style silhouette — same shape on every page.
  //    Tint changes with gender, but the icon never does. Keeping the
  //    glyph identical between male/female/neutral is the whole point
  //    of the redesign: callers like the sidebar and dashboard hero
  //    now share visual identity for the same customer.
  const g = (gender || "").toLowerCase().trim()
  const tintKey: "male" | "female" | "neutral" =
    g === "male" ? "male" : g === "female" ? "female" : "neutral"
  const tint = TINTS[tintKey]
  return (
    <span
      className={wrapperBase}
      style={{ ...dimStyle, background: tint.bg }}
      data-avatar={tintKey}
      aria-label={alt || `${name || "Guest"} avatar`}
    >
      <PersonGlyph size={size} color={tint.fg} />
    </span>
  )
}

/* ───────────────── SVG glyph ─────────────────
   Single, deliberately bland person silhouette — no hair styling, no
   shirt, no gender cues in the shape itself. Just the universally
   recognised "head + shoulders". Identical to WhatsApp / Telegram /
   iOS Mail's default contact icon so users instantly read it as
   "default avatar". The colour is supplied by the parent so the
   tinted background pairs cleanly. */

function PersonGlyph({ size, color }: { size: number; color: string }) {
  // 56% of the wrapper feels right at every common size (24-96px).
  const s = size * 0.56
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden
    >
      {/* Head */}
      <circle cx="12" cy="9" r="4" />
      {/* Shoulders — seamless smile-curve so it never looks cropped. */}
      <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5v1H4v-1z" />
    </svg>
  )
}

/* ───────────── Helper hook for the common case ─────────────
   `getAvatarPropsFromCustomer(customer)` collapses the noise of
   pulling avatar_url + gender + name out of the StoreCustomer DTO.
*/
export function getAvatarPropsFromCustomer(
  customer:
    | {
        first_name?: string | null
        last_name?: string | null
        email?: string | null
        metadata?: any
      }
    | null
    | undefined
): Pick<AvatarProps, "imageUrl" | "gender" | "name"> {
  const meta = (customer?.metadata as any) || {}
  const rawUrl =
    typeof meta.avatar_url === "string" ? meta.avatar_url.trim() : ""
  const rawGender =
    typeof meta.gender === "string" ? meta.gender.trim().toLowerCase() : ""
  const fullName = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  return {
    imageUrl: rawUrl || null,
    gender: rawGender || null,
    name: fullName || customer?.email || null,
  }
}
