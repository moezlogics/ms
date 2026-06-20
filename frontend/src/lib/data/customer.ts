"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  clearReturnTo,
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getReturnTo,
  removeAuthToken,
  removeCartId,
  setAuthToken,
  setReturnTo,
} from "./cookies"

import { cookies } from "next/headers"


export const retrieveCustomer =

  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          // Expand both orders AND addresses. Without `*addresses`,
          // Medusa V2 returns the customer record without the saved
          // address book — which made the setup wizard wrongly think
          // the user had no address and re-asked for it on every
          // resume. Profile completion / loyalty steps rely on this
          // too, so it has to live in the shared retrieve helper.
          fields: "*orders,*addresses",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

/**
 * Record where the user came from BEFORE they hit a login wall.
 *
 * Stored as an httpOnly cookie because the Google OAuth round-trip
 * strips any query params we don't tunnel through `state`. Login,
 * signup AND the OAuth callback all consult `getReturnTo()` after a
 * successful authentication and redirect there.
 *
 * Called from client components via `recordReturnTo(path)`.
 */
export async function recordReturnTo(path: string | null) {
  await setReturnTo(path)
}

/**
 * Resolve the post-auth landing URL. We prefer the explicit hidden
 * form field (`return_to`), then the cookie set above, then a sane
 * default. The default depends on the action — a fresh signup goes to
 * the new `/account/setup` wizard so we can collect profile data and
 * award onboarding loyalty points.
 */
async function consumeReturnTo(
  formValue: string | null | undefined,
  fallback: string
): Promise<string> {
  // Form field takes precedence when present and safe.
  if (
    formValue &&
    typeof formValue === "string" &&
    formValue.startsWith("/") &&
    !formValue.startsWith("//")
  ) {
    await clearReturnTo()
    return formValue
  }
  const cookieValue = await getReturnTo()
  await clearReturnTo()
  return cookieValue || fallback
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }
  const returnToField = formData.get("return_to") as string | null

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    await sdk.store.customer.create(customerForm, {}, headers)

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()
  } catch (error: any) {
    return error.toString()
  }

  // New accounts go straight to the dashboard. The previous default
  // sent users to a multi-step setup wizard, but signup now collects
  // first/last name + phone + gender + password up-front so a wizard
  // would just re-ask the same fields. Anything still missing surfaces
  // as a "Finish your profile" checklist on the dashboard with deep
  // links to the relevant editor — far less disruptive.
  const target = await consumeReturnTo(returnToField, "/account")
  redirect(target)
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const returnToField = formData.get("return_to") as string | null

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      })
  } catch (error: any) {
    return error.toString()
  }

  try {
    await transferCart()
  } catch (error: any) {
    return error.toString()
  }

  // Returning users default to /account; cart/checkout flows override.
  const target = await consumeReturnTo(returnToField, "/account")
  redirect(target)
}

export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect(`/account`)
}

export async function transferCart() {
  const cartId = await getCartId()
  const cookieStore = await cookies()


  const headers = await getAuthHeaders()

  if (cartId) {
    await sdk.store.cart.transferCart(cartId, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }


}


export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async ({ customer }) => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export async function updatePassword(_currentState: any, formData: FormData) {
  const oldPassword = formData.get("old_password") as string
  const newPassword = formData.get("new_password") as string
  const confirmPassword = formData.get("confirm_password") as string

  if (newPassword !== confirmPassword) {
    return "New passwords do not match"
  }

  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    // In Medusa V2, we update the password through the auth module
    // This typically involves calling the auth update endpoint
    await sdk.auth.update("customer", "emailpass", {
      old_password: oldPassword,
      password: newPassword,
    }, headers)

    return null // success
  } catch (error: any) {
    return error.toString()
  }
}

