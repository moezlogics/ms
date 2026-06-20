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
}


