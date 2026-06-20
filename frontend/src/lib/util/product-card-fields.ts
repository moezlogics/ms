/**
 * Light field set for PRODUCT-CARD GRIDS (store/category archives, homepage
 * rail, related products, FBT).
 *
 * The listProducts default fields pull `*variants.images` (every variant's
 * full image array), `+variants.metadata` and `+tags` for EVERY product in
 * a 12-24 card grid — none of which a card renders. That bloated both the
 * backend query and the RSC/HTML payload of every listing page.
 *
 * This set keeps exactly what the card pipeline + in-memory refinements
 * need:
 *  - card UI: id, handle, title, thumbnail, created_at (isNew), images
 *    (secondary hover image), variants.calculated_price (price),
 *    variants.id (defaultVariantId)
 *  - paths: categories (brand/category URL building)
 *  - badges/specs filters: metadata (brand, is_new, specs)
 *  - inStock refinement: variants.inventory_quantity + manage_inventory
 *
 * Pass via queryParams.fields — listProducts spreads queryParams AFTER its
 * default fields, so this overrides it per-call without touching PDP/full
 * fetches.
 */
export const PRODUCT_CARD_FIELDS =
  "id,handle,title,thumbnail,created_at,*images,*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+metadata,*categories"
