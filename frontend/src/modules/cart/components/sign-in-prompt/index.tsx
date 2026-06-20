import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Shown above the cart items to nudge guest buyers to authenticate —
 * compact, inline design.
 */
const SignInPrompt = () => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface rounded-xl px-4 py-3 border border-line">
      <div className="flex items-center gap-2 min-w-0">
        <i className="ph-bold ph-user-circle text-lg text-primary shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Already have an account?</p>
          <p className="text-xs text-ink/50">Sign in for faster checkout.</p>
        </div>
      </div>
      <LocalizedClientLink
        href="/account?return_to=/cart"
        className="text-xs font-semibold text-primary border border-primary/30 rounded-full px-4 py-1.5 hover:bg-primary/5 transition-colors shrink-0"
        data-testid="sign-in-button"
      >
        Sign in
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
