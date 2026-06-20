"use client"

import Lightbox from "yet-another-react-lightbox"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import Counter from "yet-another-react-lightbox/plugins/counter"
import Video from "yet-another-react-lightbox/plugins/video"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"
import "yet-another-react-lightbox/plugins/counter.css"

type LightboxSlide = Record<string, any>

type Props = {
  open: boolean
  close: () => void
  index: number
  slides: LightboxSlide[]
}

/**
 * The fullscreen product lightbox, split into its own module so the heavy
 * `yet-another-react-lightbox` library (+ 4 plugins + CSS) is loaded ONLY
 * when the shopper actually opens it — not in the initial PDP bundle.
 * The gallery dynamic-imports this with `ssr:false`. Behaviour/props are
 * identical to the previous inline `<Lightbox>` usage.
 */
export default function ProductLightbox({ open, close, index, slides }: Props) {
  return (
    <Lightbox
      open={open}
      close={close}
      index={index}
      slides={slides as any}
      plugins={[Thumbnails, Zoom, Counter, Video]}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      zoom={{ maxZoomPixelRatio: 3 }}
      thumbnails={{ position: "bottom", width: 70, height: 70, gap: 6 }}
      video={{ autoPlay: true, controls: true, playsInline: true }}
    />
  )
}
