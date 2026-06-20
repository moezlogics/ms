"use client"

import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "@lib/data/products"
import { addToCart } from "@lib/data/cart"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { getProductPrice } from "@lib/util/get-product-price"
import { getProductPath } from "@lib/util/product"
import { useSiteSettings } from "@lib/context/site-settings-context"

export default function CartCrossSells({ cart }: { cart: HttpTypes.StoreCart }) {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!cart?.region_id) return

    const fetchCrossSells = async () => {
      try {
        // Collect collection IDs and tags from current cart items to find related products
        const collectionIds = new Set<string>()
        const tagIds = new Set<string>()
        
        cart.items?.forEach((item: any) => {
          if (item.variant?.product?.collection_id) {
            collectionIds.add(item.variant.product.collection_id)
          }
          item.variant?.product?.tags?.forEach((tag: any) => {
            if (tag.id) tagIds.add(tag.id)
          })
        })

        const queryParams: HttpTypes.StoreProductListParams = {
          limit: 3,
          is_giftcard: false,
        }

        if (collectionIds.size > 0) {
          queryParams.collection_id = Array.from(collectionIds)
        } else if (tagIds.size > 0) {
          queryParams.tag_id = Array.from(tagIds)
        }

        const { response } = await listProducts({
          regionId: cart.region_id,
          queryParams,
        })

        // Filter out products already in cart
        const cartProductIds = new Set(cart.items?.map((i) => i.product_id) || [])
        const filtered = response.products.filter((p) => !cartProductIds.has(p.id!))

        // If no related products, fallback to recent products
        if (filtered.length === 0) {
          const fallback = await listProducts({
            regionId: cart.region_id,
            queryParams: { limit: 3, is_giftcard: false },
          })
          setProducts(fallback.response.products.filter((p) => !cartProductIds.has(p.id!)).slice(0, 2))
        } else {
          setProducts(filtered.slice(0, 2))
        }
      } catch (e) {
        console.error("Failed to fetch cross-sells", e)
      } finally {
        setLoading(false)
      }
    }

    fetchCrossSells()
  }, [cart])

  if (loading || products.length === 0) return null

  const handleAdd = async (product: HttpTypes.StoreProduct) => {
    const variantId = product.variants?.[0]?.id
    if (!variantId) return

    setAddingId(product.id!)
    try {
      await addToCart({
        variantId,
        quantity: 1,
        countryCode: cart.shipping_address?.country_code || "pk",
      })
    } catch (e) {
      console.error(e)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="border-t border-line px-5 py-4 bg-surface/30">
      <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-3">
        You Might Also Like
      </h3>
      <div className="space-y-3">
        {products.map((product) => {
          const price = getProductPrice({
            product,
            variantId: product.variants?.[0]?.id,
          })
          const displayPrice = price?.variantPrice || price?.cheapestPrice
          const productPath = getProductPath(product)

          return (
            <div key={product.id} className="flex gap-3 bg-bg border border-line p-2.5 rounded-xl shadow-sm">
              <LocalizedClientLink
                href={productPath}
                className={`w-16 shrink-0 rounded-lg overflow-hidden border border-line ${globalAspectClass}`}
              >
                <Thumbnail thumbnail={product.thumbnail} images={product.images} size="square" />
              </LocalizedClientLink>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <LocalizedClientLink
                  href={productPath}
                  className="text-[13px] font-semibold text-ink truncate hover:text-primary transition-colors"
                >
                  {product.title}
                </LocalizedClientLink>
                {displayPrice && (
                  <div className="text-[12px] font-medium text-ink/70 mt-0.5">
                    {displayPrice.calculated_price}
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleAdd(product)}
                  disabled={addingId === product.id}
                  className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-fg flex items-center justify-center transition-colors disabled:opacity-50"
                  aria-label="Add to cart"
                >
                  {addingId === product.id ? (
                    <i className="ph-bold ph-spinner animate-spin text-[14px]" aria-hidden />
                  ) : (
                    <i className="ph-bold ph-plus text-[14px]" aria-hidden />
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
