import React from "react"

/**
 * A lightweight placeholder component for the SmartSearchBar.
 * It matches the exact visual structure, dimensions, and styling of the
 * real search bar on desktop to prevent any layout shift (CLS) when loaded.
 * 
 * Once focused, the caller swaps it with the dynamically loaded SearchBar.
 */
export default function SmartSearchBarPlaceholder({
  onFocus,
}: {
  onFocus?: () => void
}) {
  return (
    <div className="w-full max-w-xl relative">
      <div className="relative w-full">
        {/* Search Icon SVG */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-ui-fg-muted"
            style={{ color: "rgb(112, 112, 112)" }}
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.33333 2.66667C4.75601 2.66667 2.66667 4.75601 2.66667 7.33333C2.66667 9.91066 4.75601 12 7.33333 12C9.91066 12 12 9.91066 12 7.33333C12 4.75601 9.91066 2.66667 7.33333 2.66667ZM1.33333 7.33333C1.33333 4.02029 4.02029 1.33333 7.33333 1.33333C10.6464 1.33333 13.3333 4.02029 13.3333 7.33333C13.3333 8.7997 12.8068 10.143 11.9341 11.1843L14.3748 13.6251C14.6352 13.8854 14.6352 14.3075 14.3748 14.5679C14.1145 14.8282 13.6924 14.8282 13.432 14.5679L10.9995 12.1354C9.95701 12.9463 8.69911 13.3333 7.33333 13.3333C4.02029 13.3333 1.33333 10.6464 1.33333 7.33333Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <input
          type="search"
          onFocus={onFocus}
          className="w-full bg-ui-bg-subtle hover:bg-ui-bg-base border border-ui-border-base rounded-search py-2.5 pl-10 pr-16 text-sm font-medium outline-none transition-all duration-300 shadow-sm"
          placeholder="Search products..."
          readOnly
        />
      </div>
    </div>
  )
}
