import { NextRequest, NextResponse } from "next/server"

/**
 * Google OAuth callback — Medusa V2 customer flow.
 *
 * This is a ROUTE HANDLER (not a Page) because writing the
 * `_medusa_jwt` httpOnly cookie is only legal from Route Handlers /
 * Server Actions / Middleware in Next.js. The previous client-side
 * page tried `document.cookie = ...` which can NEVER set httpOnly
 * cookies, so the rest of the storefront (which reads via
 * `nextCookies()` in `lib/data/cookies.ts`) treated the user as
 * anonymous and bounced them back to the login screen.
 *
 * Flow:
 *   A) Forward Google's `code` + `state` to Medusa's
 *      `/auth/customer/google/callback`.
 *   B) Decode the returned JWT — if `actor_id` is set the user is
 *      already linked to a Customer, jump straight to step D.
 *   C) First-time Google user: pull email/name out of the JWT's
 *      `app_metadata.google` (Medusa stamps the OAuth profile there),
 *      POST `/store/customers` with the registration bearer to create
 *      the Customer, then POST `/auth/token/refresh` to get a new
 *      token that carries `actor_id`.
 *   D) Set the httpOnly `_medusa_jwt` cookie and 302 to `/account`.
 *
 * Errors render a small HTML page with a "Try again" link instead of
 * crashing — the most common cause is the user closing the Google
 * tab early or revoking access mid-consent.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:3062" // fallback to 3060 if needed
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type DecodedToken = {
  actor_id?: string | null
  auth_identity_id?: string | null
  app_metadata?: Record<string, any>
  user_metadata?: Record<string, any>
  email?: string
  iat?: number
  exp?: number
}

function decodeJwt(token: string): DecodedToken | null {
  try {
    const [, payload] = token.split(".")
    if (!payload) return null
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=")
    const json = Buffer.from(
      padded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8")
    return JSON.parse(json)
  } catch {
    return null
  }
}

function errorResponse(message: string, debug?: string): NextResponse {
  // Static-but-themeable error page. We ship plain HTML so the route
  // works even if every other part of the build is broken.
  const safeMessage = message.replace(/[<>&]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
  )
  const safeDebug = debug
    ? debug.replace(/[<>&]/g, (c) =>
        c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
      )
    : ""
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Sign-in didn't complete</title>
  <meta name="robots" content="noindex" />
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fafafa;color:#1f1f1f;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{max-width:440px;width:100%;text-align:center}
    .icon{width:64px;height:64px;margin:0 auto 24px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center}
    h1{font-size:24px;margin:0 0 12px;font-weight:600}
    p{margin:0 0 24px;color:#525252;font-size:14px;line-height:1.5}
    a.btn{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 24px;border-radius:9999px;background:#1f1f1f;color:#fff;text-decoration:none;font-weight:600;font-size:14px}
    a.btn:hover{background:#000}
    pre{margin-top:12px;padding:12px;background:#f4f4f5;border-radius:8px;font-size:11px;color:#737373;text-align:left;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg></div>
    <h1>Sign-in didn't complete</h1>
    <p>${safeMessage}</p>
    ${safeDebug ? `<pre>${safeDebug}</pre>` : ""}
    <a class="btn" href="/account">Try again</a>
  </div>
</body>
</html>`
  return new NextResponse(html, {
    status: 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}

async function fetchBackend(
  path: string,
  init: RequestInit & { token?: string } = {}
) {
  const headers = new Headers(init.headers || {})
  // Only attach JSON content-type when we're actually sending a body —
  // some Medusa V2 routes parse strictly and a stray content-type on a
  // GET trips the request validator.
  if (init.body) headers.set("content-type", "application/json")
  if (PUBLISHABLE_KEY) headers.set("x-publishable-api-key", PUBLISHABLE_KEY)
  if (init.token) headers.set("authorization", `Bearer ${init.token}`)
  const { token, ...rest } = init
  return fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    headers,
    cache: "no-store",
  })
}

function applySessionCookie(res: NextResponse, token: string) {
  res.cookies.set("_medusa_jwt", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl
  const error = url.searchParams.get("error")
  const code = url.searchParams.get("code")

  // Resolve the post-auth landing page. Priority:
  //   1. Explicit `?return_to=` query (rare — Google strips this)
  //   2. The `_medusa_return_to` cookie set when the user clicked the
  //      "Continue with Google" button on /cart, /checkout, or /account.
  //   3. Default to `/account`.
  // The cookie is cleared once consumed so a future stale value can't
  // hijack a normal sign-in.
  const queryReturn = url.searchParams.get("return_to")
  let cookieReturn: string | null = null
  try {
    const { getReturnTo, clearReturnTo } = await import("@lib/data/cookies")
    cookieReturn = await getReturnTo()
    if (cookieReturn) await clearReturnTo()
  } catch {
    /* `next/headers` only works in this scope when the file is server-only — fine */
  }
  const returnToCandidate = queryReturn || cookieReturn || "/account"
  const returnTo =
    returnToCandidate.startsWith("/") && !returnToCandidate.startsWith("//")
      ? returnToCandidate
      : "/account"

  if (error) {
    return errorResponse(
      url.searchParams.get("error_description") ||
        `Google rejected the sign-in (${error}).`
    )
  }
  if (!code) {
    return errorResponse("No authorization code received from Google.")
  }

  // Step A — exchange Google's code+state for a Medusa token.
  //
  // Medusa V2's `auth-google` provider only reads the `state` parameter
  // from the QUERY STRING (see `@medusajs/auth-google/services/google.js`
  // → `validateCallback`). If we forward `state` in the JSON body, the
  // provider returns "No state provided, or session expired" and the
  // backend responds 401, which we'd render as a 400 page. So we must
  // forward both `code` and `state` (and any extra query params Google
  // tacked on) AS THE QUERY STRING on the request to the backend.
  const state = url.searchParams.get("state") || ""
  const fwd = new URLSearchParams()
  fwd.set("code", code)
  if (state) fwd.set("state", state)
  // Pass through any extra params Google adds (scope, authuser, hd…)
  // — most are ignored by the provider but do no harm.
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== "code" && k !== "state" && !fwd.has(k)) fwd.set(k, v)
  }
  const cbRes = await fetchBackend(
    `/auth/customer/google/callback?${fwd.toString()}`,
    { method: "GET" }
  )
  const cbBody = await cbRes.text()
  let cbData: any = null
  try {
    cbData = cbBody ? JSON.parse(cbBody) : null
  } catch {
    /* keep raw */
  }
  if (!cbRes.ok) {
    console.error("[GoogleCallback] backend rejected exchange", {
      status: cbRes.status,
      body: cbBody?.slice(0, 500),
    })
    return errorResponse(
      "The Google sign-in could not be verified.",
      cbData?.message || cbBody
    )
  }

  const token: string | undefined = cbData?.token
  if (!token || typeof token !== "string") {
    return errorResponse(
      "The auth server did not return a session token.",
      cbBody
    )
  }

  const decoded = decodeJwt(token)

  // Behind a reverse proxy (nginx, Cloudflare, Vercel) `req.nextUrl.host`
  // is the *internal* host (e.g. `localhost:3060`) — redirecting to
  // that 302s the user out of the public domain. The proxy injects the
  // real public host in `x-forwarded-host` / `x-forwarded-proto`, and
  // production deployments also expose it via `NEXT_PUBLIC_BASE_URL`.
  // Resolution order: env var → forwarded headers → request host.
  const fwdHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host
  const fwdProto =
    req.headers.get("x-forwarded-proto") ||
    (fwdHost.startsWith("localhost") ? "http" : "https")
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${fwdProto}://${fwdHost}`
  const target = new URL(returnTo, baseUrl)

  // Step B — already linked to a Customer? Save the cookie and redirect.
  if (decoded?.actor_id) {
    const res = NextResponse.redirect(target, { status: 303 })
    applySessionCookie(res, token)
    return res
  }

  // Step B.2 — Link Google identity to an existing Customer sharing the same email if found.
  let isLinked = false
  try {
    const linkRes = await fetchBackend("/store/auth/google-link", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    if (linkRes.ok) {
      const linkData = await linkRes.json()
      if (linkData?.linked) {
        isLinked = true
      }
    }
  } catch (linkErr) {
    console.error("[GoogleCallback] Failed to check/link identity", linkErr)
  }

  if (isLinked) {
    // Link successful! Refresh token so JWT carries the customer's actor_id
    let finalToken = token
    try {
      const refreshRes = await fetchBackend("/auth/token/refresh", {
        method: "POST",
        token,
      })
      if (refreshRes.ok) {
        const refreshed = (await refreshRes.json()) as { token?: string }
        if (refreshed?.token) finalToken = refreshed.token
      }
    } catch {
      // Non-fatal
    }

    const res = NextResponse.redirect(target, { status: 303 })
    applySessionCookie(res, finalToken)
    return res
  }

  // Step C — first-time Google sign-in. Create the Customer.
  //
  // Medusa V2's auth-google provider stamps the Google profile onto the
  // provider_identity's `user_metadata`, and `generateJwtTokenForAuthIdentity`
  // (see `@medusajs/medusa/api/auth/utils/generate-jwt-token.js`) copies
  // it onto the JWT's `user_metadata`. The JWT's `app_metadata` only
  // carries `{ customer_id, roles }` and is therefore useless for the
  // profile lookup — we must read `user_metadata` first. We still try
  // legacy locations as a last resort to stay compatible with older
  // Medusa releases.
  const userMeta = decoded?.user_metadata || {}
  const appMeta = decoded?.app_metadata || {}
  const googleMeta = (appMeta as any).google || {}

  const email =
    userMeta.email ||
    googleMeta.email ||
    decoded?.email ||
    (appMeta as any).email ||
    null
  const firstName =
    userMeta.given_name ||
    googleMeta.given_name ||
    (userMeta as any).first_name ||
    null
  const lastName =
    userMeta.family_name ||
    googleMeta.family_name ||
    (userMeta as any).last_name ||
    null

  if (!email) {
    return errorResponse(
      "Google didn't share an email address — we can't finish creating your account.",
      JSON.stringify(decoded?.app_metadata || {}, null, 2)
    )
  }

  const createRes = await fetchBackend("/store/customers", {
    method: "POST",
    token,
    body: JSON.stringify({
      email,
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
    }),
  })

  if (!createRes.ok) {
    const body = await createRes.text()
    return errorResponse(
      "We signed you in with Google but couldn't create your account.",
      body
    )
  }

  // Step D — refresh the token so the new JWT carries `actor_id`.
  // The JWT we got in step A was minted before the Customer existed,
  // so its `actor_id` is null — Medusa's customer middleware would
  // reject it. POST /auth/token/refresh with the old bearer; the
  // returned token now has `actor_id` set.
  let finalToken = token
  try {
    const refreshRes = await fetchBackend("/auth/token/refresh", {
      method: "POST",
      token,
    })
    if (refreshRes.ok) {
      const refreshed = (await refreshRes.json()) as { token?: string }
      if (refreshed?.token) finalToken = refreshed.token
    }
  } catch {
    // Non-fatal — the original token will still resolve to the
    // newly-created customer on the very next request because the
    // auth_identity is now linked. Refresh just upgrades the JWT.
  }

  const res = NextResponse.redirect(target, { status: 303 })
  applySessionCookie(res, finalToken)
  return res
}
