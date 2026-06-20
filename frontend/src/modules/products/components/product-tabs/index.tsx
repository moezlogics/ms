"use client"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

/**
 * PDP info accordions — Shopify-clean.
 *
 *   ▾ Specifications  (open by default)
 *      Form: Tablets
 *      Pack Size: 100s
 *      Active Ingredients: Paracetamol (500mg) & Caffeine (65mg)
 *
 *   ▸ Uses
 *      <free-text from product.metadata.uses>
 *
 * Specifications are auto-built from `product.metadata` keys (any string
 * value) and `product.type`. Keys starting with `_` are skipped (reserved
 * for internal/computed fields). Keys `uses`, `rich_description*`,
 * `videos`, `image*` are NEVER shown as specs since they're dedicated
 * fields handled elsewhere.
 *
 * Uses accordion only renders when `metadata.uses` is a non-empty string.
 */
const SPEC_BLACKLIST = new Set([
  "uses",
  "rich_description",
  "rich_description_en",
  "rich_description_ur",
  "videos",
  "image",
  "image_alt",
  "thumbnail",
  "requires_prescription",
  "prescription",
  "meta_title",
  "meta_description",
  "content",
  "form_extra",
  // Electronics-specific structured metadata — these are rendered by
  // dedicated components (SpecSheet, TrustBadges, PreorderBanner,
  // CompareButton). Surfacing them as raw key/value rows in this
  // accordion would either dump JSON as a string or duplicate the
  // dedicated UI further down the page.
  "specs",
  "in_the_box",
  "trust_badges",
  "preorder_open",
  "launch_date",
  "preorder_message",
  "accessory_ids",
  "warranty_months",
  "brand",
  "collection",
])

const ProductTabs = ({ product }: ProductTabsProps) => {
  const metadata = (product.metadata || {}) as Record<string, any>

  const specEntries: { key: string; label: string; value: string }[] = []
  if (product.type?.value) {
    specEntries.push({ key: "_type", label: "Type", value: product.type.value })
  }
  for (const key of Object.keys(metadata)) {
    if (key.startsWith("_")) continue
    if (SPEC_BLACKLIST.has(key)) continue
    const v = metadata[key]
    if (typeof v !== "string" || !v.trim()) continue
    const label = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
    specEntries.push({ key, label, value: v })
  }

  const uses = typeof metadata.uses === "string" ? metadata.uses.trim() : ""

  if (!specEntries.length && !uses) return null

  // Order: open Specifications first if present, otherwise Uses.
  const defaultOpen = specEntries.length ? "Specifications" : "Uses"

  return (
    <div className="w-full pt-1">
      <div className="flex flex-col gap-2">
        {specEntries.length > 0 && (
          <Accordion type="single" collapsible defaultValue={defaultOpen}>
            <Accordion.Item
              title="Specifications"
              headingSize="medium"
              value="Specifications"
            >
              <ul className="py-3 flex flex-col gap-2">
                {specEntries.map((e) => (
                  <li key={e.key} className="flex gap-2 text-[13px] leading-relaxed">
                    <span className="font-semibold text-ink min-w-fit">
                      {e.label}:
                    </span>
                    <span className="text-ink/75">{e.value}</span>
                  </li>
                ))}
              </ul>
            </Accordion.Item>
          </Accordion>
        )}

        {uses && (
          <Accordion
            type="single"
            collapsible
            defaultValue={specEntries.length ? "" : "Uses"}
          >
            <Accordion.Item title="Uses" headingSize="medium" value="Uses">
              <p className="py-3 text-[13px] text-ink/80 leading-relaxed whitespace-pre-line">
                {uses}
              </p>
            </Accordion.Item>
          </Accordion>
        )}
      </div>
    </div>
  )
}

export default ProductTabs
