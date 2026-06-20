import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { QueryContext } from "@medusajs/framework/utils"

/**
 * GET /store/bundle-products
 *   Public: list bundles for the storefront. Used by the PDP "Buy as
 *   bundle" card to surface any bundles where a given product appears
 *   as the showcased item or as one of the bundle items.
 *
 * Query:
 *   ?product_id=xxx       — return only bundles featuring this product
 *   ?currency_code=usd    — required for variant pricing
 *   ?region_id=reg_xxx    — required for variant pricing
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query")
  const { product_id, currency_code, region_id } = req.query as Record<
    string,
    string
  >

  const { data: bundles } = await query.graph(
    {
      entity: "bundle",
      fields: [
        "id",
        "title",
        "product.id",
        "product.title",
        "product.handle",
        "product.thumbnail",
        "items.id",
        "items.quantity",
        "items.product.id",
        "items.product.title",
        "items.product.handle",
        "items.product.thumbnail",
        "items.product.variants.id",
        "items.product.variants.title",
        "items.product.variants.calculated_price.*",
        "items.product.variants.options.*",
        "items.product.options.*",
        "items.product.options.values.*",
      ],
      context: {
        items: {
          product: {
            variants: {
              calculated_price: QueryContext({
                region_id,
                currency_code,
              }),
            },
          },
        },
      },
    }
  )

  let filtered = bundles || []
  if (product_id) {
    filtered = filtered.filter(
      (b: any) =>
        b?.product?.id === product_id ||
        (b?.items || []).some((i: any) => i?.product?.id === product_id)
    )
  }

  res.json({ bundle_products: filtered })
}
