"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

/**
 * Fix the broken default-marker icon in Leaflet + Webpack/Next: by default
 * Leaflet tries to derive `iconUrl` from its own script path which breaks
 * under bundlers. We replace it with CDN-hosted icons from unpkg.
 */
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  })
}

export type ResolvedAddress = {
  lat: number
  lng: number
  display_name?: string
  address_1?: string
  city?: string
  province?: string
  postal_code?: string
  country_code?: string
}

type Props = {
  initialLat?: number
  initialLng?: number
  initialZoom?: number
  height?: number
  /** Fired whenever the pin moves (dragged or map click). */
  onPick: (resolved: ResolvedAddress) => void
  /** Read-only mode — used on order confirmation page. */
  readOnly?: boolean
}

const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587] // Lahore, Pakistan
const DEFAULT_ZOOM = 13

/** Internal: keeps the map view synced when lat/lng props change externally. */
function RecenterOnChange({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap()
  useEffect(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      map.setView([lat, lng], map.getZoom(), { animate: true })
    }
  }, [lat, lng, map])
  return null
}

/** Internal: listens to map click → re-positions marker. */
function ClickToPlace({
  onPick,
  setLocal,
}: {
  onPick: Props["onPick"]
  setLocal: (coords: [number, number]) => void
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setLocal([lat, lng])
      reverseGeocode(lat, lng).then((resolved) => {
        onPick({ lat, lng, ...resolved })
      })
    },
  })
  return null
}

/**
 * Reverse geocode using Nominatim. Free, no API key, but we should honor
 * their usage policy: max 1 req/sec, set a descriptive User-Agent-ish
 * Accept-Language header. Falls back silently on network errors.
 *
 * Docs: https://nominatim.org/release-docs/develop/api/Reverse/
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<Partial<ResolvedAddress>> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    })
    if (!res.ok) return {}
    const data = await res.json()
    const a = data.address || {}
    // Build an address_1 line as close to a street address as possible.
    const line1 =
      [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(" ") ||
      a.neighbourhood ||
      a.suburb ||
      ""
    return {
      display_name: data.display_name,
      address_1: line1,
      city: a.city || a.town || a.village || a.municipality || a.county || "",
      province: a.state || a.region || "",
      postal_code: a.postcode || "",
      country_code: (a.country_code || "").toUpperCase(),
    }
  } catch {
    return {}
  }
}

/**
 * Forward geocoding by free-text query. Returns the top hit.
 */
export async function forwardGeocode(
  query: string
): Promise<{ lat: number; lng: number; display_name: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      query
    )}&limit=1&addressdetails=1`
    const res = await fetch(url, { headers: { "Accept-Language": "en" } })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || !data.length) return null
    const hit = data[0]
    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      display_name: hit.display_name,
    }
  } catch {
    return null
  }
}

const MapPickerClient = ({
  initialLat,
  initialLng,
  initialZoom = DEFAULT_ZOOM,
  height = 340,
  onPick,
  readOnly = false,
}: Props) => {
  const markerRef = useRef<L.Marker | null>(null)
  const [coords, setCoords] = useState<[number, number]>(
    typeof initialLat === "number" && typeof initialLng === "number"
      ? [initialLat, initialLng]
      : DEFAULT_CENTER
  )
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState("")
  
  // React 18 strict mode unmounts and remounts components. Leaflet crashes if
  // it reuses a DOM node that already has a _leaflet_id.
  // By incrementing this key on unmount, we force React to create a fresh DOM node on remount.
  const [mapKey, setMapKey] = useState(0)

  useEffect(() => {
    return () => {
      setMapKey((k) => k + 1)
    }
  }, [])

  useEffect(() => {
    if (typeof initialLat === "number" && typeof initialLng === "number") {
      setCoords([initialLat, initialLng])
    }
  }, [initialLat, initialLng])

  const onSearch = useCallback(
    async () => {
      if (!query.trim()) return
      setSearching(true)
      const hit = await forwardGeocode(query.trim())
      setSearching(false)
      if (!hit) return
      setCoords([hit.lat, hit.lng])
      const reverse = await reverseGeocode(hit.lat, hit.lng)
      onPick({
        lat: hit.lat,
        lng: hit.lng,
        display_name: hit.display_name,
        ...reverse,
      })
    },
    [query, onPick]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onSearch()
    }
  }

  const useGeolocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords([latitude, longitude])
        const reverse = await reverseGeocode(latitude, longitude)
        onPick({ lat: latitude, lng: longitude, ...reverse })
      },
      () => {
        /* user denied — noop */
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [onPick])

  const onMarkerDragEnd = useCallback(() => {
    const m = markerRef.current
    if (!m) return
    const { lat, lng } = m.getLatLng()
    setCoords([lat, lng])
    reverseGeocode(lat, lng).then((resolved) => {
      onPick({ lat, lng, ...resolved })
    })
  }, [onPick])

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <i
                className="ph ph-magnifying-glass text-[14px] text-ink/50 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search a street, city, or landmark"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-base border border-line bg-bg focus:outline-none focus:border-ink/60"
              />
            </div>
            <button
              type="button"
              onClick={onSearch}
              disabled={searching || !query.trim()}
              className="h-10 px-4 rounded-base bg-ink text-bg text-sm font-medium hover:bg-primary hover:text-primary-fg disabled:opacity-50 transition-colors"
            >
              {searching ? "…" : "Find"}
            </button>
          </div>
          <button
            type="button"
            onClick={useGeolocation}
            className="h-10 px-3 rounded-base border border-line text-sm text-ink hover:bg-surface transition-colors inline-flex items-center gap-1.5"
            aria-label="Use my current location"
            title="Use my current location"
          >
            <i className="ph-bold ph-crosshair text-[14px]" aria-hidden />
            <span className="hidden sm:inline">My location</span>
          </button>
        </div>
      )}

      <div
        className="rounded-large overflow-hidden border border-line bg-surface"
        style={{ height }}
      >
        <MapContainer
          key={mapKey}
          center={coords}
          zoom={initialZoom}
          scrollWheelZoom={!readOnly}
          style={{ height: "100%", width: "100%" }}
          dragging={!readOnly}
          zoomControl={!readOnly}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={coords}
            draggable={!readOnly}
            eventHandlers={{ dragend: onMarkerDragEnd }}
            ref={(r) => {
              markerRef.current = r as L.Marker | null
            }}
          />
          <RecenterOnChange lat={coords[0]} lng={coords[1]} />
          {!readOnly && (
            <ClickToPlace onPick={onPick} setLocal={setCoords} />
          )}
        </MapContainer>
      </div>

      {!readOnly && (
        <p className="text-xs text-ink/55 flex items-start gap-1.5">
          <i className="ph ph-info text-[12px] mt-0.5" aria-hidden />
          <span>
            Click anywhere on the map to drop a pin, or drag the marker to
            your exact location. We’ll auto-fill the address fields from the
            coordinates.
          </span>
        </p>
      )}
    </div>
  )
}

export default MapPickerClient
