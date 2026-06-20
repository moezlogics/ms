"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { ArrowRightMini } from "@medusajs/icons"
import { clx, useToggleState } from "@medusajs/ui"
import { Fragment } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LanguageSelect from "../language-select"
import { HttpTypes } from "@medusajs/types"
import { Locale } from "@lib/data/locales"

import GoogleSignInButton from "@modules/account/components/google-sign-in-button"

type MenuLink = {
  label: string
  href: string
  icon: string
  testId: string
}

const PRIMARY: MenuLink[] = [
  { label: "Home", href: "/", icon: "house", testId: "home-link" },
  { label: "Shop all", href: "/store", icon: "squares-four", testId: "store-link" },
  { label: "Blog", href: "/blog", icon: "newspaper", testId: "blog-link" },
]

const SECONDARY: MenuLink[] = [
  { label: "My profile", href: "/account/profile", icon: "user-circle", testId: "account-link" },
  { label: "My orders", href: "/account/orders", icon: "package", testId: "orders-link" },

  { label: "Cart", href: "/cart", icon: "handbag", testId: "cart-link" },
]

const HELP: MenuLink[] = [
  { label: "Contact us", href: "/contact", icon: "chat-circle", testId: "contact-link" },
  { label: "About", href: "/about", icon: "info", testId: "about-link" },
  { label: "Returns", href: "/refund-policy", icon: "arrow-u-up-left", testId: "returns-link" },
]

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  customer: HttpTypes.StoreCustomer | null
}

const SideMenu = ({ locales, currentLocale, customer }: SideMenuProps) => {

  const languageToggleState = useToggleState()

  const Section = ({
    label,
    items,
    close,
  }: {
    label?: string
    items: MenuLink[]
    close: () => void
  }) => (
    <div className="flex flex-col">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45 px-4 mt-3 mb-1">
          {label}
        </span>
      )}
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.href}>
            <LocalizedClientLink
              href={item.href}
              onClick={close}
              data-testid={item.testId}
              className="flex items-center gap-3 px-4 py-3 rounded-base text-[15px] text-ink hover:bg-surface transition-colors"
            >
              <span className="w-8 h-8 rounded-base bg-surface flex items-center justify-center group-hover:bg-bg">
                <i className={`ph ph-${item.icon} text-[16px]`} aria-hidden />
              </span>
              <span className="font-medium">{item.label}</span>
              <i
                className="ph ph-caret-right text-[12px] text-ink/30 ml-auto"
                aria-hidden
              />
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  aria-label="Open menu"
                  className="w-12 h-12 -ml-2 flex items-center justify-center rounded-full text-header-fg hover:bg-header-hover hover:text-header-accent focus:outline-none transition-colors"
                >
                  <i className="ph-bold ph-list text-[26px]" aria-hidden />
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-ink/40 backdrop-blur-[2px] transition-opacity"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-300"
                enterFrom="opacity-0 -translate-x-4"
                enterTo="opacity-100 translate-x-0"
                leave="transition ease-in duration-200"
                leaveFrom="opacity-100 translate-x-0"
                leaveTo="opacity-0 -translate-x-4"
              >
                <PopoverPanel className="fixed top-0 left-0 h-[100dvh] w-[88vw] max-w-[360px] z-[51] bg-bg shadow-pop">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center px-4 py-4 border-b border-line">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                          {customer ? "Welcome back" : "Hello there"}
                        </span>
                        <span className="text-base font-semibold text-ink">
                          {customer ? `${customer.first_name} ${customer.last_name || ""}` : "Menu"}
                        </span>
                      </div>
                      <button
                        data-testid="close-menu-button"
                        onClick={close}
                        aria-label="Close menu"
                        className="w-9 h-9 rounded-full bg-surface hover:bg-primary hover:text-primary-fg transition-colors flex items-center justify-center"
                      >
                        <i className="ph-bold ph-x text-sm" aria-hidden />
                      </button>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto py-3">
                      <Section items={PRIMARY} close={close} />

                      <div className="my-3 border-t border-line" />

                      {customer ? (
                        <Section
                          label="My account"
                          items={SECONDARY}
                          close={close}
                        />
                      ) : (
                        <div className="px-4 py-4 flex flex-col gap-4">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                            Join us
                          </span>
                          <GoogleSignInButton label="Sign in with Google" />
                          <LocalizedClientLink
                            href="/account"
                            onClick={close}
                            className="text-center text-sm font-medium text-ink/60 hover:text-primary underline"
                          >
                            or use email/password
                          </LocalizedClientLink>
                        </div>
                      )}

                      <div className="my-3 border-t border-line" />

                      <Section label="Help" items={HELP} close={close} />
                    </div>


                    {/* Footer (locale switcher) */}
                    {!!locales?.length && (
                      <div className="border-t border-line p-4">
                        <div
                          className="flex justify-between items-center"
                          onMouseEnter={languageToggleState.open}
                          onMouseLeave={languageToggleState.close}
                        >
                          <LanguageSelect
                            toggleState={languageToggleState}
                            locales={locales}
                            currentLocale={currentLocale}
                          />
                          <ArrowRightMini
                            className={clx(
                              "transition-transform duration-150 text-ink/50",
                              languageToggleState.state ? "-rotate-90" : ""
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
