import { NextRequest, NextResponse } from "next/server"
import { retrieveCustomer } from "@lib/data/customer"

export async function POST(req: NextRequest) {
  try {
    const customer = await retrieveCustomer()
    if (!customer) {
      return NextResponse.json({ error: "Only logged-in users can upload review photos." }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("image") as File | null
    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Each image must be under 10MB." }, { status: 413 })
    }

    const productId = String(formData.get("productId") || "product").trim()
    const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "product"
    
    // We can confidently use CDN_URL and CDN_API_KEY from secure server-side env
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || "http://localhost:3061"
    const cdnKey = process.env.CDN_API_KEY || "ecomm-cdn-secret-key-change-in-production"

    const cdnFormData = new FormData()
    cdnFormData.append("image", file)
    cdnFormData.append("slug", `review-${safeProductId}-${customer.id}-${Date.now()}`)

    const cdnRes = await fetch(`${cdnUrl}/api/media/upload`, {
      method: "POST",
      headers: { "x-cdn-key": cdnKey },
      body: cdnFormData,
    })

    const cdnData = await cdnRes.json()
    if (!cdnRes.ok || !cdnData.success) {
      return NextResponse.json(
        { error: cdnData?.error || "Failed to route image to CDN." },
        { status: cdnRes.status || 500 }
      )
    }

    // Standardize return payload matching the new CDN output format
    return NextResponse.json({
      data: {
        url: cdnData.data?.url || cdnData.url,
      },
    })
  } catch (error: any) {
    console.error("[Next API Proxy] Upload Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to upload image." },
      { status: 500 }
    )
  }
}
