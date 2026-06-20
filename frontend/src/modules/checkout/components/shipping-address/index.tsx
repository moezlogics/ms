"use client"

import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import { getGuestId } from "@lib/util/guest"

const ShippingAddress = ({
  customer,
  cart,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
}) => {
  // Prior coordinates persisted in cart metadata (if the shopper came back).
  const existingMeta = (cart?.metadata || {}) as Record<string, any>
  const existingLat =
    typeof existingMeta.map_lat === "number"
      ? existingMeta.map_lat
      : existingMeta.map_lat
      ? parseFloat(String(existingMeta.map_lat))
      : undefined
  const existingLng =
    typeof existingMeta.map_lng === "number"
      ? existingMeta.map_lng
      : existingMeta.map_lng
      ? parseFloat(String(existingMeta.map_lng))
      : undefined

  const [coords, setCoords] = useState<{ lat?: number; lng?: number; display_name?: string }>({
    lat: existingLat,
    lng: existingLng,
    display_name: existingMeta.map_address,
  })

  const [pushEndpoint, setPushEndpoint] = useState<string>("")
  const [guestId, setGuestId] = useState<string>("")

  useEffect(() => {
    try {
      const ep = localStorage.getItem("push:endpoint") || ""
      setPushEndpoint(ep)
    } catch {}
    // Stamp the guest id so the order is owned at creation (guest accounts).
    try {
      setGuestId(getGuestId())
    } catch {}
  }, [])

  // Build full name from first + last or customer data
  const initialFullName = (() => {
    const first = cart?.shipping_address?.first_name || customer?.first_name || ""
    const last = cart?.shipping_address?.last_name || customer?.last_name || ""
    return `${first} ${last}`.trim()
  })()

  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.full_name": initialFullName,
    "shipping_address.first_name": cart?.shipping_address?.first_name || customer?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || customer?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || customer?.email || "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => {
        const fullName = `${address?.first_name || ""} ${address?.last_name || ""}`.trim()
        return {
          ...prevState,
          "shipping_address.full_name": fullName,
          "shipping_address.first_name": address?.first_name || "",
          "shipping_address.last_name": address?.last_name || "",
          "shipping_address.address_1": address?.address_1 || "",
          "shipping_address.company": address?.company || "",
          "shipping_address.postal_code": address?.postal_code || "",
          "shipping_address.city": address?.city || "",
          "shipping_address.country_code": address?.country_code || "",
          "shipping_address.province": address?.province || "",
          "shipping_address.phone": address?.phone || "",
        }
      })

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  // Silent Geolocation Trigger on Mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCoords({
            lat,
            lng,
            display_name: "Browser Geolocation",
          })
          
          // Optionally reverse geocode silently to fill in default address details
          fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=en`)
            .then((res) => {
              if (res.ok) return res.json()
            })
            .then((r) => {
              if (r) {
                const address = r.address || {}
                const road = address.road || address.suburb || ""
                const city = address.city || address.town || address.village || ""
                const province = address.state || ""
                const postcode = address.postcode || ""
                
                setFormData((prev) => ({
                  ...prev,
                  "shipping_address.address_1": prev["shipping_address.address_1"] || road || r.display_name || "",
                  "shipping_address.city": prev["shipping_address.city"] || city || "",
                  "shipping_address.province": prev["shipping_address.province"] || province || "",
                  "shipping_address.postal_code": prev["shipping_address.postal_code"] || postcode || "",
                }))
                
                setCoords({
                  lat,
                  lng,
                  display_name: r.display_name || "Browser Geolocation",
                })
              }
            })
            .catch(() => {})
        },
        (error) => {
          console.log("Silent geolocation error/denied:", error)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  useEffect(() => {
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart])

  // Handle full name change — split into first/last for API compatibility
  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fullName = e.target.value
    const parts = fullName.trim().split(/\s+/)
    const firstName = parts[0] || ""
    const lastName = parts.slice(1).join(" ") || ""
    
    setFormData({
      ...formData,
      "shipping_address.full_name": fullName,
      "shipping_address.first_name": firstName,
      "shipping_address.last_name": lastName,
    })
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-4 flex flex-col gap-y-3 p-3">
          <p className="text-xs text-ink/60">
            Use a saved address?
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-ink">Delivery address</span>
      </div>

      {/* Hidden fields carried by the form action */}
      <input type="hidden" name="map_lat" value={coords.lat !== undefined ? String(coords.lat) : ""} />
      <input type="hidden" name="map_lng" value={coords.lng !== undefined ? String(coords.lng) : ""} />
      <input type="hidden" name="map_address" value={coords.display_name || ""} />
      <input type="hidden" name="map_source" value={coords.lat !== undefined ? "map" : "form"} />
      <input type="hidden" name="same_as_billing" value="on" />
      <input type="hidden" name="push_endpoint" value={pushEndpoint} />
      <input type="hidden" name="guest_id" value={guestId} />
      
      {/* Hidden first/last name fields for API compatibility */}
      <input type="hidden" name="shipping_address.first_name" value={formData["shipping_address.first_name"]} />
      <input type="hidden" name="shipping_address.last_name" value={formData["shipping_address.last_name"]} />
      <input type="hidden" name="shipping_address.company" value="" />

      <div className="grid grid-cols-2 gap-3">
        {/* Full Name — single field instead of first/last */}
        <div className="col-span-2">
          <Input
            label="Full Name"
            name="shipping_address.full_name_display"
            autoComplete="name"
            value={formData["shipping_address.full_name"]}
            onChange={handleFullNameChange}
            required
            data-testid="shipping-full-name-input"
          />
        </div>
        <Input
          label="Email"
          name="email"
          type="email"
          title="Enter a valid email address."
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        <Input
          label="Phone"
          name="shipping_address.phone"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          required
          data-testid="shipping-phone-input"
        />
        <div className="col-span-2">
          <Input
            label="Address"
            name="shipping_address.address_1"
            autoComplete="address-line1"
            value={formData["shipping_address.address_1"]}
            onChange={handleChange}
            required
            data-testid="shipping-address-input"
          />
        </div>
        <Input
          label="City"
          name="shipping_address.city"
          autoComplete="address-level2"
          value={formData["shipping_address.city"]}
          onChange={handleChange}
          required
          data-testid="shipping-city-input"
        />
        <CountrySelect
          name="shipping_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["shipping_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-country-select"
        />
        <div className="col-span-2">
          <Input
            label="State / Province"
            name="shipping_address.province"
            autoComplete="address-level1"
            onChange={handleChange}
          />
        </div>
      </div>
    </>
  )
}

export default ShippingAddress
