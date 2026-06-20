import { NextRequest, NextResponse } from "next/server"
import { retrieveCustomer } from "@lib/data/customer"

/**
 * POST /api/avatar/upload
 *
 * Authenticated proxy that pushes a customer's profile-picture file to
 * the self-hosted CDN. The CDN response includes the public URL the
 * caller is expected to write into `customer.metadata.avatar_url`.
 *
 * Why proxy instead of letting the browser hit the CDN directly?
 *   - The CDN API key never ships to the client.
 *   - We can enforce per-user file caps + ownership here.
 *   - Failure modes (CDN down, oversized file, wrong mime) collapse
 *     into a single JSON shape the storefront knows how to render.
 *
 * Limits:
 *   - Auth required (401 otherwise — anonymous users can't have an
 *     avatar slot).
 *   - Image MIME only.
 *   - 5 MB ceiling — avatar imagery is small; bigger files almost
 *     always indicate a misuse and we'd be re-encoding them anyway.
 */
export async function POST(req: NextRequest) {
  try {
    const customer = await retrieveCustomer()
    if (!customer) {
      return NextResponse.json(
        { error: "Sign in to update your avatar." },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("image") as File | null
    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      )
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      )
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Avatar images must be under 5 MB." },
        { status: 413 }
      )
    }

    const cdnUrl =
      process.env.NEXT_PUBLIC_CDN_URL || "http://localhost:3061"
    const cdnKey =
      process.env.CDN_API_KEY ||
      "ecomm-cdn-secret-key-change-in-production"

    const cdnFormData = new FormData()
    cdnFormData.append("image", file)
    // Slug includes the customer id so an admin scrolling the CDN can
    // tell whose avatar a file belongs to without an extra DB call.
    cdnFormData.append(
      "slug",
      `avatar-${customer.id}-${Date.now()}`
    )

    const cdnRes = await fetch(`${cdnUrl}/api/media/upload`, {
      method: "POST",
      headers: { "x-cdn-key": cdnKey },
      body: cdnFormData,
    })

    const cdnData = await cdnRes.json().catch(() => ({}))
    if (!cdnRes.ok || !cdnData.success) {
      return NextResponse.json(
        { error: cdnData?.error || "Failed to push image to CDN." },
        { status: cdnRes.status || 502 }
      )
    }

    return NextResponse.json({
      data: {
        url: cdnData.data?.url || cdnData.url,
      },
    })
  } catch (error: any) {
    console.error("[Avatar Upload] error", error)
    return NextResponse.json(
      { error: error?.message || "Failed to upload avatar." },
      { status: 500 }
    )
  }
}
