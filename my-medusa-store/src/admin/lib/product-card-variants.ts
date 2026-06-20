/**
 * Admin-side mirror of the storefront product-card variant registry.
 *
 * IMPORTANT: the admin and storefront are separate packages, so we
 * duplicate this short list of metadata here. Whenever you add or
 * rename a variant, update BOTH:
 *   - storefront: src/modules/products/components/product-preview/variants/index.ts
 *   - admin:      src/admin/lib/product-card-variants.ts
 *
 * The `key` values MUST match — they are persisted as the
 * `product_card_variant` site-setting string and read back on the
 * storefront.
 */

export type ProductCardVariantMeta = {
  key: string
  label: string
  tag: string
  description: string
}

export const PRODUCT_CARD_VARIANTS: ProductCardVariantMeta[] = [
  {
    key: "minimal",
    label: "Minimal",
    tag: "Clean · Airy",
    description:
      "Laam / Everlane style. Clean image, badges top-left, title + price below. Safe default.",
  },
  {
    key: "editorial",
    label: "Editorial",
    tag: "Centered · Magazine",
    description:
      "Centered text, uppercase eyebrow, hover image swap. Suits fashion & lifestyle catalogs.",
  },
  {
    key: "boxed",
    label: "Boxed",
    tag: "Bordered tile",
    description:
      "Each product sits in a bordered surface with padded info block. Lifts on hover.",
  },
  {
    key: "luxe",
    label: "Luxe Overlay",
    tag: "Overlay · Dark scrim",
    description:
      "Title + price float on a gradient scrim over the image. Luxury / moody brands.",
  },
  {
    key: "hover-reveal",
    label: "Hover Reveal",
    tag: "Shopify Premium",
    description:
      "Secondary image crossfades on hover; a 'View product' pill slides up.",
  },
  {
    key: "compact",
    label: "Compact",
    tag: "Dense grids",
    description:
      "Tighter spacing and smaller badges. Ideal for search results and 'also bought' rails.",
  },
  {
    key: "spotlight",
    label: "Spotlight",
    tag: "Premium · Halo",
    description:
      "Rounded frame with soft accent halo on hover. Circular discount chip, floating action rail, subtle Shop arrow under the price.",
  },
  {
    key: "split-frame",
    label: "Split Frame",
    tag: "Boutique · Ribbon",
    description:
      "Bordered card with photo on top and an info block with an accent side-band. Ribbon-style discount badge and an arrow CTA that slides on hover.",
  },
  {
    key: "showcase",
    label: "Showcase",
    tag: "Lookbook · Immersive",
    description:
      "Full-bleed photo with a magazine-style dark overlay. Title + price float in white; 'Shop Now' pill slides up on hover.",
  },
  {
    key: "grocery-fresh",
    label: "Grocery Fresh",
    tag: "Grocery · Quick-add",
    description:
      "Bright tile with brand name, pack-size pill, price-per-unit, and a circular '+' quick-add button. Optimized for high-density grocery grids.",
  },
  {
    key: "tech-spec",
    label: "Tech Spec",
    tag: "Electronics · Neon",
    description:
      "Dark engineered card with corner brackets, scanline sweep on hover, neon cyan glow, and a chunky uppercase 'Add to Cart' bar with a sliding shimmer.",
  },
  {
    key: "fashion-drape",
    label: "Fashion Drape",
    tag: "Apparel · Boutique",
    description:
      "Tall portrait with serif typography, color-swatch dots that fan in on hover, a slow gallery crossfade, and a 'Quick Shop' bar revealed at the foot of the image.",
  },
  {
    key: "shopify",
    label: "Shopify Minimal",
    tag: "Shopify · Clean",
    description:
      "Shopify-style ultra-clean card with compact details and thin outlines.",
  },
  {
    key: "shopus",
    label: "ShopUs",
    tag: "ShopUs · Shadowed",
    description:
      "Product card design from the ShopUs template with soft shadows, dynamic actions, and rating stars.",
  },
  {
    key: "pixio",
    label: "Pixio",
    tag: "Pixio · Translate",
    description:
      "Product card design from the NuxtJs-Pixio template with image-translate hover effects and action buttons.",
  },
  {
    key: "shopify-bold",
    label: "Shopify Bold",
    tag: "Shopify · Shadow",
    description:
      "Shopify-style bold product card with full-width Add to Cart hover buttons and border highlight.",
  },
  {
    key: "shopify-grid",
    label: "Shopify Grid",
    tag: "Shopify · Compact",
    description:
      "Shopify-style high-density grid card with clean typography, pack details, and inline discount pill.",
  },
]

export const DEFAULT_PRODUCT_CARD_VARIANT = "minimal"
