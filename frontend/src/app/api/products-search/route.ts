import { NextResponse } from "next/server"
import { getAllProductBrandMap } from "@lib/data/brands"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:8042"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const STORE_HEADERS: Record<string, string> = PUBLISHABLE_KEY
  ? { "x-publishable-api-key": PUBLISHABLE_KEY }
  : {}

export async function GET() {
  try {
    const res = await fetch(
      `${BACKEND_URL}/store/products?limit=2000&fields=id,title,handle,thumbnail,description,*categories,metadata`,
      {
        headers: STORE_HEADERS,
        next: { tags: ["products-search"], revalidate: 600 }, // 10 minutes cache
      }
    )
    if (!res.ok) {
      console.error("[products-search-api] Backend returned non-200 status:", res.status, res.statusText)
      return NextResponse.json({ products: [] })
    }
    const { products } = await res.json()
    const productList = products || []

    try {
      const productBrandMap = await getAllProductBrandMap()
      for (const p of productList) {
        const brand = productBrandMap[p.id]
        if (brand) {
          p.metadata = {
            ...(p.metadata || {}),
            brand: brand.handle,
          }
        }
      }
    } catch (e) {
      console.error("[products-search-api] failed to map brands:", e)
    }

    return NextResponse.json({ products: productList })
  } catch (error) {
    console.error("[products-search-api] failed to fetch products", error)
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}
