"use client"

import Lightbox from "yet-another-react-lightbox"
import Counter from "yet-another-react-lightbox/plugins/counter"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/counter.css"

/**
 * Review-photo lightbox, split into its own chunk.
 *
 * `yet-another-react-lightbox` (+ Counter + Zoom + 2 CSS files) is ~heavy
 * and was statically imported into ProductReviews, so it shipped in the
 * PDP bundle for every product page even though most visitors never open a
 * review photo. ProductReviews now `next/dynamic`-imports this component
 * and only mounts it when the lightbox actually opens, so the chunk +
 * styles download on first use, not on PDP load.
 */
export default function ReviewLightbox({
  open,
  close,
  index,
  slides,
}: {
  open: boolean
  close: () => void
  index: number
  slides: { src: string }[]
}) {
  return (
    <Lightbox
      open={open}
      close={close}
      index={index}
      slides={slides}
      plugins={[Counter, Zoom]}
      carousel={{ finite: slides.length <= 1 }}
    />
  )
}
