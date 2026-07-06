const fs = require("fs")
const url = process.argv[2] || "http://localhost:3061/mobile/samsung-galaxy-a07"

async function main() {
  const res = await fetch(url)
  const h = await res.text()
  console.log("status", res.status, "bytes", h.length)
  console.log("BAILOUT", h.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING"))
  console.log("lcp-hero", h.includes("data-lcp-hero"))
  console.log("fetchpriority high", /fetchpriority="high"|fetchPriority="high"/i.test(h))
  const preloads = [...h.matchAll(/<link[^>]+rel="preload"[^>]+as="image"[^>]*>/gi)].map((m) => m[0])
  console.log("image preloads:", preloads.length)
  preloads.forEach((p, i) => console.log(`  ${i + 1}`, p.slice(0, 140)))
  console.log("product in body img", /<img[^>]+samsung-galaxy-a07/i.test(h))
  console.log("logo preload early", /<link rel="preload" as="image"[^>]+mobilestore-V6IMdNlJ/i.test(h))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
