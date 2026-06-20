import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework/http";
import { PostBundledProductsSchema } from "./admin/bundled-products/route";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { PostCartsBundledLineItemsSchema } from "./store/carts/[id]/line-item-bundles/route";
import { rateLimit } from "./middlewares/rate-limit";
import { securityHeaders } from "./middlewares/security-headers";
import { loginLockout } from "./middlewares/login-lockout";

export default defineMiddlewares({
  routes: [
    /* ── Baseline security headers on every response ──────────────── */
    {
      matcher: "/*",
      middlewares: [securityHeaders],
    },

    /* ── Admin login lockout: 3 failed attempts → 1-hour IP ban ───── */
    {
      matcher: "/auth/user/emailpass",
      methods: ["POST"],
      middlewares: [loginLockout],
    },

    /* ── Rate limits on abuse-prone, user-action endpoints ────────── *
     * Only endpoints driven by a direct browser action are limited so
     * that server-side (SSR) storefront fetches — which all share one
     * IP — are never throttled. Limits are per-IP, per-bucket.        */
    {
      // Login / token issue — brute-force guard.
      matcher: "/auth/*",
      methods: ["POST"],
      middlewares: [rateLimit({ bucket: "auth", max: 12, windowMs: 60_000 })],
    },
    {
      // OTP send/verify/reset — stops SMS/email abuse & code guessing.
      matcher: "/store/auth/otp/*",
      methods: ["POST"],
      middlewares: [rateLimit({ bucket: "otp", max: 6, windowMs: 60_000 })],
    },
    {
      // Public contact form — spam guard.
      matcher: "/store/contact",
      methods: ["POST"],
      middlewares: [rateLimit({ bucket: "contact", max: 5, windowMs: 60_000 })],
    },
    {
      // AI chat — each message can cost an OpenAI call, so cap it.
      matcher: "/store/chat/message",
      methods: ["POST"],
      middlewares: [rateLimit({ bucket: "chat", max: 20, windowMs: 60_000 })],
    },
    {
      // Review submission — spam guard.
      matcher: "/store/reviews",
      methods: ["POST"],
      middlewares: [rateLimit({ bucket: "reviews", max: 10, windowMs: 60_000 })],
    },
    {
      // AI-assisted (incl. guest COD) order placement — abuse guard.
      matcher: "/store/chat/confirm-order",
      methods: ["POST"],
      middlewares: [rateLimit({ bucket: "chat-order", max: 8, windowMs: 60_000 })],
    },
    {
      // Guest order claiming — strict (an order id is a capability).
      matcher: "/store/my-orders/link-guest",
      methods: ["POST"],
      middlewares: [rateLimit({ bucket: "guest-link", max: 10, windowMs: 60_000 })],
    },
    {
      // Guest order/review reads — generous but bounded.
      matcher: "/store/my-orders/by-guest",
      methods: ["GET"],
      middlewares: [rateLimit({ bucket: "guest-read", max: 60, windowMs: 60_000 })],
    },
    {
      matcher: "/store/my-reviews/by-guest",
      methods: ["GET"],
      middlewares: [rateLimit({ bucket: "guest-read", max: 60, windowMs: 60_000 })],
    },
    {
      matcher: "/admin/bundled-products",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(PostBundledProductsSchema),
      ],
    },
    {
      matcher: "/admin/bundled-products",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          defaults: [
            "id", 
            "title", 
            "product.*", 
            "items.*", 
            "items.product.*",
          ],
          isList: true,
          defaultLimit: 15,
        }),
      ],
    },
    {
      matcher: "/store/carts/:id/line-item-bundles",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(PostCartsBundledLineItemsSchema)
      ],
    }
  ]
})