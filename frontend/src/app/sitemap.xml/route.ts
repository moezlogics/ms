import { NextResponse } from "next/server"
import { generateSitemaps } from "../sitemap"
import { getBaseURL } from "@lib/util/env"

export async function GET() {
  const baseUrl = getBaseURL()
  let sitemaps = [{ id: 0 }]
  try {
    sitemaps = await generateSitemaps()
  } catch (error) {
    console.error("[sitemap-route] failed to generate sitemaps", error)
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.map(s => `<sitemap><loc>${baseUrl}/sitemap/${s.id}.xml</loc></sitemap>`).join("")}
</sitemapindex>`
  
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  })
}
