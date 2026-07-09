import { NextResponse } from "next/server"
import { getSiteSettings } from "../../lib/data/site-settings"
import * as fs from "fs"
import * as path from "path"

export async function GET() {
  try {
    const settings = await getSiteSettings()
    let faviconUrl = settings.site_favicon_url?.trim()

    if (faviconUrl) {
      // Support relative path fallback by prepending CDN URL
      if (!faviconUrl.startsWith("http")) {
        const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || ""
        faviconUrl = `${cdnUrl.replace(/\/$/, "")}/${faviconUrl.replace(/^\//, "")}`
      }

      const res = await fetch(faviconUrl, {
        next: { revalidate: 3600 }
      } as any)

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/webp"
        const buffer = await res.arrayBuffer()
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            // Cache in browser and CDN for 1 day
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        })
      }
    }
  } catch (err) {
    console.error("Error serving dynamic favicon:", err)
  }

  // Fallback to local default-favicon.webp
  try {
    const fallbackPath = path.join(process.cwd(), "public", "default-favicon.webp")
    if (fs.existsSync(fallbackPath)) {
      const buffer = fs.readFileSync(fallbackPath)
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      })
    }
  } catch (fallbackErr) {
    console.error("Error serving fallback favicon:", fallbackErr)
  }

  return new NextResponse(null, { status: 404 })
}
