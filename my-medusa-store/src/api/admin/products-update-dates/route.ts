import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const manager = req.scope.resolve("__pg_connection__")
    
    // Perform bulk update directly in the database for zero server/memory overhead
    await manager.raw(`
      UPDATE product 
      SET created_at = NOW(), 
          updated_at = NOW()
    `)

    // Clear storefront cache if configured
    const storefrontUrl = process.env.STOREFRONT_URL
    const secret = process.env.REVALIDATE_SECRET
    let revalidated = false
    let revalidateError = null

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
      message: "All product timestamps successfully updated to current time.",
      revalidated,
      ...(revalidateError && { revalidateError })
    })
  } catch (error: any) {
    console.error("[products-update-dates] failed:", error)
    res.status(500).json({ success: false, error: error.message || "Failed to update product timestamps." })
  }
}
