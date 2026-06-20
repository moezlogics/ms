import { HttpTypes } from "@medusajs/types";

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
    return product.options?.length === 1 && product.options[0].values?.length === 1;
}

/**
 * Builds the dynamic canonical URL path for a product based on its
 * primary category and brand.
 * 
 * URL structure:
 *   - Both brand & category: `/[brand_handle]/[category_handle]/[product_handle]`
 *   - Category only:         `/[category_handle]/[product_handle]`
 *   - Brand only:            `/[brand_handle]/[product_handle]`
 *   - Neither:               `/[product_handle]`
 *
 * @param product  — the product object (must have `handle`, optionally `categories`, `metadata`, `collection`)
 * @param brand    — optional resolved Brand from the brands system (has `handle`)
 */
export function getProductPath(
  product: any,
  brand?: { handle?: string } | null
): string {
  if (!product || !product.handle) return "/"

  const categorySegment = product.categories?.[0]?.handle || ""
  
  // Prefer the explicitly-passed brand (from the brands system).
  // Fall back to metadata.brand / collection for back-compat.
  let brandSegment = ""
  if (brand?.handle) {
    brandSegment = brand.handle
  } else {
    const rawBrand = product.metadata?.brand || product.collection?.handle || product.collection?.title
    if (rawBrand) {
      brandSegment = String(rawBrand)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    }
  }

  const segments = []
  if (brandSegment) segments.push(brandSegment)
  if (categorySegment) segments.push(categorySegment)
  segments.push(product.handle)

  return `/${segments.join("/")}`
}

/**
 * Filter product images to show only those belonging to the currently selected variant.
 * If no variant is selected or the variant has no specific images, returns all product images.
 */
export function getImagesForVariant(product: any, selectedVariantId?: string) {
  const productImages = product.images ?? []
  if (!selectedVariantId || !product.variants) {
    return productImages
  }

  const variant = product.variants.find((v: any) => v.id === selectedVariantId)
  const variantImages = variant?.images ?? []
  if (!variant || variantImages.length === 0) {
    return productImages
  }

  const imageIdsMap = new Map(variantImages.map((i: any) => [i.id, true]))
  return productImages.filter((i: any) => imageIdsMap.has(i.id))
}

/**
 * Check if a product's launch/release date is in the future.
 */
export function isProductUpcoming(product: any): boolean {
  if (!product) return false
  const specs = product.metadata?.specs
  const releaseDateStr = specs?.release_date || product.metadata?.release_date || specs?.launch_date || product.metadata?.launch_date
  if (!releaseDateStr) return false

  const str = String(releaseDateStr).trim()
  const parts = str.split("-")
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const dateValue = new Date(year, month, day)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return dateValue > today
    }
  }
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return parsed > today
  }
  return false
}import { getProductPrice } from "./get-product-price"

export function getProductPriceNumber(product: any): number {
  try {
    const priceObj = getProductPrice({ product })
    if (priceObj?.cheapestPrice?.calculated_price_number) {
      return priceObj.cheapestPrice.calculated_price_number
    }
  } catch (e) {}

  const metadataPriceRaw = product.metadata?.specs?.price_rs
  if (metadataPriceRaw) {
    const num = parseFloat(String(metadataPriceRaw).replace(/[^0-9.]/g, ""))
    if (Number.isFinite(num) && num > 0) return num
  }
  return 0
}

export function getSimilarBudgetProducts(
  currentProduct: any,
  allProducts: any[],
  limit: number = 4
): any[] {
  const currentPrice = getProductPriceNumber(currentProduct)
  if (!currentPrice) return []

  return allProducts
    .filter((p) => p.id !== currentProduct.id)
    .map((p) => ({
      product: p,
      diff: Math.abs(currentPrice - getProductPriceNumber(p)),
    }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, limit)
    .map((x) => x.product)
}

export function getSimilarSpecsProducts(
  currentProduct: any,
  allProducts: any[],
  limit: number = 4
): any[] {
  const specs1 = currentProduct.metadata?.specs || {}

  const clean = (val: any) => String(val || "").toLowerCase().replace(/[^a-z0-9]/g, "")

  const extractDigits = (val: any) => {
    const m = String(val || "").match(/\d+/)
    return m ? m[0] : ""
  }

  const ram1 = extractDigits(specs1.memory || specs1.ram || specs1.ram_gb)
  const rom1 = extractDigits(specs1.storage || specs1.storage_gb || specs1.internal_storage || specs1.rom)
  const chip1 = clean(specs1.chipset || specs1.processor || specs1.cpu)
  const bat1 = extractDigits(specs1.battery_capacity || specs1.battery || specs1.battery_mah)
  const disp1 = clean(specs1.display_size || specs1.display || specs1.screen_size)

  return allProducts
    .filter((p) => p.id !== currentProduct.id)
    .map((p) => {
      const specs2 = p.metadata?.specs || {}
      let score = 0

      // Match RAM
      const ram2 = extractDigits(specs2.memory || specs2.ram || specs2.ram_gb)
      if (ram1 && ram2 && ram1 === ram2) score += 5

      // Match ROM
      const rom2 = extractDigits(specs2.storage || specs2.storage_gb || specs2.internal_storage || specs2.rom)
      if (rom1 && rom2 && rom1 === rom2) score += 4

      // Match Chipset
      const chip2 = clean(specs2.chipset || specs2.processor || specs2.cpu)
      if (chip1 && chip2) {
        if (chip1 === chip2) score += 3
        else if (chip1.includes(chip2) || chip2.includes(chip1)) score += 2
      }

      // Match Battery
      const bat2 = extractDigits(specs2.battery_capacity || specs2.battery || specs2.battery_mah)
      if (bat1 && bat2 && bat1 === bat2) score += 2

      // Match Display
      const disp2 = clean(specs2.display_size || specs2.display || specs2.screen_size)
      if (disp1 && disp2 && disp1.substring(0, 3) === disp2.substring(0, 3)) score += 1

      return { product: p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.product)
}

export function getSameBrandProducts(
  currentProduct: any,
  allProducts: any[],
  currentBrandHandle?: string | null,
  limit: number = 4
): any[] {
  const brandHandle = currentBrandHandle || currentProduct.metadata?.brand
  if (!brandHandle) return []

  const cleanHandle = String(brandHandle).toLowerCase().trim()

  return allProducts
    .filter((p) => {
      if (p.id === currentProduct.id) return false
      const pBrand = p.metadata?.brand
      return pBrand && String(pBrand).toLowerCase().trim() === cleanHandle
    })
    .slice(0, limit)
}
