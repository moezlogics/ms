// Generates public/manifest.webmanifest at build/dev time so the installed
// app NAME = VITE_STORE_LABEL (env), without hardcoding it in the file.
import { writeFileSync, readFileSync, existsSync } from "node:fs"

function readLabel() {
  if (process.env.VITE_STORE_LABEL) return process.env.VITE_STORE_LABEL.trim()
  // Fallback: parse .env (and .env.production if present)
  for (const f of [".env.production", ".env"]) {
    if (existsSync(f)) {
      const m = readFileSync(f, "utf8").match(/^\s*VITE_STORE_LABEL\s*=\s*(.+)\s*$/m)
      if (m) return m[1].replace(/^["']|["']$/g, "").trim()
    }
  }
  return "Orders Admin"
}

const name = readLabel()
const manifest = {
  name,
  short_name: name.length > 12 ? name.slice(0, 12) : name,
  description: "View orders, change status, and get instant alerts on new orders.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  display_override: ["standalone", "fullscreen", "minimal-ui"],
  orientation: "portrait",
  background_color: "#09090b",
  theme_color: "#09090b",
  icons: [
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ],
}

writeFileSync("public/manifest.webmanifest", JSON.stringify(manifest, null, 2) + "\n")
console.log(`[gen-manifest] app name = "${name}"`)
