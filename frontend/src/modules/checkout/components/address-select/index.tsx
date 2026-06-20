import { Listbox, Transition } from "@headlessui/react"
import { ChevronUpDown } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { Fragment, useMemo } from "react"

import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[]
  addressInput: HttpTypes.StoreCartAddress | null
  onSelect: (
    address: HttpTypes.StoreCartAddress | undefined,
    email?: string
  ) => void
}

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id)
    if (savedAddress) {
      onSelect(savedAddress as HttpTypes.StoreCartAddress)
    }
  }

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => compareAddresses(a, addressInput))
  }, [addresses, addressInput])

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className="relative">
        <Listbox.Button
          className="relative w-full flex justify-between items-center px-4 py-[10px] text-left bg-white cursor-default focus:outline-none border rounded-rounded focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-gray-300 focus-visible:ring-offset-2 focus-visible:border-gray-300 text-base-regular"
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className="block truncate text-sm">
                {selectedAddress
                  ? `${selectedAddress.first_name} ${selectedAddress.last_name} — ${selectedAddress.address_1}, ${selectedAddress.city}`
                  : "Choose a saved address"}
              </span>
              <ChevronUpDown
                className={clx("transition-rotate duration-200 text-neutral-400", {
                  "transform rotate-180": open,
                })}
              />
            </>
          )}
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="absolute z-20 w-full overflow-auto text-small-regular bg-white border border-t-0 rounded-b-md shadow-lg max-h-60 focus:outline-none sm:text-sm mt-1"
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              return (
                <Listbox.Option
                  key={address.id}
                  value={address.id}
                  className="cursor-default select-none relative px-4 py-2.5 hover:bg-neutral-50 border-b last:border-b-0 text-sm"
                  data-testid="shipping-address-option"
                >
                  <div className="flex justify-between items-center gap-x-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-neutral-800 text-xs truncate">
                        {address.first_name} {address.last_name} {address.company && `(${address.company})`}
                      </span>
                      <span className="text-neutral-500 text-[11px] truncate">
                        {address.address_1}, {address.city}, {address.country_code?.toUpperCase()}
                      </span>
                    </div>
                    {selectedAddress?.id === address.id && (
                      <span className="text-emerald-600 font-semibold text-xs flex-shrink-0">✓</span>
                    )}
                  </div>
                </Listbox.Option>
              )
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

export default AddressSelect
