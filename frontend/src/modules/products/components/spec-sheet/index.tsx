import React from "react"
import { buildSpecGroups } from "@lib/util/spec-groups"
import {
  SpecTemplate,
  buildSpecGroupsFromTemplate,
} from "@lib/util/spec-template"

type Props = {
  /** Raw `product.metadata.specs` — JSON object of key→value pairs. */
  specs?: any
  /**
   * Raw `product.metadata.in_the_box` — either a JSON array of
   * strings, or a comma/newline separated string. Rendered as a
   * checklist below the spec table.
   */
  inTheBox?: any
  /** Optional heading shown above the table on the PDP tab. */
  title?: string
  /**
   * When provided, `specs` are grouped using the admin-defined
   * category template — admin-set labels, units, and group order.
   * Keys not in the template are surfaced under an "Other" group so
   * nothing is silently dropped.
   *
   * When omitted (or null) we fall back to the heuristic key-name
   * classifier in `@lib/util/spec-groups` — back-compatible with
   * legacy products that have no template.
   */
  template?: SpecTemplate | null
  similarBudgetSlot?: React.ReactNode
  similarSpecsSlot?: React.ReactNode
  sameBrandSlot?: React.ReactNode
}

/**
 * Parse `in_the_box` from any of:
 *   ["Charger", "Cable", "Manual"]                 (preferred)
 *   "Charger, Cable, Manual"
 *   "Charger\nCable\nManual"
 *   '["Charger", "Cable"]'                         (JSON string)
 */
function parseInTheBox(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean)
  }
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t) return []
    if (t.startsWith("[")) {
      try {
        const arr = JSON.parse(t)
        if (Array.isArray(arr)) return arr.map((s) => String(s).trim()).filter(Boolean)
      } catch {}
    }
    return t
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/**
 * Structured specification sheet for electronics.
 *
 * Reads `product.metadata.specs` (free-form JSON object) and groups
 * the keys into sections (Display, Performance, Memory, Camera, …)
 * defined in `@lib/util/spec-groups`. Empty sections collapse so the
 * UI is always tight regardless of how many fields the admin filled.
 *
 * Renders nothing (`null`) when there are no specs and no in-the-box
 * contents — caller can safely include this in the tab list and rely
 * on it to vanish for non-electronics products.
 */
export default function SpecSheet({
  specs,
  inTheBox,
  title,
  template,
  similarBudgetSlot,
  similarSpecsSlot,
  sameBrandSlot,
}: Props) {
  // When the product's category provides a structured spec template,
  // honor the admin's group ordering, labels, and units. Otherwise
  // fall back to the heuristic key-name classifier so legacy products
  // (and ad-hoc specs from non-templated categories) keep working.
  const groups = template
    ? buildSpecGroupsFromTemplate(specs, template)
    : buildSpecGroups(specs)
  const boxItems = parseInTheBox(inTheBox)

  if (!groups.length && !boxItems.length) return null

  // Determine indices at which inline slots will be rendered.
  // Price similarity / Similar Budget -> after 1st table (idx === 0)
  // Spec similarity -> after 3rd table (idx === 2, or last group index if length <= 2)
  // Brand similarity -> after 5th table (idx === 4, or last group index if length <= 4)
  let budgetIndex = -1
  let specsIndex = -1
  let brandIndex = -1

  if (groups.length > 0) {
    budgetIndex = 0
    specsIndex = groups.length > 2 ? 2 : groups.length - 1
    brandIndex = groups.length > 4 ? 4 : groups.length - 1
  }

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {title && (
        <h2 className="text-base md:text-lg font-extrabold text-black">{title}</h2>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {groups.map((g, idx) => (
            <React.Fragment key={g.name}>
              <section
                className="flex flex-col border border-line/50 rounded-xl overflow-hidden bg-surface/5"
              >

              {/* Group header */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-surface/40 border-b border-line/55">
                <i className={`ph-bold ${g.icon.startsWith("ph-") ? g.icon : "ph-" + g.icon} text-primary text-[18px] shrink-0`} aria-hidden />
                <h3 className="text-[12.5px] md:text-[13px] font-extrabold text-black tracking-wide uppercase">
                  {g.name}
                </h3>
              </div>

              {/* Rows — clean, responsive and left-aligned values */}
              <dl className="flex flex-col">
                {g.rows.map((r) => (
                  <div
                    key={r.key}
                    id={`spec-row-${r.key}`}
                    className="flex flex-row items-start gap-3 md:gap-4 px-2.5 py-1.5 md:px-3.5 md:py-2.5 border-b border-line/20 last:border-b-0 hover:bg-surface/10 transition-colors scroll-mt-24"
                  >
                    <dt className="w-[90px] md:w-[130px] shrink-0 text-[10px] md:text-[11px] text-black font-bold uppercase tracking-wider mt-0.5">
                      {r.label}
                    </dt>
                    <dd className="text-[12.5px] md:text-[13.5px] text-black font-semibold text-left flex-1 min-w-0 break-words">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {idx === budgetIndex && similarBudgetSlot && (
              <div className="col-span-1 md:col-span-2 my-2">
                {similarBudgetSlot}
              </div>
            )}

            {idx === specsIndex && similarSpecsSlot && (
              <div className="col-span-1 md:col-span-2 my-2">
                {similarSpecsSlot}
              </div>
            )}

            {idx === brandIndex && sameBrandSlot && (
              <div className="col-span-1 md:col-span-2 my-2">
                {sameBrandSlot}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    )}

      {boxItems.length > 0 && (
        <section className="flex flex-col border border-line/50 rounded-xl overflow-hidden bg-surface/5">
          {/* Group header */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-surface/40 border-b border-line/55">
            <i className="ph-bold ph-package text-primary text-[18px] shrink-0" aria-hidden />
            <h3 className="text-[12.5px] md:text-[13px] font-extrabold text-black tracking-wide uppercase">
              What&apos;s in the Box
            </h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-2.5 md:p-3.5">
            {boxItems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[13px] md:text-[14px] text-black font-medium"
              >
                <i
                  className="ph-fill ph-check-circle text-success text-[15px] shrink-0 mt-0.5"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
