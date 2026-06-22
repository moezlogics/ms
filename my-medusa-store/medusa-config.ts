import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/* ------------------------------------------------------------------ *
 * SECRETS — STABLE across restarts/builds (this is what keeps people
 * logged in) but NOT a public hardcoded value.
 *
 * Why this matters: JWT_SECRET signs every admin AND customer token,
 * and COOKIE_SECRET signs session cookies. If either value changes
 * between restarts, every existing token becomes invalid and EVERYONE
 * (admin + storefront) is logged out. So the #1 rule is: keep these
 * values identical forever.
 *
 *   1. If the env var is set (recommended), use it. As long as the same
 *      value lives in `.env` on every deploy, nobody gets logged out.
 *   2. If it's missing we DO NOT throw — crashing the API would violate
 *      "the site must never go down". Instead we fall back to a STABLE
 *      string (constant across restarts → sessions survive) and log a
 *      loud warning so the operator sets a real secret for security.
 *
 * The fallback is intentionally constant (not random) — a random
 * per-boot value is exactly what causes "logged out on every restart".
 * ------------------------------------------------------------------ */
const resolveSecret = (name: string, stableFallback: string): string => {
  const val = process.env[name]
  if (val && val.trim().length > 0) return val.trim()
  console.error(
    `[config] ${name} is NOT set. Using a STABLE insecure fallback so sessions survive ` +
      `restarts, but you SHOULD set ${name} in .env for security. Generate one with: ` +
      `openssl rand -hex 32   (then redeploy — note: changing it logs everyone out once).`
  )
  return stableFallback
}

const jwtSecret = resolveSecret('JWT_SECRET', 'insecure-stable-jwt-secret-set-JWT_SECRET-in-env')
const cookieSecret = resolveSecret('COOKIE_SECRET', 'insecure-stable-cookie-secret-set-COOKIE_SECRET-in-env')

// Build auth providers list, only including Google when credentials are set
const authProviders: any[] = [
  {
    resolve: "@medusajs/medusa/auth-emailpass",
    id: "emailpass",
    options: {
      hashConfig: { logN: 15, r: 8, p: 1 },
    },
  },
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authProviders.push({
    resolve: "@medusajs/medusa/auth-google",
    id: "google",
    options: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
  })
}

