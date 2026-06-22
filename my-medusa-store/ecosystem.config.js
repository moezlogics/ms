cat > /home/mobilestore-api/htdocs/api.mobilestore.pk/ecosystem.config.js << 'SCRIPT'
/**
 * Medusa v2 process config — SINGLE SHARED process.
 *
 * Why shared (not a separate server + worker split):
 *   In "shared" mode ONE process handles BOTH the HTTP API AND the
 *   background worker (event subscribers + scheduled jobs + the Redis
 *   event-bus loop). This is the most robust setup for a single VPS —
 *   there's no separate "worker" process that can be forgotten / crash,
 *   which was exactly why auto push + auto emails weren't firing
 *   (manual push works because it's an HTTP route; order.placed /
 *   customer.created are EVENTS that need the worker loop).
 *
 * `instances: 1` + fork so scheduled jobs (e.g. abandoned-cart) don't
 * double-run. For this store one instance is plenty.
 */

const fs = require("fs")
const path = require("path")

// Read .env file manually at PM2 startup and inject all variables into the environment.
// This ensures variables (like JWT_SECRET, COOKIE_SECRET, REDIS_URL) are persistent
// and identical across PM2 start/reload/restart calls, preventing session logouts.
const envPath = path.join(__dirname, ".env")
const envConfig = {}

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8")
  envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ""
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1)
      }
      envConfig[key] = value.trim()
    }
  })
}

module.exports = {
  apps: [
    {
      name: "medusa",
      cwd: "/home/mobilestore-api/htdocs/api.mobilestore.pk",
      // Run via npm so the medusa CLI is resolved correctly regardless of
      // where the binary lives (the hard-coded @medusajs/cli/bin path does
      // not exist in this install). package.json "start" = "medusa start".
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3062,
        MEDUSA_WORKER_MODE: "shared",
        MEDUSA_ADMIN_DISABLE: "true",
        ...envConfig
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1500M",
      kill_timeout: 8000,
      listen_timeout: 15000,
      error_file: "/home/mobilestore-api/htdocs/api.mobilestore.pk/logs/medusa-error.log",
      out_file: "/home/mobilestore-api/htdocs/api.mobilestore.pk/logs/medusa-out.log",
      merge_logs: true,
      time: true
    }
  ]
};
SCRIPT

mkdir -p /home/mobilestore-api/htdocs/api.mobilestore.pk/logs

