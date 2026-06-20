import React from "react"

import AddAddress from "../address-card/add-address"
import EditAddress from "../address-card/edit-address-modal"
import { HttpTypes } from "@medusajs/types"

type AddressBookProps = {
  customer: HttpTypes.StoreCustomer
  region: HttpTypes.StoreRegion
}

/**
 * Single-address mode (May 2026).
 *
 * The store now ships with a "one address per customer" experience:
 * a single saved address acts as both the default billing AND default
 * shipping target. Rationale —
 *   • The shopper base is hyper-local; multiple addresses caused more
 *     confusion than convenience.
 *   • Checkout no longer has to disambiguate between billing/shipping.
 *   • The setup wizard already collects exactly one address with both
 *     defaults flipped on.
 *
 * UI consequence: instead of the old grid of cards + "Add another"
 * tile, we render a single card. If a default address already exists
 * we show the editable card on its own; otherwise we show the
 * placeholder/add-card on its own. The legacy add/edit/delete
 * components still work because they post to the same Medusa actions
 * — we just hide the affordances we don't want to surface.
 */
const AddressBook: React.FC<AddressBookProps> = ({ customer, region }) => {
  const addresses = customer.addresses || []
  // Prefer the explicit default-billing record; fall back to the
  // first address (e.g. legacy customers from the multi-address era).
  const primary =
    addresses.find((a: any) => a.is_default_billing) || addresses[0] || null

  return (
    <div className="w-full">
      <div className="mt-4 max-w-xl">
        {primary ? (
          <EditAddress region={region} address={primary} isActive />
        ) : (
          <AddAddress region={region} addresses={addresses} />
        )}
      </div>
      {primary && (
        <p className="mt-3 text-[11px] text-ink/55 max-w-xl flex items-start gap-1.5">
          <i
            className="ph-fill ph-info text-[13px] text-ink/40 mt-0.5"
            aria-hidden
          />
          <span>
            This address is used for both delivery and billing. Edit it any
            time — your changes apply to your next order automatically.
          </span>
        </p>
      )}
    </div>
  )
}

export default AddressBook
