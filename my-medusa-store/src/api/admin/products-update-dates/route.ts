import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const manager = req.scope.resolve("__pg_connection__")
    const { product_ids } = req.body as { product_ids?: string[] }
    
    if (product_ids && product_ids.length > 0) {
      // Update selected products while preserving their relative created_at order
      await manager.raw(`
        WITH ordered_products AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
          FROM product
          WHERE id = ANY(?)
        )
        UPDATE product
        SET created_at = NOW() + (ordered_products.row_num * INTERVAL '1 second'),
            updated_at = NOW() + (ordered_products.row_num * INTERVAL '1 second')
        FROM ordered_products
        WHERE product.id = ordered_products.id
      `, [product_ids])
    } else {
      // Update all products while preserving their relative created_at order
      await manager.raw(`
        WITH ordered_products AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
          FROM product
        )
        UPDATE product
        SET created_at = NOW() + (ordered_products.row_num * INTERVAL '1 second'),
            updated_at = NOW() + (ordered_products.row_num * INTERVAL '1 second')
        FROM ordered_products
        WHERE product.id = ordered_products.id
      `)
    }

    // Clear storefront cache if configured
    const storefrontUrl = process.env.STOREFRONT_URL
    const secret = process.env.REVALIDATE_SECRET
    let revalidated = false
    let revalidateError: string | null = null

    if (storefrontUrl && secret) {
      try {
        const revalRes = await fetch(`${storefrontUrl.replace(/\/+$/, "")}/api/revalidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": secret,
          },
          body: JSON.stringify({
            tags: ["products"],
            paths: ["/sitemap.xml", "/sitemap-0.xml"]
          }),
        })
        if (revalRes.ok) {
          revalidated = true
        } else {
          const text = await revalRes.text()
          revalidateError = `Status ${revalRes.status}: ${text}`
        }
      } catch (e: any) {
        revalidateError = e.message
      }
    }

    res.status(200).json({ 
      success: true, 
      message: product_ids && product_ids.length > 0 
        ? `Successfully updated timestamps for ${product_ids.length} selected product(s).` 
        : "All product timestamps successfully updated to current time.",
      revalidated,
      ...(revalidateError ? { revalidateError } : {})
    })
  } catch (error: any) {
    console.error("[products-update-dates] failed:", error)
    res.status(500).json({ success: false, error: error.message || "Failed to update product timestamps." })
  }
}
