"use server"

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type Locale = {
  code: string
  name: string
}

// This backend has no /store/locales endpoint, so the call 404s — and
// error responses are never cached, so WITHOUT this memo the Nav re-fired
// the doomed request on EVERY page render (wasted roundtrip + backend log
// spam). Remember the failure for the process lifetime.
let localesUnavailable = false

/**
 * Fetches available locales from the backend.
 * Returns null if the endpoint returns 404 (locales not configured).
 */
export const listLocales = async (): Promise<Locale[] | null> => {
  if (localesUnavailable) return null

  const next = {
    ...(await getCacheOptions("locales")),
  }

  return sdk.client
    .fetch<{ locales: Locale[] }>(`/store/locales`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ locales }) => locales)
    .catch(() => {
      localesUnavailable = true
      return null
    })
}