export default defineConfig({
  admin: {
    path: '/app',
    disable: false, 
    vite: () => {
      return {
        server: {
          allowedHosts: ["api.mobilestore.pk", "localhost"]
        }
      }
    }
  },


  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret,
      cookieSecret,
      // Token lifetime. Medusa's default is short (~1 day) which logs
      // both admins and customers out daily. 30d keeps sessions alive
      // for a month; the value is overridable via JWT_EXPIRES_IN.
      // (This is the per-token TTL — separate from the cookie maxAge on
      // the storefront, which we match to 30d in cookies.ts.)
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
    },
  },
  modules: {
    /* ---------------------------------------------------------------- *
     * Redis-backed CACHE + EVENT BUS + WORKFLOW ENGINE                 *
     *                                                                  *
     * Activated automatically when REDIS_URL is set AND the matching   *
     * provider packages are installed:                                 *
     *   pnpm add @medusajs/cache-redis \                               *
     *           @medusajs/event-bus-redis \                            *
     *           @medusajs/workflow-engine-redis                        *
     *                                                                  *
     * Without these the project falls back to Medusa's in-memory       *
     * defaults (single-node, dev-only). Production should always use   *
     * Redis so multi-replica deploys share state and high-traffic      *
     * pages don't re-query the DB on every hit.                        *
     * ---------------------------------------------------------------- */
    /* EVENT BUS — ALWAYS local (in-memory), NOT Redis.
     *
     * This is a single shared process (ecosystem.config.js: instances:1,
     * fork). The local event bus delivers events synchronously IN-PROCESS,
     * which is reliable for this setup. The Redis event bus was configured
     * but was NOT delivering events (order.placed, customer.created, etc.)
     * to subscribers — orders completed fine over HTTP, but NO subscriber
     * (customer push, transactional emails, welcome, admin push) ever
     * fired. Switching the event bus to local makes every subscriber fire
     * again. Cache + workflow engine stay on Redis. */
    [Modules.EVENT_BUS]: {
      resolve: "@medusajs/event-bus-local",
    },
    ...(process.env.REDIS_URL
      ? {
          [Modules.CACHE]: {
            resolve: "@medusajs/cache-redis",
            options: { redisUrl: process.env.REDIS_URL, ttl: 60 },
          },
          [Modules.WORKFLOW_ENGINE]: {
            resolve: "@medusajs/workflow-engine-redis",
            options: {
              redis: { url: process.env.REDIS_URL },
            },
          },
        }
      : {}),

    [Modules.AUTH]: {
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: authProviders,
      },
    },
    [Modules.NOTIFICATION]: {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/email-notifications",
            id: "smtp-notification",
            // CRITICAL: `channels` MUST live at the provider top-level in
            // Medusa V2. When nested inside `options` (as it was before),
            // the notification module sees no provider registered for the
            // "email" channel, so every `createNotifications({ channel:
            // "email", ... })` call silently no-ops — explaining why
            // order-placed, contact-form, OTP and password-reset emails
            // were all going nowhere. See:
            // https://docs.medusajs.com/resources/architectural-modules/notification
            channels: ["email"],
            options: {
              host: process.env.SMTP_HOST || "smtp.gmail.com",
              port: Number(process.env.SMTP_PORT) || 587,
              user: process.env.SMTP_USER || "",
              pass: process.env.SMTP_PASS || "",
              from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
            },
          },
        ],
      },
    },
    [Modules.FILE]: {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/cdn-file",
            id: "cdn",
            options: {
              url: process.env.CDN_PUBLIC_URL,
              key: process.env.CDN_API_KEY,
            },
          },
        ],
      },
    },
    // Custom modules (using underscores instead of hyphens)

    "blog": {
      resolve: "./src/modules/blog",
    },
    "site_settings": {
      resolve: "./src/modules/site-settings",
    },
    "banners": {
      resolve: "./src/modules/banners",
    },
    "search_log": {
      resolve: "./src/modules/search-log",
    },
    "contact_leads": {
      resolve: "./src/modules/contact-leads",
    },
    "advanced_reviews": {
      resolve: "./src/modules/advanced_reviews",
    },
    "brand": {
      resolve: "./src/modules/brand",
    },
    "push_notifications": {
      resolve: "./src/modules/push-notifications",
    },

    // --- NEW MODULES (from Medusa examples + custom) ---

    // OTP Auth Module — 6-digit OTP for signup/password reset
    "otp_auth": {
      resolve: "./src/modules/otp-auth",
    },

    // Loyalty Points Module — earn & redeem points
    "loyalty": {
      resolve: "./src/modules/loyalty",
    },

    // Bundled Products Module — product bundles with discount
    "bundledProduct": {
      resolve: "./src/modules/bundled-product",
    },

    // Agentic Commerce Module — AI agent (ChatGPT) integration +
    // storefront AI shopping-assistant chatbot.
    "agenticCommerce": {
      resolve: "./src/modules/agentic-commerce",
      options: {
        signatureKey: resolveSecret(
          "AGENTIC_COMMERCE_SIGNATURE_KEY",
          "insecure-stable-agentic-signature-set-in-env"
        ),
        openaiApiKey: process.env.OPENAI_API_KEY,
        openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
    },

    // Custom Spec Template Module
    "specTemplate": {
      resolve: "./src/modules/spec-template",
    },
  },
  plugins: [

    {
      resolve: "@rokmohar/medusa-plugin-meilisearch",
      options: {
        config: {
          host: process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700",
          apiKey: process.env.MEILISEARCH_API_KEY || "",
        },
        settings: {
          products: {
            indexSettings: {
              searchableAttributes: ["title", "description", "variant_sku"],
              displayedAttributes: ["id", "title", "description", "variant_sku", "thumbnail", "handle"],
            },
            primaryKey: "id",
          },
        },
      },
    },
    ...(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET
      ? [
        {
          resolve: "@variablevic/google-analytics-medusa",
          options: {
            measurementId: process.env.GA_MEASUREMENT_ID,
            apiSecret: process.env.GA_API_SECRET,
            debug: process.env.NODE_ENV !== "production",
          },
        },
      ]
      : []),
  ],
})
