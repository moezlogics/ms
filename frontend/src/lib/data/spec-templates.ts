"use server"

import { sdk } from "@lib/config"
import { SpecTemplate, isSpecTemplate } from "@lib/util/spec-template"
import { getCacheOptions } from "./cookies"

/**
 * Fetch the resolved spec template for a category — i.e. the
 * category's own `metadata.spec_template` if set, otherwise the
 * nearest ancestor's. Returns `null` when no template is found.
 *
 * Backed by the `GET /store/spec-templates/:categoryId` route which
 * walks up to four levels of the parent chain server-side. Cached
 * via Next.js' fetch cache so the work runs once per category until
 * the admin edits a template.
 */
export async function getCategorySpecTemplate(
  categoryId: string | null | undefined
): Promise<{
  template: SpecTemplate | null
  source: "self" | "ancestor" | "none"
  source_id: string | null
  source_name: string | null
}> {
  if (!categoryId) {
    return { template: null, source: "none", source_id: null, source_name: null }
  }
  const next = {
    ...(await getCacheOptions("spec-templates")),
  }
  try {
    const data = await sdk.client.fetch<{
      template: SpecTemplate | null
      source: "self" | "ancestor" | "none"
      source_id: string | null
      source_name: string | null
    }>(`/store/spec-templates/${categoryId}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    if (data?.template && isSpecTemplate(data.template)) {
      return data
    }
  } catch {
    // Fall through to null on any backend hiccup — the storefront
    // gracefully degrades to the heuristic spec grouping.
  }
  return { template: null, source: "none", source_id: null, source_name: null }
}

/**
 * Resolve a template for the FIRST category that has one, walking
 * the array of category ids in order. Returns the first hit, or null
 * if none of them have any template defined.
 */
export async function getFirstResolvedTemplate(
  categoryIds: Array<string | null | undefined>
): Promise<{
  template: SpecTemplate | null
  source_name: string | null
}> {
  for (const id of categoryIds) {
    if (!id) continue
    const r = await getCategorySpecTemplate(id)
    if (r.template) {
      return { template: r.template, source_name: r.source_name }
    }
  }
  return { template: null, source_name: null }
}
