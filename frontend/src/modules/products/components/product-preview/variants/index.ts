import MinimalCard from "./minimal"
import EditorialCard from "./editorial"
import BoxedCard from "./boxed"
import LuxeCard from "./luxe"
import HoverRevealCard from "./hover-reveal"
import CompactCard from "./compact"
import SpotlightCard from "./spotlight"
import SplitFrameCard from "./split-frame"
import ShowcaseCard from "./showcase"
import GroceryFreshCard from "./grocery-fresh"
import TechSpecCard from "./tech-spec"
import FashionDrapeCard from "./fashion-drape"
import ShopifyCard from "./shopify"
import ShopUsCard from "./shopus"
import PixioCard from "./pixio"
import ShopifyBoldCard from "./shopify-bold"
import ShopifyGridCard from "./shopify-grid"
import type { ProductCardProps, ProductCardVariantMeta } from "./types"

export type { ProductCardProps, ProductCardVariantMeta } from "./types"

/**
 * Single source of truth mapping variant keys → React components +
 * human-readable metadata. The admin picker and the storefront
 * dispatcher both read from this registry so adding a new design is a
 * one-file change.
 */
export const PRODUCT_CARD_VARIANTS: Record<
  string,
  {
    meta: ProductCardVariantMeta
    Component: (props: ProductCardProps) => JSX.Element
  }
> = {
  minimal: {
    meta: {
      key: "minimal",
      label: "Minimal",
      tag: "Clean · Airy",
      description:
        "Laam / Everlane style. Clean image, badges top-left, title + price below. Safe default.",
    },
    Component: MinimalCard,
  },
  editorial: {
    meta: {
      key: "editorial",
      label: "Editorial",
      tag: "Centered · Magazine",
      description:
        "Centered text, uppercase eyebrow, hover image swap. Suits fashion & lifestyle catalogs.",
    },
    Component: EditorialCard,
  },
  boxed: {
    meta: {
      key: "boxed",
      label: "Boxed",
      tag: "Bordered tile",
      description:
        "Each product sits in a bordered surface with padded info block. Lifts on hover.",
    },
    Component: BoxedCard,
  },
  luxe: {
    meta: {
      key: "luxe",
      label: "Luxe Overlay",
      tag: "Overlay · Dark scrim",
      description:
        "Title + price float on a gradient scrim over the image. Luxury / moody brands.",
    },
    Component: LuxeCard,
  },
  "hover-reveal": {
    meta: {
      key: "hover-reveal",
      label: "Hover Reveal",
      tag: "Shopify Premium",
      description:
        "Secondary image crossfades on hover; a 'View product' pill slides up from the bottom.",
    },
    Component: HoverRevealCard,
  },
  compact: {
    meta: {
      key: "compact",
      label: "Compact",
      tag: "Dense grids",
      description:
        "Tighter spacing and smaller badges. Ideal for search results and 'also bought' rails.",
    },
    Component: CompactCard,
  },
  spotlight: {
    meta: {
      key: "spotlight",
      label: "Spotlight",
      tag: "Premium · Halo",
      description:
        "Rounded frame with soft accent halo on hover. Circular discount chip, floating action rail, subtle Shop arrow under the price.",
    },
    Component: SpotlightCard,
  },
  "split-frame": {
    meta: {
      key: "split-frame",
      label: "Split Frame",
      tag: "Boutique · Ribbon",
      description:
        "Bordered card with photo on top and an info block with an accent side-band. Ribbon-style discount badge and an arrow CTA that slides on hover.",
    },
    Component: SplitFrameCard,
  },
  showcase: {
    meta: {
      key: "showcase",
      label: "Showcase",
      tag: "Lookbook · Immersive",
      description:
        "Full-bleed photo with a magazine-style dark overlay. Title + price float in white; 'Shop Now' pill slides up on hover.",
    },
    Component: ShowcaseCard,
  },
  "grocery-fresh": {
    meta: {
      key: "grocery-fresh",
      label: "Grocery Fresh",
      tag: "Grocery · Quick-add",
      description:
        "Bright tile with brand name, pack size pill, price-per-unit, and a circular '+' quick-add button. Optimized for high-density grocery grids.",
    },
    Component: GroceryFreshCard,
  },
  "tech-spec": {
    meta: {
      key: "tech-spec",
      label: "Tech Spec",
      tag: "Electronics · Neon",
      description:
        "Dark engineered card with corner brackets, scanline sweep on hover, neon cyan glow, and a chunky uppercase 'Add to Cart' bar with a sliding shimmer.",
    },
    Component: TechSpecCard,
  },
  "fashion-drape": {
    meta: {
      key: "fashion-drape",
      label: "Fashion Drape",
      tag: "Apparel · Boutique",
      description:
        "Tall portrait with serif typography, color-swatch dots that fan in on hover, a slow gallery crossfade, and a 'Quick Shop' bar revealed at the foot of the image.",
    },
    Component: FashionDrapeCard,
  },
  shopify: {
    meta: {
      key: "shopify",
      label: "Shopify Minimal",
      tag: "Shopify · Clean",
      description:
        "Shopify-style ultra-clean card with compact details and thin outlines.",
    },
    Component: ShopifyCard,
  },
  shopus: {
    meta: {
      key: "shopus",
      label: "ShopUs",
      tag: "ShopUs · Shadowed",
      description:
        "Product card design from the ShopUs template with soft shadows, dynamic actions, and rating stars.",
    },
    Component: ShopUsCard,
  },
  pixio: {
    meta: {
      key: "pixio",
      label: "Pixio",
      tag: "Pixio · Translate",
      description:
        "Product card design from the NuxtJs-Pixio template with image-translate hover effects and action buttons.",
    },
    Component: PixioCard,
  },
  "shopify-bold": {
    meta: {
      key: "shopify-bold",
      label: "Shopify Bold",
      tag: "Shopify · Shadow",
      description:
        "Shopify-style bold product card with full-width Add to Cart hover buttons and border highlight.",
    },
    Component: ShopifyBoldCard,
  },
  "shopify-grid": {
    meta: {
      key: "shopify-grid",
      label: "Shopify Grid",
      tag: "Shopify · Compact",
      description:
        "Shopify-style high-density grid card with clean typography, pack details, and inline discount pill.",
    },
    Component: ShopifyGridCard,
  },
}

export const PRODUCT_CARD_VARIANT_LIST: ProductCardVariantMeta[] = Object.values(
  PRODUCT_CARD_VARIANTS
).map((v) => v.meta)

export const DEFAULT_PRODUCT_CARD_VARIANT = "minimal"

export function resolveProductCardVariant(key?: string | null): string {
  if (!key) return DEFAULT_PRODUCT_CARD_VARIANT
  return PRODUCT_CARD_VARIANTS[key] ? key : DEFAULT_PRODUCT_CARD_VARIANT
}
