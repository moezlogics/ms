"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useMemo, useState, useTransition } from "react"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { buildCategoryPath } from "@lib/util/category-path"
import { buildBrandPath } from "@lib/util/brand-path"

type BrandItem = {
  id: string
  name: string
  handle: string
  logo_url: string | null
  parent_id?: string | null
  sort_order?: number
  is_active?: boolean
  description?: string | null
  website_url?: string | null
  seo_title?: string | null
  seo_description?: string | null
  created_at?: string
  updated_at?: string
}

type Props = {
  categories: HttpTypes.StoreProductCategory[]
  currentCategory?: string
  brands?: BrandItem[]
  activeCategoryIds?: string[]
  activeBrandIds?: string[]
  minPriceParam?: string
  maxPriceParam?: string
  priceBounds?: { min: number; max: number; currency: string }
  inDrawer?: boolean
  specFilters?: Array<{
    key: string
    label: string
    unit?: string
    type?: string
    values: string[]
  }>
}

/**
 * Reusable animated Accordion wrapper for premium UI styling.
 */
const AccordionItem = ({
  title,
  icon,
  activeCount = 0,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: string
  activeCount?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-line last:border-b-0 py-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface text-ink/75 group-hover:bg-primary/5 group-hover:text-primary transition-all">
            <i className={`ph-bold ${icon} text-[15px]`} />
          </span>
          <span className="font-semibold text-ink/80 text-[12px] tracking-wider uppercase">{title}</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center bg-primary text-primary-fg text-[10px] font-bold rounded-full w-5 h-5 shadow-sm animate-pulse">
              {activeCount}
            </span>
          )}
        </div>
        <i className={`ph ph-caret-down text-[13px] text-ink/40 group-hover:text-ink transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <div className="mt-4 animate-fade-in-top transition-all duration-300">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Custom modern checkbox wrapper.
 */
const CustomCheckbox = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none py-1.5 group">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
          checked 
            ? "border-primary bg-primary text-primary-fg animate-skeleton-pulse" 
            : "border-line bg-bg group-hover:border-primary/50"
        }`}>
          {checked && <i className="ph-bold ph-check text-[10px]" />}
        </div>
      </div>
      <span className="text-sm text-ink/85 group-hover:text-primary transition-colors font-medium">{label}</span>
    </label>
  )
}

/**
 * Custom iOS-style toggle switch.
 */
const ToggleSwitch = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) => {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none py-1.5 group">
      <span className="text-sm text-ink/85 group-hover:text-primary transition-colors font-medium">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? "bg-primary" : "bg-line"}`} />
        <div className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-soft ${checked ? "translate-x-4" : ""}`} />
      </div>
    </label>
  )
}

/**
 * Helper to dynamically assign Phosphor Icons to specification headers.
 */
function getSpecIcon(key: string): string {
  const k = key.toLowerCase()
  if (k.includes("ram") || k.includes("storage") || k.includes("memory")) return "ph-database"
  if (k.includes("battery") || k.includes("charging") || k.includes("power")) return "ph-battery-full"
  if (k.includes("camera") || k.includes("lens")) return "ph-camera"
  if (k.includes("display") || k.includes("screen") || k.includes("resolution") || k.includes("monitor")) return "ph-monitor"
  if (k.includes("processor") || k.includes("chipset") || k.includes("cpu") || k.includes("gpu")) return "ph-cpu"
  if (k.includes("pta")) return "ph-shield-check"
  if (k.includes("warranty")) return "ph-shield-check"
  if (k.includes("os") || k.includes("ui") || k.includes("operating")) return "ph-ruler"
  if (k.includes("wifi") || k.includes("bluetooth") || k.includes("nfc") || k.includes("connectivity") || k.includes("network")) return "ph-wifi-high"
  if (k.includes("speaker") || k.includes("audio") || k.includes("sound")) return "ph-speaker-high"
  return "ph-sliders-horizontal"
}

/**
 * Recursive category node.
 */
