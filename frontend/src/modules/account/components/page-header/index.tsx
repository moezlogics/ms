import React from "react"

/**
 * Shared header for /account/* sub-pages.
 *
 * Replaces the legacy `<h1 className="text-2xl-semi">` + flat paragraph
 * pattern that was scattered across orders / profile / addresses / loyalty.
 * Using a single component means visual changes ship in one place and
 * mobile/desktop spacing stays consistent with the new account layout
 * (which already provides its own padding wrapper around `children`).
 */
type Props = {
  /** The page title. Required. */
  title: string
  /** Optional one-line subtitle shown below the title. */
  subtitle?: string
  /**
   * Optional Phosphor icon class (without leading dot), e.g. `ph-package`.
   * When set, an accent-tinted circular icon is rendered to the left of
   * the title, mirroring the chip pattern used on the dashboard overview.
   */
  icon?: string
  /**
   * Optional right-aligned slot for action buttons (e.g. "Add address").
   * Stays on the same row as the title on `>= small`, wraps below on
   * mobile so long titles never clash with the action.
   */
  action?: React.ReactNode
  /** Forwarded to the wrapping `<header>` if a page needs a test hook. */
  "data-testid"?: string
}

export default function AccountPageHeader({
  title,
  subtitle,
  icon,
  action,
  "data-testid": testId,
}: Props) {
  return (
    <header
      data-testid={testId}
      className="mb-5 small:mb-6 flex flex-col small:flex-row small:items-center small:justify-between gap-3"
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span
            aria-hidden
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface text-ink/75 mt-0.5"
          >
            <i className={`ph ${icon} text-lg`} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl small:text-[22px] font-semibold text-ink leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-ink/55 leading-snug max-w-prose">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="shrink-0 flex items-center gap-2">{action}</div>
      )}
    </header>
  )
}
