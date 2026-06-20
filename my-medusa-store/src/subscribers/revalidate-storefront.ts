import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

/**
 * Storefront cache-invalidation bridge.
 *
 * Whenever a public-facing entity changes in Medusa (a product is
 * created, a category is renamed, a collection is deleted, etc.)
 * this subscriber POSTs to the Next.js storefront's
 * `/api/revalidate` route so it can drop the stale fetch cache. The
 * route on the storefront side then calls `revalidateTag(...)` for
 * each tag we send, and visitors immediately start seeing fresh
 * data on their next request.
 *
 * Configuration (set in the backend `.env`):
 *   STOREFRONT_URL       https://your-storefront.com   (no trailing slash)
 *   REVALIDATE_SECRET    same shared secret as the storefront `.env`
 *
 * The event → tag mapping mirrors the global tag whitelist on the
 * storefront in `src/lib/data/cookies.ts::GLOBAL_REVALIDATE_TAGS`.
 *
 * Failure handling: this subscriber NEVER throws. A revalidation
 * miss should never block an admin save. We log and move on.
 */

function eventToTags(eventName: string): string[] {
  if (eventName.startsWith("product.")) {
    return ["products", "collections", "categories"]
  }
  if (eventName.startsWith("product-variant.")) {
    return ["products"]
  }
  if (eventName.startsWith("product-category.")) {
    return ["categories", "products"]
  }
  if (eventName.startsWith("product-collection.")) {
    return ["collections", "products"]
  }
  if (eventName.startsWith("region.")) {
    return ["regions"]
  }
  if (eventName.startsWith("sales-channel.")) {
    return ["sales-channels", "products"]
  }
  if (eventName.startsWith("shipping-option.")) {
    return ["shipping-options"]
  }
  if (eventName.startsWith("price-list.") || eventName.startsWith("price.")) {
    return ["products"]
  }
  if (eventName.startsWith("site-settings.")) {
    return ["site-settings"]
  }
  if (eventName.startsWith("banner.")) {
    return ["banners"]
  }
  if (eventName.startsWith("brand.")) {
    return ["brands", "products"]
  }
  if (eventName.startsWith("blog.") || eventName.startsWith("blog-post.")) {
    return ["blog"]
  }
  return []
}

export default async function revalidateStorefrontHandler({
  event,
}: SubscriberArgs<unknown>) {
  const storefrontUrl = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET

  if (!storefrontUrl || !secret) {
    console.warn(
      "[revalidate-storefront] STOREFRONT_URL or REVALIDATE_SECRET not set; skipping revalidation for event '" +
        event.name +
        "'"
    )
    return
  }

  const tags = eventToTags(event.name)
  if (tags.length === 0) {
    return
  }

  try {
    const res = await fetch(
      `${storefrontUrl.replace(/\/+$/, "")}/api/revalidate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": secret,
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(5_000),
      }
    )

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn(
        `[revalidate-storefront] storefront returned ${res.status} for '${event.name}' (tags=${tags.join(",")}): ${body.slice(0, 200)}`
      )
    }
  } catch (err) {
    console.warn(
      `[revalidate-storefront] failed for event '${event.name}' (tags=${tags.join(",")}):`,
      (err as Error).message
    )
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
    "region.created",
    "region.updated",
    "region.deleted",
    "sales-channel.created",
    "sales-channel.updated",
    "sales-channel.deleted",
    "shipping-option.created",
    "shipping-option.updated",
    "shipping-option.deleted",
    "price-list.created",
    "price-list.updated",
    "price-list.deleted",
    "site-settings.created",
    "site-settings.updated",
    "site-settings.deleted",
    "banner.created",
    "banner.updated",
    "banner.deleted",
    "brand.created",
    "brand.updated",
    "brand.deleted",
    "blog-post.created",
    "blog-post.updated",
    "blog-post.deleted",
  ],
}
