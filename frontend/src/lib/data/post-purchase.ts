import { sdk } from "@lib/config"

export async function createStoreReturn(orderId: string, items: any[], returnShipping?: any) {
  return sdk.client.fetch<{ success: boolean; return: any }>("/store/my-returns", {
    method: "POST",
    body: {
      order_id: orderId,
      items,
      return_shipping: returnShipping,
    },
  })
}

export async function createStoreExchange(orderId: string, items: any[], returnShipping?: any, additionalItems?: any[]) {
  return sdk.client.fetch<{ success: boolean; exchange: any }>("/store/my-exchanges", {
    method: "POST",
    body: {
      order_id: orderId,
      items,
      return_shipping: returnShipping,
      additional_items: additionalItems,
    },
  })
}

export async function createStoreClaim(orderId: string, type: string, items: any[], returnShipping?: any, additionalItems?: any[]) {
  return sdk.client.fetch<{ success: boolean; claim: any }>("/store/my-claims", {
    method: "POST",
    body: {
      order_id: orderId,
      type, // "refund" or "replace"
      items,
      return_shipping: returnShipping,
      additional_items: additionalItems,
    },
  })
}

export async function listReturnReasons() {
  try {
    const data = await sdk.store.returnReason.list()
    return data?.return_reasons || []
  } catch (error) {
    console.error("[Return Reasons Fetch] Failed:", error)
    // Fallback default reasons if the endpoint fails
    return [
      { id: "wrong_size", label: "Wrong Size", value: "wrong_size" },
      { id: "defective", label: "Defective/Damaged", value: "defective" },
      { id: "not_as_described", label: "Not as Described", value: "not_as_described" },
      { id: "changed_mind", label: "Changed my Mind", value: "changed_mind" },
      { id: "other", label: "Other", value: "other" },
    ]
  }
}
