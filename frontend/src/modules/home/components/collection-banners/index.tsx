import Image from "next/image"
import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type CategoryWithImage = HttpTypes.StoreProductCategory & {
  metadata?: { image?: string } | null
}

/**
 * Anvogue 3-column collection banner grid. Pulls the first 3 top-level
 * categories; displays their metadata.image when present. If the store has
 * no categories yet we render a styled placeholder row instead of nothing.
 */
export default async function CollectionBanners() {
  const categories = (await listCategories().catch(() => [])) as CategoryWithImage[]
  const top = categories.filter((c) => !c.parent_category_id).slice(0, 3)

  if (top.length === 0) return null

  return (
    <section className="py-16 md:py-20">
      <div className="container-anvogue">
        <div className="text-center mb-10">
          <div className="text-sub-display has-line-before">
            Shop by Category
          </div>
          <h2 className="heading3 mt-3">Collections Built for You</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {top.map((c) => {
            const image = c.metadata?.image
            return (
              <LocalizedClientLink
                key={c.id}
                href={`/${c.handle}`}
                className="group relative rounded-2xl overflow-hidden bg-surface aspect-[3/4] block box-shadow-xs hover:box-shadow-sm transition-shadow"
              >
                {image ? (
                  <Image
                    src={image}
                    alt={c.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-linear">
                    <i className="ph ph-image text-6xl text-secondary2" />
                  </div>
                )}
                <div className="absolute inset-x-4 bottom-4 flex justify-center">
                  <div className="w-full max-w-[200px] bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-4 flex flex-col items-center text-center transform transition-transform duration-500 group-hover:-translate-y-2 shadow-lg">
                    <div className="text-[10px] font-semibold text-white/80 uppercase tracking-[0.2em] mb-1">
                      Collection
                    </div>
                    <div className="text-white font-semibold flex items-center justify-center gap-2 w-full">
                      <span className="truncate">{c.name}</span>
                      <i className="ph-bold ph-arrow-right text-sm transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}
