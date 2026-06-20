import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const product_id = req.query.product_id as string

  if (!product_id) {
    return res.status(400).json({ error: "product_id query param is required" })
  }

  const links = await svc.listBrandProducts(
    { product_id },
    { take: 1 }
  )

  const brand_id = links.length ? links[0].brand_id : null
  let brand: any = null

  if (brand_id) {
    try {
      brand = await svc.retrieveBrand(brand_id)
    } catch {
      brand = null
    }
  }

  res.json({ brand_id, brand })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { product_id, brand_id } = (req.body || {}) as Record<string, any>

  if (!product_id || !brand_id) {
    return res.status(400).json({ error: "product_id and brand_id are required" })
  }

  const existing = await svc.listBrandProducts({ product_id }, { take: 1 })
  if (existing.length) {
    await svc.updateBrandProducts([
      { id: existing[0].id, brand_id } as any,
    ])
  } else {
    await svc.createBrandProducts([
      { product_id, brand_id } as any,
    ])
  }

  res.json({ product_id, brand_id, linked: true })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const product_id = req.query.product_id as string || (req.body as any)?.product_id

  if (!product_id) {
    return res.status(400).json({ error: "product_id is required" })
  }

  const existing = await svc.listBrandProducts({ product_id }, { take: 1 })
  if (existing.length) {
    await svc.deleteBrandProducts([existing[0].id])
  }

  res.json({ product_id, unlinked: true })
}
