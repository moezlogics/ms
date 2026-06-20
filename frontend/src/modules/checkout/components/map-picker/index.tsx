"use client"

import dynamic from "next/dynamic"

/**
 * MapPicker — SSR-safe wrapper around the Leaflet-based picker. Leaflet
 * reads `window` at import time, so we must disable SSR. The loading
 * skeleton mimics the final map height so the layout doesn't jump.
 */
const MapPicker = dynamic(() => import("./_client"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-large border border-line bg-surface"
      style={{ height: 340 }}
    >
      <div className="flex items-center gap-2 text-ink/60 text-sm">
        <i className="ph ph-map-pin text-[18px]" aria-hidden />
        Loading map…
      </div>
    </div>
  ),
})

export type { ResolvedAddress } from "./_client"

export default MapPicker
