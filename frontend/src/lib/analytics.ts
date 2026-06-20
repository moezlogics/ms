/**
 * E-commerce event tracking — fires both GA4 and Meta (Facebook) Pixel
 * standard events from a single helper. Each function is a no-op when the
 * corresponding global (`gtag` / `fbq`) hasn't loaded, so it's always safe
 * to call.
 *
 * GA reference:   https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 * Meta reference: https://developers.facebook.com/docs/meta-pixel/reference
 */

type GtagItem = {
  item_id: string
  item_name: string
  item_category?: string
  item_variant?: string
  price?: number
  quantity?: number
  currency?: string
}

function gtag(...args: any[]) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    ;(window as any).gtag(...args)
  }
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && (window as any).fbq) {
    ;(window as any).fbq(...args)
  }
}

/** Track when a user views a product detail page */
export function trackViewItem(product: {
  id: string
  title: string
  category?: string
  price?: number
  currency?: string
}) {
  gtag("event", "view_item", {
    currency: product.currency?.toUpperCase() || "USD",
    value: product.price || 0,
    items: [
      {
        item_id: product.id,
        item_name: product.title,
        item_category: product.category || "",
        price: product.price || 0,
      },
    ],
  })

  fbq("track", "ViewContent", {
    content_ids: [product.id],
    content_name: product.title,
    content_type: "product",
    content_category: product.category,
    value: product.price || 0,
    currency: product.currency?.toUpperCase() || "USD",
  })
}

/** Track when a user adds an item to cart */
export function trackAddToCart(item: {
  id: string
  title: string
  variant?: string
  price: number
  quantity: number
  currency: string
}) {
  gtag("event", "add_to_cart", {
    currency: item.currency.toUpperCase(),
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.title,
        item_variant: item.variant || "",
        price: item.price,
        quantity: item.quantity,
      },
    ],
  })

  fbq("track", "AddToCart", {
    content_ids: [item.id],
    content_name: item.title,
    content_type: "product",
    value: item.price * item.quantity,
    currency: item.currency.toUpperCase(),
    contents: [
      { id: item.id, quantity: item.quantity, item_price: item.price },
    ],
  })
}

/** Track when a user removes an item from cart (GA only — no Meta standard event) */
export function trackRemoveFromCart(item: {
  id: string
  title: string
  price: number
  quantity: number
  currency: string
}) {
  gtag("event", "remove_from_cart", {
    currency: item.currency.toUpperCase(),
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.title,
        price: item.price,
        quantity: item.quantity,
      },
    ],
  })
}

/** Track when a user views their cart (GA only — Meta has no standard "view cart" event) */
export function trackViewCart(cart: {
  items: Array<{
    id: string
    title: string
    price: number
    quantity: number
  }>
  total: number
  currency: string
}) {
  gtag("event", "view_cart", {
    currency: cart.currency.toUpperCase(),
    value: cart.total,
    items: cart.items.map((item) => ({
      item_id: item.id,
      item_name: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

/** Track when a user begins checkout */
export function trackBeginCheckout(cart: {
  items: Array<{
    id: string
    title: string
    price: number
    quantity: number
  }>
  total: number
  currency: string
}) {
  gtag("event", "begin_checkout", {
    currency: cart.currency.toUpperCase(),
    value: cart.total,
    items: cart.items.map((item) => ({
      item_id: item.id,
      item_name: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  })

  fbq("track", "InitiateCheckout", {
    content_ids: cart.items.map((i) => i.id),
    content_type: "product",
    num_items: cart.items.reduce((sum, i) => sum + i.quantity, 0),
    value: cart.total,
    currency: cart.currency.toUpperCase(),
    contents: cart.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      item_price: i.price,
    })),
  })
}

/** Track a completed purchase */
export function trackPurchase(order: {
  id: string
  total: number
  tax?: number
  shipping?: number
  currency: string
  items: Array<{
    id: string
    title: string
    price: number
    quantity: number
    variant?: string
  }>
}) {
  gtag("event", "purchase", {
    transaction_id: order.id,
    value: order.total,
    tax: order.tax || 0,
    shipping: order.shipping || 0,
    currency: order.currency.toUpperCase(),
    items: order.items.map((item) => ({
      item_id: item.id,
      item_name: item.title,
      item_variant: item.variant || "",
      price: item.price,
      quantity: item.quantity,
    })),
  })

  fbq("track", "Purchase", {
    content_ids: order.items.map((i) => i.id),
    content_type: "product",
    num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
    value: order.total,
    currency: order.currency.toUpperCase(),
    contents: order.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      item_price: i.price,
    })),
  })
}

/** Track a search query */
export function trackSearch(term: string) {
  gtag("event", "search", { search_term: term })
  fbq("track", "Search", { search_string: term })
}
