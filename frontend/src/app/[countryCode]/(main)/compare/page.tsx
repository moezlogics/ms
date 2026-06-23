import { Metadata } from "next"
import Link from "next/link"
import { HttpTypes } from "@medusajs/types"

import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { getProductPrice } from "@lib/util/get-product-price"
import { buildSpecMap } from "@lib/util/spec-groups"
import { formatSpecLabel } from "@lib/util/format-spec"
import { getFirstResolvedTemplate } from "@lib/data/spec-templates"
import { SpecTemplate } from "@lib/util/spec-template"
import CompareInteractive from "@modules/compare/components/compare-interactive"

export const metadata: Metadata = {
  title: "Compare Products",
  description:
    "Side-by-side comparison of electronics specifications, prices and features.",
  robots: { index: false, follow: true },
}

const MAX_COMPARE = 4

type PageProps = {
  params: { countryCode: string }
  searchParams: { h?: string | string[] }
}

function parseHandles(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : [raw]
  const flat: string[] = []
  for (const v of arr) {
    for (const piece of String(v).split(",")) {
      const h = piece.trim()
      if (h && !flat.includes(h)) flat.push(h)
    }
  }
  return flat.slice(0, MAX_COMPARE)
}

async function fetchProducts(
  handles: string[],
  countryCode: string
): Promise<HttpTypes.StoreProduct[]> {
  const region = await getRegion(countryCode)
  if (!region) return []

  const results = await Promise.all(
    handles.map(async (handle) => {
      try {
        const { response } = await listProducts({
          countryCode,
          regionId: region.id,
          queryParams: { handle, limit: 1 } as any,
        })
        return response.products[0] || null
      } catch {
        return null
      }
    })
  )
  return results.filter((p): p is HttpTypes.StoreProduct => !!p)
}

