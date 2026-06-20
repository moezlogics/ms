import { listCollections } from "@lib/data/collections"
import CollectionGallery, { CollectionGalleryItem } from "./index"

/**
 * Server wrapper: fetches all collections and filters to only those
 * that have a `metadata.featured_image` set by the admin. Maps them
 * into the gallery shape.
 */
export default async function CollectionGalleryServer() {
  let items: CollectionGalleryItem[] = []
  try {
    const { collections } = await listCollections()
    items = (collections || [])
      .filter((c: any) => {
        const img = c.metadata?.featured_image
        return typeof img === "string" && img.length > 0
      })
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        handle: c.handle,
        image: c.metadata.featured_image as string,
        // Optional short description surfaced below the title on
        // hero / wide tiles. Admins set this via the collection's
        // `metadata.tagline` field — safely omitted when missing.
        tagline:
          typeof c.metadata?.tagline === "string" && c.metadata.tagline
            ? (c.metadata.tagline as string)
            : null,
      }))
  } catch (e) {
    console.error("[collection-gallery] failed to load collections", e)
  }

  if (!items.length) return null
  return <CollectionGallery items={items} />
}
