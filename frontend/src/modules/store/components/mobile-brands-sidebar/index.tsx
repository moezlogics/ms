"use client"

import { usePathname } from "next/navigation"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getBrandPath } from "@lib/util/brand-path"

type BrandItem = {
  id: string
  name: string
  handle: string
  logo_url: string | null
  parent_id: string | null
}

type Props = {
  brands: BrandItem[]
}

// Helper to strip the 2-character country code prefix from the path (e.g. /pk/store -> /store)
const stripLocale = (p: string): string => {
  if (!p) return "/"
  const parts = p.split("/").filter(Boolean)
  if (parts.length && parts[0].length === 2) parts.shift()
  return "/" + parts.join("/")
}

export default function MobileBrandsSidebar({ brands }: Props) {
  const pathname = usePathname() || "/"
  const cleanPath = stripLocale(pathname)

  // Filter out sub-brands for the main sidebar to keep it clean, showing only top-level brands
  const topBrands = brands.filter((b) => !b.parent_id)

  const isAllActive = cleanPath === "/" || cleanPath === "/store"

  return (
    <div className="flex flex-col h-full bg-surface-alt/80 border-r border-line/45 overflow-y-auto no-scrollbar backdrop-blur-md">
      {/* Scrollable list */}
      <ul className="flex flex-col gap-1.5 small:gap-2 py-2 small:py-3">
        {/* "Shop All" Item */}
        <li className="relative px-1.5 small:px-2">
          <LocalizedClientLink
            href="/store"
            className={[
              "flex flex-col items-center justify-center py-1.5 px-0.5 small:py-2.5 small:px-1.5 transition-all text-center relative group",
              "focus-visible:outline-none focus-visible:bg-surface",
              isAllActive
                ? "bg-surface/90 font-bold text-primary shadow-sm border border-line/30 scale-[1.02]"
                : "text-black hover:bg-surface/50 hover:text-primary hover:scale-[1.02]"
            ].join(" ")}
            style={{ borderRadius: "var(--radius-sidebar)" }}
          >
            {/* Active primary indicator strip on the left */}
            {isAllActive && (
              <span
                className="absolute left-1 top-2 bottom-2 w-0.5 small:left-1.5 small:top-3 small:bottom-3 small:w-1 rounded-full bg-primary"
                aria-hidden
              />
            )}
            
            <div
              className={[
                "w-[38px] h-[38px] small:w-[56px] small:h-[56px] flex items-center justify-center mb-1 transition-all relative shrink-0",
                isAllActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-inner"
                  : "bg-surface-alt/70 text-ink/40 border border-line/40 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20"
              ].join(" ")}
              style={{ borderRadius: "var(--radius-sidebar)" }}
            >
              <i className="ph-bold ph-squares-four text-lg small:text-2xl" />
            </div>
            
            <span className="text-[10px] small:text-[12.5px] leading-tight font-bold text-black group-hover:text-primary break-words max-w-[54px] small:max-w-[76px] transition-colors">
              Shop All
            </span>
          </LocalizedClientLink>
        </li>

        {/* Brand Items */}
        {topBrands.map((brand) => {
          const brandHref = getBrandPath(brand, brands)
          const isActive = cleanPath === brandHref || cleanPath.startsWith(brandHref + "/")

          return (
            <li key={brand.id} className="relative px-1.5 small:px-2">
              <LocalizedClientLink
                href={brandHref}
                className={[
                  "flex flex-col items-center justify-center py-1.5 px-0.5 small:py-2.5 small:px-1.5 text-center transition-all relative group",
                  "focus-visible:outline-none focus-visible:bg-surface",
                  isActive
                    ? "bg-surface/90 font-bold text-primary shadow-sm border border-line/30 scale-[1.02]"
                    : "text-black hover:bg-surface/50 hover:text-primary hover:scale-[1.02]"
                ].join(" ")}
                style={{ borderRadius: "var(--radius-sidebar)" }}
              >
                {/* Active primary indicator strip on the left */}
                {isActive && (
                  <span
                    className="absolute left-1 top-2 bottom-2 w-0.5 small:left-1.5 small:top-3 small:bottom-3 small:w-1 rounded-full bg-primary"
                    aria-hidden
                  />
                )}

                {/* Brand Logo Container */}
                <div
                  className={[
                    "w-[38px] h-[38px] small:w-[56px] small:h-[56px] overflow-hidden bg-white border flex items-center justify-center mb-1 transition-all relative shrink-0",
                    isActive 
                      ? "border-primary/50 shadow-md scale-[1.05]" 
                      : "border-line/60 group-hover:border-primary/30 group-hover:shadow-sm"
                  ].join(" ")}
                  style={{ borderRadius: "var(--radius-sidebar)" }}
                >
                  {brand.logo_url ? (
                    <Image
                      src={brand.logo_url}
                      alt={brand.name}
                      fill
                      sizes="(max-width: 1024px) 44px, 56px"
                      className="object-contain p-[1px] small:p-[1.5px] transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center text-ink/30 transition-colors group-hover:text-primary/70">
                      <i className="ph ph-tag text-base small:text-xl" />
                    </div>
                  )}
                </div>

                {/* Brand Label */}
                <span className="text-[10px] small:text-[12.5px] leading-tight font-bold text-black group-hover:text-primary break-words max-w-[54px] small:max-w-[76px] transition-colors">
                  {brand.name}
                </span>
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