export default async function ComparePage({
  params: { countryCode },
  searchParams,
}: PageProps) {
  const handles = parseHandles(searchParams.h)
  const rawProducts = handles.length ? await fetchProducts(handles, countryCode) : []

  // 1. Filter by comparable !== false
  const comparableProducts = rawProducts.filter(
    (p) => (p.metadata as any)?.comparable !== false
  )

  // 2. Enforce same-category constraint
  let products: HttpTypes.StoreProduct[] = []
  let warningMessage: string | null = null
  let sharedCategoryId: string | null = null
  let sharedCategoryName: string | null = null

  if (comparableProducts.length > 0) {
    const firstProduct = comparableProducts[0]
    const firstCategory = firstProduct.categories?.[0]

    if (firstCategory) {
      sharedCategoryId = firstCategory.id
      sharedCategoryName = firstCategory.name || "Primary Category"

      products = comparableProducts.filter((p) =>
        p.categories?.some((c) => c.id === sharedCategoryId)
      )

      if (products.length < comparableProducts.length) {
        warningMessage = `Comparison is restricted to products within the same category (${sharedCategoryName}). Some products were excluded.`
      }
    } else {
      products = [firstProduct]
      warningMessage = `The product "${firstProduct.title}" has no category. Comparison is limited.`
    }
  }

  // If there are no products compared, show the empty state
  if (!products.length) {
    return (
      <div className="container-anvogue py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto">
          <div className="mx-auto w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
            <i className="ph ph-scales text-2xl text-ink/40" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">
            No products to compare
          </h1>
          <p className="text-sm text-ink/60 mb-6">
            Compare products side by side. Add products from the shop to start comparing their technical specifications.
          </p>
          <Link
            href={`/${countryCode}/store`}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:brightness-110"
          >
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  const specMaps = products.map((p) => {
    const rawSpecs = (p.metadata as any)?.specs || {}
    const calculatedPrice = getProductPrice({ product: p }).cheapestPrice?.calculated_price
    return buildSpecMap({
      ...rawSpecs,
      price_rs: rawSpecs.price_rs || calculatedPrice || undefined
    })
  })

  const allKeys = new Set<string>()
  for (const m of specMaps) {
    for (const k of Object.keys(m)) allKeys.add(k)
  }

  // Resolve template using candidate categories
  const candidateCategoryIds: string[] = []
  for (const p of products) {
    for (const c of p.categories || []) {
      if (c?.id && !candidateCategoryIds.includes(c.id)) {
        candidateCategoryIds.push(c.id)
      }
    }
  }
  const sharedTemplateResult = candidateCategoryIds.length
    ? await getFirstResolvedTemplate(candidateCategoryIds).catch(() => ({
        template: null as SpecTemplate | null,
        source_name: null,
      }))
    : { template: null as SpecTemplate | null, source_name: null }

  type ComparisonRow = {
    key: string
    label: string
    values: (string | null)[]
  }
  type ComparisonSection = {
    name: string
    icon: string
    rows: ComparisonRow[]
  }

  const sections: ComparisonSection[] = []

  if (sharedTemplateResult.template) {
    const usedKeys = new Set<string>()
    for (const g of sharedTemplateResult.template.groups) {
      const groupRows: ComparisonRow[] = []
      for (const f of g.fields) {
        const k = f.key.toLowerCase()
        const values = specMaps.map((m) => {
          const found = m[k]
          if (!found) return null
          return found.value || null
        })
        if (!values.some((v) => v && v.trim())) continue
        groupRows.push({ key: k, label: f.label, values })
        usedKeys.add(k)
      }
      if (groupRows.length > 0) {
        sections.push({
          name: g.name,
          icon: g.icon || "ph-info",
          rows: groupRows,
        })
      }
    }
    // Collect non-template custom specs
    const otherRows: ComparisonRow[] = []
    for (const k of Array.from(allKeys).sort()) {
      if (usedKeys.has(k)) continue
      const label =
        specMaps.find((m) => m[k])?.[k]?.label || formatSpecLabel(k)
      const values = specMaps.map((m) => m[k]?.value || null)
      otherRows.push({ key: k, label, values })
    }
    if (otherRows.length > 0) {
      sections.push({ name: "Other Specs", icon: "ph-info", rows: otherRows })
    }
  } else {
    // Fallback alphabetical sections
    const flatRows: ComparisonRow[] = Array.from(allKeys)
      .map((k) => {
        const label =
          specMaps.find((m) => m[k])?.[k]?.label || formatSpecLabel(k)
        const values = specMaps.map((m) => m[k]?.value || null)
        return { key: k, label, values }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
    if (flatRows.length > 0) {
      sections.push({ name: "Specifications", icon: "ph-info", rows: flatRows })
    }
  }

  const totalSpecRows = sections.reduce((n, s) => n + s.rows.length, 0)

  function isDiffering(values: (string | null)[]): boolean {
    const seen = new Set<string | null>()
    for (const v of values) seen.add(v)
    return seen.size > 1
  }

  const cols = products.length

  return (
    <div className="container-anvogue py-6 md:py-10">
      {/* Page Heading */}
      <div className="mb-6">
        <nav className="text-xs text-ink/50 mb-2">
          <Link href={`/${countryCode}`} className="hover:text-primary">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span>Compare</span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-bold text-ink">
          Compare Products
        </h1>
        {sharedCategoryName && (
          <p className="text-xs font-semibold text-primary mt-1">
            Category: {sharedCategoryName}
          </p>
        )}
      </div>

      {/* Warning message banner */}
      {warningMessage && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 shadow-sm">
          <i className="ph-fill ph-warning text-lg shrink-0 mt-0.5" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Interactive Slots and Search Bar */}
      <CompareInteractive
        products={products}
        countryCode={countryCode}
        categoryId={sharedCategoryId}
        categoryName={sharedCategoryName}
      />

      {/* Specification comparison table */}
      <div className="rounded-2xl border border-line bg-bg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div
            className="compare-grid-container min-w-0 w-max"
            style={{
              display: "grid",
              gridTemplateColumns: `var(--compare-label-w) repeat(${cols}, var(--compare-col-w))`,
            }}
          >
            {/* Header row with minimal product identifier */}
            <div className="sticky top-0 z-10 bg-surface border-b border-line py-1 md:py-1.5 px-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-black">
                Specs
              </span>
            </div>
            {products.map((p) => (
              <div
                key={p.id}
                className="sticky top-0 z-10 bg-surface border-b border-l border-line py-1 md:py-1.5 px-2.5 flex items-center gap-2"
              >
                {p.thumbnail && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.thumbnail}
                    alt=""
                    className="w-8 h-8 object-contain rounded border border-line bg-bg shrink-0"
                  />
                )}
                <span className="text-xs font-extrabold text-black line-clamp-1">
                  {p.title}
                </span>
              </div>
            ))}

            {/* Price Row */}
            <div className="py-1 md:py-1.5 px-2.5 bg-bg border-b border-line text-xs font-extrabold uppercase tracking-wider text-black">
              Price
            </div>
            {products.map((p) => {
              const { cheapestPrice } = getProductPrice({ product: p })
              const original = cheapestPrice?.original_price_number || 0
              const calculated = cheapestPrice?.calculated_price_number || 0
              const discount = original && calculated && original > calculated
                ? Math.round(((original - calculated) / original) * 100)
                : 0

              return (
                <div
                  key={`${p.id}-price`}
                  className="py-1 md:py-1.5 px-2.5 bg-bg border-b border-l border-line text-sm font-bold text-black"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-black font-extrabold">
                      {cheapestPrice?.calculated_price ?? "—"}
                    </span>
                    {discount > 0 && cheapestPrice?.original_price && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-black/40 line-through">
                          {cheapestPrice.original_price}
                        </span>
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded">
                          -{discount}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Spec rows */}
            {totalSpecRows === 0 && (
              <div
                className="p-8 text-center text-xs text-ink/50"
                style={{ gridColumn: `1 / span ${cols + 1}` }}
              >
                These products do not have specifications defined yet.
              </div>
            )}

            {sections.map((section) => (
              <div
                key={`section-${section.name}`}
                style={{ display: "contents" }}
              >
                {/* Section header banner */}
                {sections.length > 1 || section.name !== "Specifications" ? (
                  <div
                    className="px-2.5 py-2 bg-surface-alt border-b border-line text-[11.5px] font-extrabold tracking-widest uppercase text-black flex items-center gap-2"
                    style={{ gridColumn: `1 / span ${cols + 1}` }}
                  >
                    <i className={`ph-bold ${section.icon.startsWith("ph-") ? section.icon : "ph-" + section.icon} text-primary text-[15px] shrink-0`} aria-hidden />
                    {section.name}
                  </div>
                ) : null}

                {section.rows.map((row, idx) => {
                  const differs = isDiffering(row.values)
                  const zebra = idx % 2 === 0
                  return (
                    <div
                      key={`row-${section.name}-${row.key}`}
                      style={{ display: "contents" }}
                    >
                      <div
                        className={`py-1 md:py-1.5 px-2.5 border-b border-line text-[12.5px] font-bold ${
                          differs ? "text-black font-extrabold" : "text-black"
                        } ${zebra ? "bg-bg" : "bg-surface/30"}`}
                      >
                        {row.label}
                      </div>
                      {row.values.map((v, i) => (
                        <div
                          key={`row-${section.name}-${row.key}-${i}`}
                          className={`py-1 md:py-1.5 px-2.5 border-b border-l border-line text-[13px] md:text-[13.5px] ${
                            differs ? "text-black font-bold" : "text-black/85 font-semibold"
                          } ${zebra ? "bg-bg" : "bg-surface/30"}`}
                        >
                          {v || <span className="text-black/35">—</span>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-ink/40 mt-4 leading-normal">
        Specifications are sourced from the product database. Highlighted rows indicate values that differ between the selected products.
      </p>
    </div>
  )
}
