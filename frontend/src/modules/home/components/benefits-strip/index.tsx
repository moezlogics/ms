/**
 * Anvogue "Benefits" strip — icon + headline + subline quartet.
 * Static content, presentational only; safe to render anywhere.
 */
const BENEFITS: Array<{
  icon: string
  title: string
  subtitle: string
}> = [
  {
    icon: "truck",
    title: "Free Shipping",
    subtitle: "On all orders over $50",
  },
  {
    icon: "arrows-counter-clockwise",
    title: "Easy Returns",
    subtitle: "30-day return policy",
  },
  {
    icon: "headset",
    title: "24/7 Support",
    subtitle: "We're here to help",
  },
  {
    icon: "shield-check",
    title: "Secure Checkout",
    subtitle: "SSL encrypted payments",
  },
]

export default function BenefitsStrip() {
  return (
    <section className="py-12 md:py-16 bg-surface">
      <div className="container-anvogue">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center box-shadow-xs">
                <i
                  className={`ph-bold ph-${b.icon} text-2xl text-brand-black`}
                  aria-hidden
                />
              </div>
              <div>
                <div className="text-title">{b.title}</div>
                <div className="caption1 text-secondary">{b.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
