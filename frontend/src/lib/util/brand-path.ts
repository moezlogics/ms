import type { Brand } from "@lib/data/brands"

/**
 * Build the canonical URL path for a brand by walking its
 * `parent_id` chain up to the root. Returns a slash-separated
 * string of handles — `apple/mac/m4-air` — that callers concatenate
 * with `/brands/` (and an optional locale prefix) to form an href.
 *
 * Inputs:
 *   • `brand`     — the leaf brand to render.
 *   • `allBrands` — a flat list of every brand the storefront has
 *                   loaded (from `listBrands()`). We index it once
 *                   so deep chains are O(depth) lookups.
 *
 * Mirrors `buildCategoryPath()` in spirit but uses an `id → brand`
 * map because Medusa categories ship `parent_category` embedded in
 * the row, while brands only carry `parent_id` and we have to
 * resolve siblings ourselves.
 *
 * Defensive on missing parents: a chain that points at a deleted
 * or unloaded parent is truncated at that point rather than
 * producing a URL with `undefined` segments.
 */
export function buildBrandPath(
  brand: Pick<Brand, "id" | "handle" | "parent_id">,
  allBrands: Array<Pick<Brand, "id" | "handle" | "parent_id">>
): string {
  if (!brand?.handle) return ""

  const byId = new Map<string, Pick<Brand, "id" | "handle" | "parent_id">>()
  for (const b of allBrands) {
    if (b?.id) byId.set(b.id, b)
  }

  const segments: string[] = [brand.handle]
  const visited = new Set<string>([brand.id])

  let parentId = brand.parent_id
  while (parentId) {
    if (visited.has(parentId)) break // cycle-safe — should never happen
    const parent = byId.get(parentId)
    if (!parent || !parent.handle) break // unknown / orphan — stop
    visited.add(parent.id)
    segments.unshift(parent.handle)
    parentId = parent.parent_id
  }

  return segments.join("/")
}

/**
 * Build the parent-chain (root → leaf, excluding the leaf itself)
 * for breadcrumb rendering. Each entry has the brand reference and
 * the full URL path to that level.
 *
 *   buildBrandChain(macBrand, allBrands)
 *     → [{ brand: apple, path: "apple" }]
 */
export function buildBrandChain(
  brand: Pick<Brand, "id" | "handle" | "parent_id">,
  allBrands: Array<Pick<Brand, "id" | "handle" | "parent_id" | "name">>
): Array<{ brand: Pick<Brand, "id" | "handle" | "name">; path: string }> {
  if (!brand?.parent_id) return []
  const byId = new Map<string, any>()
  for (const b of allBrands) {
    if (b?.id) byId.set(b.id, b)
  }

  const chain: Array<{ brand: any; path: string }> = []
  const visited = new Set<string>([brand.id])
  let parentId: string | null = brand.parent_id

  while (parentId) {
    if (visited.has(parentId)) break
    const parent = byId.get(parentId)
    if (!parent) break
    visited.add(parent.id)
    chain.unshift({ brand: parent, path: "" })
    parentId = parent.parent_id ?? null
  }

  // Fill in `path` for each chain entry by walking forward again.
  let acc = ""
  for (const entry of chain) {
    acc = acc ? `${acc}/${entry.brand.handle}` : entry.brand.handle
    entry.path = acc
  }
  return chain
}

/**
 * Tree-builder for ShopFilters sidebar — converts a flat list of
 * brands into a parent → children adjacency map keyed by parent id
 * (or "" for top-level). Lets the recursive `BrandNode` traverse
 * without doing N filter passes.
 */
export type BrandTreeNode = Brand & { children: BrandTreeNode[] }

export function buildBrandTree(brands: Brand[]): BrandTreeNode[] {
  const byParent = new Map<string, BrandTreeNode[]>()
  const nodes = brands.map<BrandTreeNode>((b) => ({ ...b, children: [] }))
  const byId = new Map(nodes.map((n) => [n.id, n]))

  for (const node of nodes) {
    const parentKey = node.parent_id || ""
    if (!byParent.has(parentKey)) byParent.set(parentKey, [])
    byParent.get(parentKey)!.push(node)
  }

  // Wire children — single pass; ignores orphans (parent not in list).
  for (const node of nodes) {
    const kids = byParent.get(node.id) || []
    node.children = kids
  }

  const roots = (byParent.get("") || []).slice()

  // Orphans: brands whose parent_id points at a brand we never loaded.
  // Surface them as top-level so they don't silently disappear.
  for (const node of nodes) {
    if (node.parent_id && !byId.has(node.parent_id)) {
      roots.push(node)
    }
  }

  // Stable sort by sort_order then name.
  const sortFn = (a: BrandTreeNode, b: BrandTreeNode) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    a.name.localeCompare(b.name)
  roots.sort(sortFn)
  for (const node of nodes) node.children.sort(sortFn)

  return roots
}

/**
 * Builds the dynamic canonical URL path for a brand without the legacy `/brands` prefix.
 * Example: `/apple` or `/apple/mac`
 */
export function getBrandPath(
  brand: any,
  allBrands: any[]
): string {
  if (!brand) return "/"
  const path = buildBrandPath(brand, allBrands) || brand.handle
  return `/${path}`
}

