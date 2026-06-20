import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Backend URL resolution — CRITICAL for archive/listing page speed.
//
// The SDK runs in BOTH the browser and the Next.js server. The browser MUST
// use the PUBLIC url (a browser can't reach the server's localhost). The
// SERVER should talk to the backend DIRECTLY over localhost/internal — NOT
// loop its requests back out through the public domain + Cloudflare. That
// round-trip was adding ~1-3s to every server-side fetch (product lists,
// filters, pagination on /store, brand, collection, category pages), which
// is exactly why archive pages felt slow while the heavily-cached homepage
// did not.
//
// Only NEXT_PUBLIC_* vars are inlined into the client bundle, so on the
// client `MEDUSA_BACKEND_URL` (non-public) is undefined and we fall back to
// the public url automatically.
const PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:3062"
const INTERNAL_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || PUBLIC_BACKEND_URL

const MEDUSA_BACKEND_URL =
  typeof window === "undefined" ? INTERNAL_BACKEND_URL : PUBLIC_BACKEND_URL

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}
