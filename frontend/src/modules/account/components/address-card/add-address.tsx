"use client"

import { Button, Heading } from "@medusajs/ui"
import { useEffect, useState, useActionState } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import CountrySelect from "@modules/checkout/components/country-select"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { HttpTypes } from "@medusajs/types"
import { addCustomerAddress } from "@lib/data/customer"

/**
 * "Add address" card + modal.
 *
 * Mirrors the checkout simplification: only the fields that are
 * actually delivery-relevant in our market (PK) are kept —
 *   first_name · last_name · address_1 · city · province · phone · country
 * Dropped: `company`, `address_2`, `postal_code`. The Medusa data
 * model still carries these columns; we just stop asking the user
 * for them. Submitting an empty value is a no-op on the backend
 * because the action handler reads `formData.get(...)` which returns
 * empty string for missing inputs.
 *
 * The trigger card has also been redesigned — the previous version
 * was a plain bordered tile with a tiny `+` icon. New version is a
 * dashed-border drop zone with a soft hover lift + clear "Add address"
 * label, so it visibly belongs next to the saved-address tiles.
 */
const AddAddress = ({
  region,
  addresses,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  // Single-address mode: every newly-saved address acts as both the
  // default billing AND default shipping target. Without this flag
  // the checkout flow can't confidently auto-pick the address and the
  // setup wizard's "address already saved" check fails.
  const [formState, formAction] = useActionState(addCustomerAddress, {
    isDefaultBilling: true,
    isDefaultShipping: true,
    success: false,
    error: null,
  })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  return (
    <>
      <button
        type="button"
        onClick={open}
        data-testid="add-address-button"
        className="group min-h-[220px] h-full w-full rounded-2xl border-2 border-dashed border-line bg-surface/40 p-5 flex flex-col items-center justify-center gap-3 text-ink/60 hover:border-ink hover:text-ink hover:bg-bg transition-all hover:-translate-y-0.5"
      >
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bg border border-line text-ink/70 group-hover:bg-ink group-hover:text-bg group-hover:border-ink transition-colors">
          <i className="ph-bold ph-map-pin text-lg" aria-hidden />
        </span>
        <span className="text-sm font-semibold">Add your delivery address</span>
        <span className="text-[11px] text-ink/45">Used for both shipping and billing</span>
      </button>

      <Modal isOpen={state} close={close} data-testid="add-address-modal">
        <Modal.Title>
          <Heading className="mb-2">Add address</Heading>
        </Modal.Title>
        <form action={formAction}>
          <Modal.Body>
            <div className="flex flex-col gap-y-3">
              <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                <Input
                  label="First name"
                  name="first_name"
                  required
                  autoComplete="given-name"
                  data-testid="first-name-input"
                />
                <Input
                  label="Last name"
                  name="last_name"
                  required
                  autoComplete="family-name"
                  data-testid="last-name-input"
                />
              </div>
              <Input
                label="Street address"
                name="address_1"
                required
                autoComplete="address-line1"
                data-testid="address-1-input"
              />
              <Input
                label="City"
                name="city"
                required
                autoComplete="locality"
                data-testid="city-input"
              />
              <Input
                label="Province / State"
                name="province"
                autoComplete="address-level1"
                data-testid="state-input"
              />
              <CountrySelect
                region={region}
                name="country_code"
                required
                autoComplete="country"
                data-testid="country-select"
              />
              <Input
                label="Phone"
                name="phone"
                autoComplete="tel"
                data-testid="phone-input"
              />
            </div>
            {formState.error && (
              <div
                className="text-rose-500 text-sm py-2"
                data-testid="address-error"
              >
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6">
              <Button
                type="reset"
                variant="secondary"
                onClick={close}
                className="h-10"
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <SubmitButton data-testid="save-button">Save address</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default AddAddress