const CategoryNode = ({
  category,
  currentCategory,
  depth = 0,
  parentPath = "",
}: {
  category: any
  currentCategory?: string
  depth?: number
  parentPath?: string
}) => {
  const [isExpanded, setIsExpanded] = useState(
    currentCategory === category.handle ||
      category.category_children?.some((c: any) => c.handle === currentCategory)
  )

  const hasChildren = category.category_children && category.category_children.length > 0
  const active = currentCategory === category.handle

  const path = parentPath
    ? `${parentPath}/${category.handle}`
    : buildCategoryPath(category) || category.handle

  return (
    <li className="flex flex-col">
      <div
        className={`flex items-center justify-between rounded-base transition-colors ${
          active ? "bg-ink text-bg font-medium" : "text-ink/80 hover:bg-surface"
        }`}
      >
        <LocalizedClientLink
          href={`/${path}`}
          className="flex-1 px-2 py-1.5"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {category.name}
        </LocalizedClientLink>

        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }}
            className={`w-8 h-full flex items-center justify-center transition-transform ${
              isExpanded ? "rotate-90" : ""
            } ${active ? "text-bg" : "text-ink/40 hover:text-ink"}`}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <i className="ph ph-caret-right text-[12px]" aria-hidden />
          </button>
        )}
        {!hasChildren && !active && (
          <div className="w-8 flex items-center justify-center opacity-40">
            <i className="ph ph-caret-right text-[11px]" aria-hidden />
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul className="flex flex-col mt-0.5 relative before:content-[''] before:absolute before:left-[14px] before:top-2 before:bottom-2 before:w-[1px] before:bg-line">
          {category.category_children.map((child: any) => (
            <CategoryNode
              key={child.id}
              category={child}
              currentCategory={currentCategory}
              depth={depth + 1}
              parentPath={path}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Creative Overhauled Shop Filters Sidebar component.
 */
const ShopFilters = ({
  categories,
  currentCategory,
  brands = [],
  activeCategoryIds,
  activeBrandIds,
  minPriceParam = "minPrice",
  maxPriceParam = "maxPrice",
  priceBounds,
  inDrawer = false,
  specFilters = [],
}: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const minPriceValue = searchParams.get(minPriceParam) || ""
  const maxPriceValue = searchParams.get(maxPriceParam) || ""
  const inStock = searchParams.get("inStock") === "true"
  const showUpcoming = searchParams.get("upcoming") !== "false"

  const [minLocal, setMinLocal] = useState(minPriceValue)
  const [maxLocal, setMaxLocal] = useState(maxPriceValue)
  const [brandSearch, setBrandSearch] = useState("")
  const [showAllBrands, setShowAllBrands] = useState(false)

  const activeCatSet = useMemo(
    () => (activeCategoryIds ? new Set(activeCategoryIds) : null),
    [activeCategoryIds]
  )

  const topCategories = useMemo(() => {
    const tops = (categories || []).filter((c: any) => !c.parent_category_id)
    if (!activeCatSet) return tops
    return tops.filter((c: any) => activeCatSet.has(c.id))
  }, [categories, activeCatSet])

  const visibleBrands = useMemo(() => {
    if (!activeBrandIds || activeBrandIds.length === 0) return brands
    const allow = new Set(activeBrandIds)
    return brands.filter((b) => allow.has(b.id))
  }, [brands, activeBrandIds])

  const visibleBrandsSorted = useMemo(() => {
    return [...visibleBrands].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
  }, [visibleBrands])

  const activeSegments = useMemo(() => pathname.split("/").filter(Boolean), [pathname])
  const isBrandActive = useCallback((handle: string) => activeSegments.includes(handle), [activeSegments])

  const displayedBrands = useMemo(() => {
    let list = visibleBrandsSorted
    const q = brandSearch.trim().toLowerCase()
    if (q) {
      list = list.filter((b) => b.name.toLowerCase().includes(q))
    }
    if (!showAllBrands && !q && list.length > 9) {
      return list.slice(0, 9)
    }
    return list
  }, [visibleBrandsSorted, brandSearch, showAllBrands])

  const activeBrandsCount = useMemo(() => {
    return visibleBrands.filter((b) => isBrandActive(b.handle)).length
  }, [visibleBrands, isBrandActive])

  const activeCategoriesCount = currentCategory ? 1 : 0
  const activePriceCount = minPriceValue || maxPriceValue ? 1 : 0
  const activeAvailabilityCount = (inStock ? 1 : 0) + (showUpcoming ? 0 : 1)

  const getSelectedCountForSpec = useCallback((specKey: string) => {
    const paramKey = `spec_${specKey}`
    const currentVal = searchParams.get(paramKey) || ""
    return currentVal ? currentVal.split(",").filter(Boolean).length : 0
  }, [searchParams])

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams)
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k)
        else params.set(k, v)
      }
      params.delete("page") // reset pagination
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [pathname, router, searchParams]
  )

  const applyPrice = () => {
    updateParam({
      [minPriceParam]: minLocal || null,
      [maxPriceParam]: maxLocal || null,
    })
  }

  const clearAll = () => {
    setMinLocal("")
    setMaxLocal("")
    const params = new URLSearchParams(searchParams)
    params.delete(minPriceParam)
    params.delete(maxPriceParam)
    params.delete("inStock")
    params.delete("upcoming")
    params.delete("page")
    
    // Clear spec filters
    const specKeys: string[] = []
    for (const key of params.keys()) {
      if (key.startsWith("spec_")) {
        specKeys.push(key)
      }
    }
    specKeys.forEach((k) => params.delete(k))

    const keep = params.toString()
    router.replace(keep ? `${pathname}?${keep}` : pathname, { scroll: false })
  }

  const toggleSpecFilter = useCallback(
    (specKey: string, val: string, checked: boolean) => {
      const paramKey = `spec_${specKey}`
      const currentVal = searchParams.get(paramKey) || ""
      let values = currentVal
        ? currentVal
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : []

      if (checked) {
        if (!values.includes(val)) {
          values.push(val)
        }
      } else {
        values = values.filter((v) => v !== val)
      }

      updateParam({
        [paramKey]: values.length > 0 ? values.join(",") : null,
      })
    },
    [searchParams, updateParam]
  )

  return (
    <div
      className={`${inDrawer ? "px-4" : ""} text-sm text-ink pb-6`}
      data-testid="shop-filters"
    >
      {/* Categories Accordion */}
      {topCategories.length > 0 && (
        <AccordionItem title="Categories" icon="ph-squares-four" activeCount={activeCategoriesCount} defaultOpen={true}>
          <ul className="flex flex-col gap-1">
            <li>
              <LocalizedClientLink
                href="/store"
                className={`block px-2 py-1.5 rounded-base transition-colors ${
                  !currentCategory
                    ? "bg-ink text-bg font-medium"
                    : "text-ink/80 hover:bg-surface"
                }`}
              >
                All products
              </LocalizedClientLink>
            </li>
            {topCategories.map((c: any) => (
              <CategoryNode
                key={c.id}
                category={c}
                currentCategory={currentCategory}
              />
            ))}
          </ul>
        </AccordionItem>
      )}

      {/* Overhauled Brands Accordion (Circular Logo Grid) */}
      {visibleBrands.length > 0 && (
        <AccordionItem title="Brands" icon="ph-tag" activeCount={activeBrandsCount} defaultOpen={true}>
          {visibleBrands.length > 9 && (
            <div className="relative mb-3.5">
              <input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-line bg-bg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <i className="ph ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 text-[13px]" />
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {displayedBrands.length === 0 ? (
              <div className="col-span-3 py-3 text-center text-xs text-ink/45 font-medium">
                No brands found
              </div>
            ) : (
              displayedBrands.map((b) => {
                const isActive = isBrandActive(b.handle)
                const path = buildBrandPath(b, brands) || b.handle
                return (
                  <LocalizedClientLink
                    key={b.id}
                    href={isActive ? "/store" : `/${path}`}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all group ${
                      isActive
                        ? "border-primary bg-surface/50 shadow-soft ring-1 ring-primary/10"
                        : "border-line bg-bg hover:bg-surface/30 hover:border-primary/30"
                    }`}
                  >
                    <div className={`relative w-11 h-11 rounded-full border flex-shrink-0 bg-white flex items-center justify-center overflow-hidden mb-1.5 transition-all p-1.5 ${
                      isActive ? "border-primary" : "border-line/60 group-hover:border-primary/30"
                    }`}>
                      {b.logo_url ? (
                        <Image
                          src={b.logo_url}
                          alt={b.name}
                          fill
                          sizes="44px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <span className="text-[11px] font-bold text-ink/45 uppercase select-none">
                          {b.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] font-semibold text-ink truncate w-full px-0.5 select-none">{b.name}</span>
                  </LocalizedClientLink>
                )
              })
            )}
          </div>

          {!brandSearch.trim() && visibleBrandsSorted.length > 9 && (
            <button
              type="button"
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="w-full mt-3 text-xs font-semibold text-ink/65 hover:text-primary flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface/50 hover:bg-surface transition-all focus:outline-none"
            >
              {showAllBrands ? (
                <>
                  <span>Show less</span>
                  <i className="ph ph-caret-up text-[10px]" />
                </>
              ) : (
                <>
                  <span>Show more ({visibleBrandsSorted.length - 9})</span>
                  <i className="ph ph-caret-down text-[10px]" />
                </>
              )}
            </button>
          )}
        </AccordionItem>
      )}

      {/* Styled Price range Accordion */}
      <AccordionItem title="Price" icon="ph-coins" activeCount={activePriceCount} defaultOpen={false}>
        {priceBounds && (
          <p className="text-xs text-ink/50 mb-3.5 font-medium">
            {priceBounds.currency.toUpperCase()} {priceBounds.min} – {priceBounds.max}
          </p>
        )}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Min"
              value={minLocal}
              onChange={(e) => setMinLocal(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyPrice()
              }}
              className="w-full h-9.5 px-3 text-sm rounded-xl border border-line bg-bg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
          <span className="text-ink/30 font-medium">—</span>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Max"
              value={maxLocal}
              onChange={(e) => setMaxLocal(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyPrice()
              }}
              className="w-full h-9.5 px-3 text-sm rounded-xl border border-line bg-bg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>
        <button
          onClick={applyPrice}
          className="mt-3.5 w-full h-9 rounded-xl bg-surface border border-line hover:border-primary/30 text-xs font-semibold text-ink transition-all focus:outline-none"
        >
          Apply Price Filter
        </button>
      </AccordionItem>

      {/* Styled Spec Filters Accordions */}
      {specFilters && specFilters.map((sf) => {
        const paramKey = `spec_${sf.key}`
        const currentVal = searchParams.get(paramKey) || ""
        const selectedValues = currentVal
          ? currentVal
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : []

        const activeCount = selectedValues.length
        const icon = getSpecIcon(sf.key)

        return (
          <AccordionItem key={sf.key} title={sf.label} icon={icon} activeCount={activeCount} defaultOpen={activeCount > 0}>
            <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto no-scrollbar pt-1 pr-1">
              {sf.values.map((val) => {
                const isChecked = selectedValues.includes(val)
                return (
                  <CustomCheckbox
                    key={val}
                    checked={isChecked}
                    onChange={(checked) => toggleSpecFilter(sf.key, val, checked)}
                    label={`${val}${sf.unit ? ` ${sf.unit}` : ""}`}
                  />
                )
              })}
            </div>
          </AccordionItem>
        )
      })}

      {/* Overhauled Availability Accordion (iOS Switches) */}
      <AccordionItem title="Availability" icon="ph-check-circle" activeCount={activeAvailabilityCount} defaultOpen={true}>
        <div className="flex flex-col gap-2 pt-1">
          <ToggleSwitch
            checked={inStock}
            onChange={(checked) => updateParam({ inStock: checked ? "true" : null })}
            label="In stock only"
          />
          <ToggleSwitch
            checked={showUpcoming}
            onChange={(checked) => updateParam({ upcoming: checked ? null : "false" })}
            label="Upcoming products"
          />
        </div>
      </AccordionItem>

      {/* Clear Button */}
      {(minPriceValue || maxPriceValue || inStock || !showUpcoming || Array.from(searchParams.keys()).some((k) => k.startsWith("spec_"))) && (
        <button
          onClick={clearAll}
          className="mt-6 w-full h-10.5 rounded-xl border border-line hover:border-primary text-sm font-semibold text-ink/75 hover:bg-surface transition-all focus:outline-none flex items-center justify-center gap-1.5"
        >
          <i className="ph-bold ph-trash-simple text-sm" />
          Clear all filters
        </button>
      )}
    </div>
  )
}

export default ShopFilters
