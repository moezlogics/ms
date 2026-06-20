import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="py-16 md:py-24 flex flex-col items-center text-center"
      data-testid="empty-cart-message"
    >
      <div className="w-24 h-24 rounded-full bg-surface border border-line/60 flex items-center justify-center mb-6 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.12)]">
        <i className="ph-fill ph-shopping-bag text-5xl text-primary/70" aria-hidden />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-2">
        Your Cart
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-ink tracking-tight mb-3">
        Your cart is empty
      </h1>
      <p className="text-sm text-ink/60 max-w-md mb-8 leading-relaxed">
        Nothing here yet — explore the shop to discover new arrivals and
        seasonal picks.
      </p>
      <LocalizedClientLink
        href="/store"
        className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-primary text-primary-fg text-sm font-semibold tracking-wide shadow-[0_6px_20px_-6px_rgb(var(--color-primary)/0.45)] hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <i className="ph-bold ph-storefront text-[15px]" aria-hidden />
        Browse Shop
        <i className="ph-bold ph-arrow-right text-[13px]" aria-hidden />
      </LocalizedClientLink>
    </div>
  )
}

export default EmptyCartMessage
