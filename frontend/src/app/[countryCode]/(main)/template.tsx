/**
 * Page route entrance transition.
 *
 * IMPORTANT: opacity-ONLY fade — no `transform`/`filter`/`will-change`.
 * An earlier version animated `transform: translateY` here, but a
 * transform on this wrapper makes it the containing block for EVERY
 * `position: fixed` descendant, which broke the mobile sticky add-to-cart
 * bar (it dropped into normal flow at the bottom) and could glitch the
 * `fill` product images on low-end devices. Opacity does NOT create a
 * containing block for fixed elements, so the sticky bar works while we
 * keep a smooth entrance fade. It's also CSS-only (no JS state) so the
 * SSR'd content is never hidden waiting for hydration.
 */
export default function RouteTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ animation: "routeFadeIn 160ms ease-out both" }}>
      <style>{`@keyframes routeFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      {children}
    </div>
  )
}
