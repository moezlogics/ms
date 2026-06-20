import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// Static SPA build → host on an HTTPS subdomain (e.g. app.mobilestore.pk).
// The service worker (public/sw.js) and manifest are copied as-is from public/.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
})
