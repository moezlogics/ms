"use client"

import React, { useEffect, useState, useActionState } from "react"
import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"

import useToggleState from "@lib/hooks/use-toggle-state"
import CountrySelect from "@modules/checkout/components/country-select"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import Spinner from "@modules/common/icons/spinner"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { HttpTypes } from "@medusajs/types"
import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
}) => {
  const [removing, setRemoving] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
    addressId: address.id,
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

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  return (
    <>
      <div
        className={clx(
          "rounded-2xl border bg-bg p-5 min-h-[220px] h-full w-full flex flex-col justify-between transition-all",
          isActive
            ? "border-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
            : "border-line hover:border-ink/40"
        )}
        data-testid="address-container"
      >
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <Heading
              className="text-left text-base font-semibold text-ink"
              data-testid="address-name"
            >
              {address.first_name} {address.last_name}
            </Heading>
            {isActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-ink text-bg px-2 py-0.5 rounded-full">
                Default
              </span>
            )}
          </div>
          <Text className="flex flex-col text-left text-sm text-ink/70 mt-2 leading-relaxed">
            <span data-testid="address-address">{address.address_1}</span>
            <span data-testid="address-city">
              {address.city}
              {address.province ? `, ${address.province}` : ""}
            </span>
            <span data-testid="address-country">
              {address.country_code?.toUpperCase()}
            </span>
            {address.phone && (
              <span className="text-ink/55 mt-1 inline-flex items-center gap-1.5">
                <i className="ph ph-phone text-[12px]" aria-hidden />
                {address.phone}
              </span>
            )}
          </Text>
        </div>
        {/*
          Single-address mode: the only affordance is "Edit". Removal
          is intentionally hidden — a customer always has exactly one
          address (or none, in which case the AddAddress card shows
          instead). If you need to wipe the address, use the edit form
          to overwrite it. The Trash + removeAddress wiring is left in
          place so re-enabling delete is a one-line revert.
        */}
        <div className="flex items-center gap-3 mt-4">
          <button
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-ink transition-colors"
            onClick={open}
            data-testid="address-edit-button"
          >
            <Edit className="text-base" />
            Edit address
          </button>
          {removing && <Spinner />}
        </div>
      </div>

      <Modal isOpen={state} close={close} data-testid="edit-address-modal">
        <Modal.Title>
          <Heading className="mb-2">Edit address</Heading>
        </Modal.Title>
        <form action={formAction}>
          <input type="hidden" name="addressId" value={address.id} />
          <Modal.Body>
            <div className="grid grid-cols-1 gap-y-3">
              <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                <Input
                  label="First name"
                  name="first_name"
                  required
                  autoComplete="given-name"
                  defaultValue={address.first_name || undefined}
                  data-testid="first-name-input"
                />
                <Input
                  label="Last name"
                  name="last_name"
                  required
                  autoComplete="family-name"
                  defaultValue={address.last_name || undefined}
                  data-testid="last-name-input"
                />
              </div>
              <Input
                label="Street address"
                name="address_1"
                required
                autoComplete="address-line1"
                defaultValue={address.address_1 || undefined}
                data-testid="address-1-input"
              />
              <Input
                label="City"
                name="city"
                required
                autoComplete="locality"
                defaultValue={address.city || undefined}
                data-testid="city-input"
              />
              <Input
                label="Province / State"
                name="province"
                autoComplete="address-level1"
                defaultValue={address.province || undefined}
                data-testid="state-input"
              />
              <CountrySelect
                name="country_code"
                region={region}
                required
                autoComplete="country"
                defaultValue={address.country_code || undefined}
                data-testid="country-select"
              />
              <Input
                label="Phone"
                name="phone"
                autoComplete="tel"
                defaultValue={address.phone || undefined}
                data-testid="phone-input"
              />
            </div>
            {formState.error && (
              <div className="text-rose-500 text-sm py-2">
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
              <SubmitButton data-testid="save-button">Save</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default EditAddress
