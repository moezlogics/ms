import repeat from "@lib/util/repeat"
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview"

const SkeletonRelatedProducts = () => {
  return (
    <div className="product-page-constraint">
      <div className="flex flex-col gap-8 items-center text-center mb-8">
        <div className="w-20 h-6 animate-pulse bg-gray-100"></div>
        <div className="flex flex-col gap-4 items-center text-center mb-16">
          <div className="w-96 h-10 animate-pulse bg-gray-100"></div>
          <div className="w-48 h-10 animate-pulse bg-gray-100"></div>
        </div>
      </div>
      <ul className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-6 large:grid-cols-8 gap-x-2 small:gap-x-3 gap-y-3 small:gap-y-6 flex-1">
        {repeat(6).map((index) => (
          <li key={index}>
            <SkeletonProductPreview />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SkeletonRelatedProducts
