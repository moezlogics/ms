import {
  getSiteSettings,
  isAnnouncementBarVisible,
} from "@lib/data/site-settings"
import AnnouncementBar from "./index"

/**
 * Server wrapper: reads admin site-settings and renders the announcement bar
 * only if the admin has enabled it AND set text.
 */
export default async function AnnouncementBarServer() {
  const settings = await getSiteSettings()
  if (!isAnnouncementBarVisible(settings)) return null

  const socialMap: Array<{ key: string; icon: string; label: string }> = [
    { key: "social_facebook", icon: "facebook-logo", label: "Facebook" },
    { key: "social_instagram", icon: "instagram-logo", label: "Instagram" },
    { key: "social_twitter", icon: "x-logo", label: "Twitter / X" },
    { key: "social_youtube", icon: "youtube-logo", label: "YouTube" },
    { key: "social_pinterest", icon: "pinterest-logo", label: "Pinterest" },
    { key: "social_tiktok", icon: "tiktok-logo", label: "TikTok" },
  ]

  const socialLinks = socialMap
    .map((s) => ({ ...s, url: (settings[s.key] || "").trim() }))
    .filter((s) => !!s.url)

  const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
  const bg = settings.announcement_bar_bg?.trim()
  const fg = settings.announcement_bar_fg?.trim()

  // Admins enter one announcement per line in the textarea. Each line
  // becomes its own item in the marquee, so 1, 2 or 3 short messages
  // can all loop together in a single continuous strip.
  const texts = (settings.announcement_bar_text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (texts.length === 0) return null

  // Optional admin-tuned scroll speed (pixels per second). Defaults to
  // 60 if unset / unparseable.
  const rawSpeed = Number(settings.announcement_bar_speed)
  const speedPxPerSec =
    Number.isFinite(rawSpeed) && rawSpeed > 0 ? Math.min(200, rawSpeed) : 60

  return (
    <AnnouncementBar
      texts={texts}
      socialLinks={socialLinks}
      bg={bg && HEX.test(bg) ? bg : null}
      fg={fg && HEX.test(fg) ? fg : null}
      speedPxPerSec={speedPxPerSec}
    />
  )
}
