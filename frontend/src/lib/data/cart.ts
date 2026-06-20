"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "@lib/data/locale-actions"
import { retrieveCustomer } from "./customer"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.product.metadata, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, *shipping_methods"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

/**
 * Server action: returns the current cart id from the HttpOnly cookie.
 *
 * Called lazily by the chat widget on first interaction so we never read
 * `cookies()` during static generation of pages like the PDP. Returns
 * null when no cart has been started yet.
 */
export async function getCurrentCartId(): Promise<string | null> {
  return (await getCartId()) || null
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

/**
 * Add a bundle to the cart. Hits the custom backend route
 * `POST /store/carts/:id/line-item-bundles` which spins up a workflow
 * that adds every bundle item as a line item with bundle metadata so
 * we can group them in the cart view.
 */
export async function addBundleToCart({
  bundle_id,
  quantity,
  items,
  countryCode,
}: {
  bundle_id: string
  quantity: number
  items: Array<{ item_id: string; variant_id: string }>
  countryCode: string
}) {
  const cart = await getOrSetCart(countryCode)
  if (!cart) throw new Error("Error retrieving or creating cart")

  const backendUrl =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:3062"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  const authHeaders = (await getAuthHeaders()) as Record<string, string>
  const res = await fetch(
    `${backendUrl}/store/carts/${cart.id}/line-item-bundles`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": publishableKey,
        ...(authHeaders || {}),
      },
      body: JSON.stringify({ bundle_id, quantity, items }),
    }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.message || `Bundle add failed (${res.status})`)
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  const cartId = await getCartId()
  if (!cartId) throw new Error("No existing cart found")

  const headers = { ...(await getAuthHeaders()) }

  // In Medusa v2, gift cards are applied the same way as promo codes
  return sdk.store.cart
    .update(cartId, { promo_codes: [code] }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function removeDiscount(code: string) {
  const cartId = await getCartId()
  if (!cartId) throw new Error("No existing cart found")

  const headers = { ...(await getAuthHeaders()) }

  // Fetch current cart to get all promo codes, then reapply without the removed one
  const cart = await retrieveCart()
  const currentCodes = (cart?.promotions || [])
    .map((p: any) => p.code)
    .filter((c: string) => c !== code)

  return sdk.store.cart
    .update(cartId, { promo_codes: currentCodes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
) {
  const cartId = await getCartId()
  if (!cartId) throw new Error("No existing cart found")

  const headers = { ...(await getAuthHeaders()) }

  // Reapply all gift card codes except the one being removed
  const remainingCodes = giftCards
    .filter((gc) => gc.code !== codeToRemove)
    .map((gc) => gc.code)

  return sdk.store.cart
    .update(cartId, { promo_codes: remainingCodes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const data = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: formData.get("shipping_address.company"),
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: formData.get("shipping_address.phone"),
      },
      email: formData.get("email"),
    } as any

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: "",
        company: formData.get("billing_address.company"),
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
      }

    // Persist map coordinates + reverse-geocoded address as cart metadata
    // so they carry through to the completed order and are visible on the
    // thank-you page and in the admin order detail.
    let mapLat = formData.get("map_lat") as string | null
    let mapLng = formData.get("map_lng") as string | null
    const mapAddress = formData.get("map_address") as string | null
    let mapSource = formData.get("map_source") as string | null
    const pushEndpoint = formData.get("push_endpoint") as string | null
    const guestId = formData.get("guest_id") as string | null

    // If manual address but no coordinates, try to geocode it
    if ((!mapLat || !mapLng) && data.shipping_address.address_1) {
      const addressString = [
        data.shipping_address.address_1,
        data.shipping_address.city,
        data.shipping_address.province,
        data.shipping_address.country_code
      ].filter(Boolean).join(", ")

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(addressString)}&limit=1`
        const res = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "Medusa-Storefront" } })
        if (res.ok) {
          const result = await res.json()
          if (Array.isArray(result) && result.length > 0) {
            mapLat = result[0].lat
            mapLng = result[0].lon
            mapSource = "manual_geocode"
          }
        }
      } catch (e) {
        // Ignore geocoding errors
      }
    }

    const metadata: Record<string, any> = {}
    if (mapLat && mapLng && mapLat !== "" && mapLng !== "") {
      metadata.map_lat = parseFloat(mapLat)
      metadata.map_lng = parseFloat(mapLng)
      metadata.map_address = mapAddress || ""
      metadata.map_source = mapSource || "form"
    }
    if (pushEndpoint) {
      metadata.push_endpoint = pushEndpoint
    }
    // Guest ownership — stamped onto the cart so the order is owned at
    // creation (see order-placed subscriber). Closes the link-guest race.
    if (guestId) {
      metadata.guest_id = guestId
    }
    if (Object.keys(metadata).length > 0) {
      data.metadata = metadata
    }

    await updateCart(data)
  } catch (e: any) {
    return e.message
  }
}

/**
 * Saves shipping + billing address then places the order in one shot.
 * Used by the single-page Shopify-style checkout form.
 */
export async function setAddressesAndPlace(currentState: unknown, formData: FormData) {
  if (!formData) return "No form data found"
  const cartId = await getCartId()
  if (!cartId) return "No existing cart found"

  try {
    const data: any = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: "",
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: formData.get("shipping_address.phone"),
      },
      email: formData.get("email"),
    }

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") {
      data.billing_address = data.shipping_address
    } else {
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: "",
        company: "",
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: formData.get("billing_address.phone"),
      }
    }

    const mapLat = formData.get("map_lat") as string | null
    const mapLng = formData.get("map_lng") as string | null
    const mapAddress = formData.get("map_address") as string | null
    const mapSource = formData.get("map_source") as string | null
    const pushEndpoint = formData.get("push_endpoint") as string | null
    const guestId = formData.get("guest_id") as string | null

    const metadata: Record<string, any> = {}
    if (mapLat && mapLng && mapLat !== "" && mapLng !== "") {
      metadata.map_lat = parseFloat(mapLat)
      metadata.map_lng = parseFloat(mapLng)
      metadata.map_address = mapAddress || ""
      metadata.map_source = mapSource || "form"
    }
    if (pushEndpoint) {
      metadata.push_endpoint = pushEndpoint
    }
    if (guestId) {
      metadata.guest_id = guestId
    }
    if (Object.keys(metadata).length > 0) {
      data.metadata = metadata
    }

    await updateCart(data)

    // Save shipping address to customer profile if they are logged in and have 0 addresses saved
    try {
      const customer = await retrieveCustomer()
      if (customer && (!customer.addresses || customer.addresses.length === 0)) {
        const headers = {
          ...(await getAuthHeaders()),
        }
        await sdk.store.customer.createAddress(
          {
            first_name: data.shipping_address.first_name,
            last_name: data.shipping_address.last_name,
            address_1: data.shipping_address.address_1,
            address_2: "",
            city: data.shipping_address.city,
            postal_code: data.shipping_address.postal_code,
            province: data.shipping_address.province,
            country_code: data.shipping_address.country_code,
            phone: data.shipping_address.phone,
            is_default_shipping: true,
            is_default_billing: true,
          },
          {},
          headers
        )
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      }
    } catch (e) {
      console.error("Failed to auto-save shipping address to profile:", e)
    }

  } catch (e: any) {
    return e.message
  }

  // Place the order — redirect is thrown internally on success; re-throw it
  try {
    await placeOrder()
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e
    return e.message
  }
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    removeCartId()
    redirect(`/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
