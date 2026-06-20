  import React from "react"
  import { HttpTypes } from "@medusajs/types"
  import LocalizedClientLink from "@modules/common/components/localized-client-link"
  import { getProductReviewStats } from "@lib/data/reviews"
  import { getBrandForProduct, listBrands } from "@lib/data/brands"
  import { buildCategoryPath, buildCategoryChain } from "@lib/util/category-path"
  import { buildBrandPath } from "@lib/util/brand-path"
  import { isProductUpcoming } from "@lib/util/product"

  type ProductInfoProps = {
    product: HttpTypes.StoreProduct
    /**
     * `top`        — breadcrumb-only row, rendered above the gallery
     * `title-only` — title + rating (used above gallery on mobile)
     * `specs-only` — clean GSMArena-style specs box (used on mobile split)
     * `brand-only` — only shows the brand link (used under gallery on mobile)
     * `main`       — title + rating + specs (used on desktop right column)
     */
    mode?: "top" | "main" | "title-only" | "specs-only" | "brand-only"
  }

  function StarRating({ rating, count }: { rating: number; count: number }) {
    const stars = [1, 2, 3, 4, 5].map((star) => {
      if (rating >= star) return "full"
      if (rating >= star - 0.5) return "half"
      return "empty"
    })

    return (
      <a
        href="#reviews"
        className="inline-flex items-center gap-1 text-ink/70 hover:text-primary transition-colors"
      >
        <span className="flex items-center text-warning">
          {stars.map((type, i) => (
            <i
              key={i}
              className={`ph-fill ${
                type === "half" ? "ph-star-half" : "ph-star"
              } text-[12px] ${type === "empty" ? "opacity-25" : ""}`}
              aria-hidden
            />
          ))}
        </span>
        <span className="text-[12px]">
          {rating.toFixed(1)} ({count})
        </span>
      </a>
    )
  }

  const ProductInfo = async ({ product, mode = "main" }: ProductInfoProps) => {
    const primaryCategory = product.categories?.[0]
    const isUpcoming = isProductUpcoming(product)
    const [stats, brand, brands] = await Promise.all([
      getProductReviewStats(product.id).catch(() => null),
      getBrandForProduct(product.id).catch(() => null),
      listBrands().catch(() => []),
    ])

    if (mode === "top") {
      const categoryChain = buildCategoryChain(primaryCategory)
      const brandChain = brand ? (brand.parent_id ? [brands?.find(b => b?.id === brand.parent_id), brand].filter(Boolean) : [brand]) : []

      return (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[12px] text-ink/45 whitespace-nowrap overflow-x-auto w-full md:flex-wrap"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <LocalizedClientLink href="/" className="hover:text-primary transition-colors">
            Home
          </LocalizedClientLink>
          
          {categoryChain.map((c) => (
            <React.Fragment key={c.id}>
              <i className="ph ph-caret-right text-[10px] text-ink/25" aria-hidden />
              <span>{c.name}</span>
            </React.Fragment>
          ))}

          {brandChain.map((b) => (
            <React.Fragment key={b.id}>
              <i className="ph ph-caret-right text-[10px] text-ink/25" aria-hidden />
              <LocalizedClientLink
                href={`/${buildBrandPath(b, brands)}`}
                className="hover:text-primary transition-colors"
              >
                {b.name}
              </LocalizedClientLink>
            </React.Fragment>
          ))}

          <i className="ph ph-caret-right text-[10px] text-ink/25" aria-hidden />
          <span className="text-ink/55 truncate max-w-[200px]">{product.title}</span>
        </nav>
      )
    }

    const hasBrand = !!brand?.name
    const hasRating = !!(stats && stats.reviewCount > 0)

    if (mode === "brand-only") {
      if (!hasBrand) return null
      const parentBrand = brand!.parent_id ? brands?.find(b => b?.id === brand!.parent_id) : null
      return (
        <div className="text-[12px] text-ink/55 mt-2">
          By{" "}
          {parentBrand && (
            <>
              <LocalizedClientLink
                href={`/${buildBrandPath(parentBrand, brands)}`}
                className="text-primary font-medium hover:underline text-[12px]"
              >
                {parentBrand.name}
              </LocalizedClientLink>
              {" / "}
            </>
          )}
          <LocalizedClientLink
            href={`/${buildBrandPath(brand!, brands)}`}
            className="text-primary font-medium hover:underline text-[12px]"
          >
            {brand!.name}
          </LocalizedClientLink>
        </div>
      )
    }

    if (mode === "title-only") {
      return (
        <div className="flex flex-col gap-1">
          <div
            className="text-[23px] md:text-[27px] font-extrabold text-black leading-[1.15] tracking-tight"
            data-testid="product-title"
          >
            {product.title}
          {isUpcoming && (
            <span className="ml-2 inline-flex items-center justify-center text-[9px] md:text-[10px] leading-none font-bold uppercase tracking-wider bg-amber-500 text-black px-[6px] py-[3px] rounded-[3px] shadow-sm align-middle">
              Upcoming
            </span>
          )}
          </div>

          {hasRating && (
            <div className="flex items-center gap-3.5 flex-wrap">
              <StarRating
                rating={stats!.averageRating}
                count={stats!.reviewCount}
              />
            </div>
          )}
        </div>
      )
    }

    const specs = (product.metadata as any)?.specs || {}

    // 1. Camera details
    const cameraMainVal = formatFeaturedSpec(specs.camera_main || specs.camera, "camera")
    const cameraFrontVal = formatFeaturedSpec(specs.camera_front, "camera")

    // 2. RAM & Storage details
    const ramVal = formatFeaturedSpec(specs.memory || specs.ram, "memory")
    const storageVal = formatFeaturedSpec(specs.storage, "storage")

    // 3. Display details
    const displaySizeVal = formatFeaturedSpec(specs.display_size || specs.display || specs.screen_size, "display")
    const displayRefreshVal = formatFeaturedSpec(specs.refresh_rate || specs.display_resolution || specs.resolution, "refresh")

    // 4. Battery details
    const batteryCapVal = formatFeaturedSpec(specs.battery_capacity || specs.battery, "battery")
    const batteryChargingVal = formatFeaturedSpec(specs.charging_speed || specs.charging, "charging")

    // 5. Processor & Gaming details
    const chipsetVal = formatFeaturedSpec(specs.chipset, "chipset")
    const pubgFpsVal = formatFeaturedSpec(specs.pubg_fps, "pubg_fps")
    const formattedPubgFps = pubgFpsVal
      ? (pubgFpsVal.toLowerCase().includes("on pubg") ? pubgFpsVal : `${pubgFpsVal} on PUBG`)
      : ""

    // 6. Status & Connectivity details
    let ptaVal = "PTA Status"
    if (specs.pta_approved !== undefined && specs.pta_approved !== null) {
      const isPta = specs.pta_approved === true || String(specs.pta_approved).toLowerCase() === "yes" || String(specs.pta_approved).toLowerCase() === "true"
      ptaVal = isPta ? "PTA Approved" : "Non-PTA Approved"
    }
    let connectivityVal = "4G LTE Support"
    if (specs["5g_support"] !== undefined && specs["5g_support"] !== null) {
      const is5g = specs["5g_support"] === true || String(specs["5g_support"]).toLowerCase() === "yes" || String(specs["5g_support"]).toLowerCase() === "true"
      connectivityVal = is5g ? "5G Supported" : "4G LTE Support"
    }

    type FeaturedSpec = {
      key: string
      boldValue: string
      subValue: string
      targetKey: string
      icon: React.ReactNode
    }

    const featuredSpecs: FeaturedSpec[] = [
      {
        key: "camera",
        boldValue: cameraMainVal || "Camera Details",
        subValue: cameraFrontVal ? `${cameraFrontVal} Selfie` : "Main & Front Camera",
        targetKey: specs.camera_main ? "camera_main" : specs.camera ? "camera" : "camera_front",
        icon: (
          <svg viewBox="0 0 24 24" className="w-[24px] h-[24px] md:w-[26px] md:h-[26px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.5 4h-5L8 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-1.5-3z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )
      },
      {
        key: "memory",
        boldValue: ramVal || "RAM & Memory",
        subValue: storageVal ? `${storageVal} Storage` : "Internal Storage",
        targetKey: specs.memory ? "memory" : specs.ram ? "ram" : "storage",
        icon: (
          <svg viewBox="0 0 24 24" className="w-[24px] h-[24px] md:w-[26px] md:h-[26px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 7h20v9H2z" />
            <path d="M4 16v2 M7 16v2 M10 16v2 M14 16v2 M17 16v2 M20 16v2" />
            <rect x="4" y="9" width="3" height="4" rx="0.5" />
            <rect x="8.5" y="9" width="3" height="4" rx="0.5" />
            <rect x="13" y="9" width="3" height="4" rx="0.5" />
            <rect x="17.5" y="9" width="3" height="4" rx="0.5" />
          </svg>
        )
      },
      {
        key: "display",
        boldValue: displaySizeVal || "Display Size",
        subValue: displayRefreshVal || "Refresh Rate / Res",
        targetKey: specs.display_size ? "display_size" : "display",
        icon: (
          <svg viewBox="0 0 24 24" className="w-[24px] h-[24px] md:w-[26px] md:h-[26px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <rect x="10" y="3.5" width="4" height="1.2" rx="0.6" fill="currentColor" />
            <path d="M6 17l3-3.5 3 3.5 4-5.5 3 5.5" strokeWidth="1.5" />
          </svg>
        )
      },
      {
        key: "battery",
        boldValue: batteryCapVal || "Battery Power",
        subValue: batteryChargingVal || "Charging Capacity",
        targetKey: specs.battery_capacity ? "battery_capacity" : "battery",
        icon: (
          <svg viewBox="0 0 24 24" className="w-[24px] h-[24px] md:w-[26px] md:h-[26px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="6" width="16" height="12" rx="2.5" />
            <path d="M20 10v4" strokeWidth="2.5" />
            <path d="M11 8.5L8.5 12h3l-1 4 4-4.5h-3l1-3z" fill="currentColor" />
          </svg>
        )
      },
      {
        key: "processor",
        boldValue: formattedPubgFps || chipsetVal || "Gaming Performance",
        subValue: formattedPubgFps && chipsetVal ? chipsetVal : (formattedPubgFps ? "PUBG Performance" : "Processor Specs"),
        targetKey: specs.pubg_fps ? "pubg_fps" : "chipset",
        icon: (
          <i className="ph-bold ph-game-controller text-[21px] md:text-[23px] leading-none" />
        )
      }
    ]

    const specsBox = featuredSpecs.length > 0 && (
      <div className="border border-line/50 rounded-xl bg-surface/30 divide-y divide-line/50 overflow-hidden w-full">
        {featuredSpecs.map((spec) => (
          <a
            key={spec.key}
            href={`#spec-row-${spec.targetKey}`}
            className="flex items-center gap-1 md:gap-2.5 pl-1.5 pr-2 py-1.5 md:py-2.5 md:px-3 w-full min-w-0"
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0 text-black">
              {spec.icon}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="block text-[12px] md:text-[14.5px] font-bold text-black truncate" title={spec.boldValue}>
                {spec.boldValue}
              </span>
              <span className="block text-[10px] md:text-[12px] font-semibold text-black/75 truncate mt-0.5" title={spec.subValue}>
                {spec.subValue}
              </span>
            </div>
          </a>
        ))}
      </div>
    )

    if (mode === "specs-only") {
      return specsBox
    }

    // mode === "main": title + brand + (optional) rating row + clean specs list box
    return (
      <div id="product-info" className="flex flex-col gap-2">
        <h1
          className="text-[23px] md:text-[28px] font-extrabold text-black leading-[1.15] tracking-tight"
          data-testid="product-title"
        >
          {product.title}
          {isUpcoming && (
            <span className="ml-2 inline-flex items-center justify-center text-[9px] md:text-[10px] leading-none font-bold uppercase tracking-wider bg-amber-500 text-black px-[6px] py-[3px] rounded-[3px] shadow-sm align-middle">
              Upcoming
            </span>
          )}
        </h1>

        {(hasBrand || hasRating) && (
          <div className="flex items-center gap-3.5 flex-wrap">
            {hasBrand && (() => {
              const parentBrand = brand!.parent_id ? brands?.find(b => b?.id === brand!.parent_id) : null
              return (
                <span className="text-[12px] text-ink/55">
                  By{" "}
                  {parentBrand && (
                    <>
                      <LocalizedClientLink
                        href={`/${buildBrandPath(parentBrand, brands)}`}
                        className="text-primary font-medium hover:underline text-[12px]"
                      >
                        {parentBrand.name}
                      </LocalizedClientLink>
                      {" / "}
                    </>
                  )}
                  <LocalizedClientLink
                    href={`/${buildBrandPath(brand!, brands)}`}
                    className="text-primary font-medium hover:underline text-[12px]"
                  >
                    {brand!.name}
                  </LocalizedClientLink>
                </span>
              )
            })()}
            {hasRating && (
              <StarRating
                rating={stats!.averageRating}
                count={stats!.reviewCount}
              />
            )}
          </div>
        )}

        {specsBox}
      </div>
    )
  }

  function formatFeaturedSpec(value: any, type: string): string {
    if (value === undefined || value === null) return ""
    let str = String(value).trim()
    if (!str) return ""

    // Rule 1: Split by comma and take first part for specific types
    if (type === "camera" || type === "charging" || type === "refresh" || type === "display" || type === "memory" || type === "storage" || type === "pubg_fps") {
      str = str.split(",")[0].trim()
    }

    // Rule 2: Take text before parenthesis
    if (type === "chipset" || type === "cpu" || type === "camera" || type === "charging" || type === "pubg_fps") {
      str = str.split("(")[0].trim()
    }

    // Rule 3: Shorten specific known patterns
    if (type === "chipset") {
      str = str.replace(/Qualcomm\s+/i, "")
      str = str.replace(/MediaTek\s+/i, "")
      str = str.replace(/SM[0-9]+[A-Z0-9-]*\s+/i, "")
      str = str.replace(/SDM[0-9]+[A-Z0-9-]*\s+/i, "")
    }

    return str
  }

  export default ProductInfo
