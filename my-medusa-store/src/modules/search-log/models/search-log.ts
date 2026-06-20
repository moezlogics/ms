import { model } from "@medusajs/framework/utils"

/**
 * Aggregated search-query log used to power trending suggestions in
 * the storefront search bar. We do NOT store per-event rows (which
 * would balloon over time and need pruning) — instead we keep one
 * row per normalized lowercase query and bump `count` + `last_used_at`
 * every time it's hit.
 *
 * Privacy note: we never associate the query with a customer or
 * session here. It's purely a "what's popular" leaderboard.
 */
export const SearchLog = model.define("search_log", {
  id: model.id({ prefix: "slog" }).primaryKey(),
  /** Normalized lowercase query (trimmed). */
  query: model.text(),
  /** Total times this query has been logged. */
  count: model.number().default(1),
  /**
   * Last time this query was searched — used to expire stale entries
   * out of the trending window so old seasonal terms eventually drop
   * off the list.
   */
  last_used_at: model.dateTime().nullable(),
})
