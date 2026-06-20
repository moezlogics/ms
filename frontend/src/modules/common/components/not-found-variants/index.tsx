"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

/**
 * Creative 404 — randomly picks one of several illustrated layouts on
 * every fresh navigation so the page never feels boring or templated.
 *
 * All variants share these contracts:
 *   • Pure CSS / SVG art (no images) — fast, scales, theme-aware.
 *   • Mobile-first (centred column on small, two-column where it fits).
 *   • Two CTAs: home + shop (so the visitor never dead-ends).
 *   • Use theme tokens (`primary`, `accent`, `bg`, `surface`, `ink`) so a
 *     dark or branded palette inherits automatically.
 *
 * Why client component?
 *   We pick the variant index from `Math.random()` on mount so each
 *   visit shows a different design. Doing this on the server with React
 *   Server Components would either force `dynamic = "force-dynamic"`
 *   (no caching) or shred the entire page from the static cache.
 *   Picking on the client keeps the route statically rendered, then
 *   swaps in the chosen variant after hydration — cheap and correct.
 */

const TOTAL_VARIANTS = 8

export default function NotFoundVariants() {
  const [variant, setVariant] = useState<number | null>(null)

  useEffect(() => {
    setVariant(Math.floor(Math.random() * TOTAL_VARIANTS))
  }, [])

  // Render a neutral skeleton on the server (and during the brief
  // pre-hydration moment) so SSR HTML stays stable. Layout shift is
  // tiny because every variant uses roughly the same height.
  if (variant === null) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4">
        <div className="w-full max-w-3xl animate-pulse">
          <div className="h-10 w-48 mx-auto bg-surface rounded" />
          <div className="h-3 w-72 mx-auto mt-6 bg-surface rounded" />
          <div className="h-3 w-56 mx-auto mt-2 bg-surface rounded" />
        </div>
      </div>
    )
  }

  const Variant = VARIANTS[variant % VARIANTS.length]
  return <Variant />
}

/* ─────────────────────────────────────────── */
/* Shared CTA pair — every variant uses these. */
/* ─────────────────────────────────────────── */

function Ctas({
  primaryClass = "bg-primary text-primary-fg hover:bg-primary/90",
  secondaryClass = "border border-line text-ink hover:bg-surface",
  align = "justify-center",
}: {
  primaryClass?: string
  secondaryClass?: string
  align?: string
}) {
  return (
    <div className={`mt-8 flex flex-wrap gap-3 ${align}`}>
      <Link
        href="/"
        className={`inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 ${primaryClass}`}
      >
        <i className="ph-bold ph-house text-base" aria-hidden />
        Back to home
      </Link>
      <Link
        href="/store"
        className={`inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 ${secondaryClass}`}
      >
        Continue shopping
        <i className="ph-bold ph-arrow-right text-base" aria-hidden />
      </Link>
    </div>
  )
}

/* ─────────────────────── */
/* Variant 1 — "Lost cart" */
/* ─────────────────────── */
function LostCart() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-bg">
      <div className="max-w-2xl text-center">
        <svg
          viewBox="0 0 200 160"
          className="w-44 mx-auto"
          aria-hidden
        >
          {/* wonky cart */}
          <g transform="rotate(-8 100 90)" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
            <path d="M30 50 H50 L66 110 H140" />
            <path d="M58 80 H150 L160 50 H56" />
            <circle cx="78" cy="130" r="8" />
            <circle cx="130" cy="130" r="8" />
          </g>
          {/* trail of crumbs */}
          <g className="text-primary" fill="currentColor">
            <circle cx="170" cy="100" r="3" />
            <circle cx="180" cy="115" r="2" />
            <circle cx="188" cy="130" r="1.5" />
          </g>
        </svg>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-ink/60">
          Error · 404
        </p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold text-ink">
          Looks like the cart rolled away.
        </h1>
        <p className="mt-4 text-base text-ink/60 max-w-md mx-auto">
          We couldn't find what you were looking for — probably wandered off to
          a sale somewhere. Let's get you back on track.
        </p>
        <Ctas />
      </div>
    </div>
  )
}

/* ─────────────────── */
/* Variant 2 — Glitchy */
/* ─────────────────── */
function Glitchy() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-ink text-bg overflow-hidden relative">
      {/* scanlines */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, currentColor 3px, currentColor 4px)",
        }}
      />
      <div className="relative max-w-2xl text-center">
        <span className="font-mono text-[12vw] md:text-[160px] font-bold leading-none tracking-tighter relative inline-block">
          <span className="absolute inset-0 text-primary -translate-x-1 translate-y-0.5 opacity-80 mix-blend-screen">
            404
          </span>
          <span className="absolute inset-0 text-accent translate-x-1 -translate-y-0.5 opacity-80 mix-blend-screen">
            404
          </span>
          <span className="relative">404</span>
        </span>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-bg/60">
          ❯ signal_lost: page_not_found
        </p>
        <h1 className="mt-2 font-mono text-2xl md:text-3xl text-bg">
          The page glitched out of existence.
        </h1>
        <p className="mt-4 text-sm text-bg/60 max-w-md mx-auto">
          Try the home button, the store, or just refresh and pretend nothing
          happened.
        </p>
        <Ctas
          primaryClass="bg-primary text-primary-fg hover:bg-primary/90"
          secondaryClass="border border-bg/30 text-bg hover:bg-bg/10"
        />
      </div>
    </div>
  )
}

/* ────────────────────────── */
/* Variant 3 — Floating boxes */
/* ────────────────────────── */
function FloatingBoxes() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-bg overflow-hidden relative">
      {/* floating decorative boxes */}
      <span aria-hidden className="absolute top-[18%] left-[12%] w-12 h-12 bg-primary/15 rounded-2xl rotate-12 animate-[float_6s_ease-in-out_infinite]" />
      <span aria-hidden className="absolute top-[30%] right-[15%] w-16 h-16 bg-accent/40 rounded-full animate-[float_8s_ease-in-out_infinite_-2s]" />
      <span aria-hidden className="absolute bottom-[20%] left-[20%] w-10 h-10 bg-ink/10 rounded-lg -rotate-6 animate-[float_7s_ease-in-out_infinite_-4s]" />
      <span aria-hidden className="absolute bottom-[26%] right-[22%] w-14 h-14 border-2 border-primary/40 rounded-3xl rotate-45 animate-[float_9s_ease-in-out_infinite_-1s]" />

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
          50%      { transform: translateY(-22px) rotate(var(--r, 0deg)); }
        }
      `}</style>

      <div className="max-w-2xl text-center relative z-[1]">
        <span className="inline-block text-[100px] md:text-[140px] font-black leading-none bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent">
          4 · 0 · 4
        </span>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-ink">
          You drifted off the map.
        </h1>
        <p className="mt-4 text-base text-ink/60 max-w-md mx-auto">
          The link you followed is broken or the page may have moved. Let's get
          you somewhere useful.
        </p>
        <Ctas />
      </div>
    </div>
  )
}

/* ──────────────────────────── */
/* Variant 4 — Receipt / ticket */
/* ──────────────────────────── */
function Receipt() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-surface">
      <div className="max-w-md w-full bg-bg rounded-2xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] overflow-hidden font-mono">
        {/* zigzag top edge */}
        <div
          aria-hidden
          className="h-3 bg-bg"
          style={{
            backgroundImage:
              "linear-gradient(45deg, transparent 33.33%, rgb(var(--color-bg)) 33.33%, rgb(var(--color-bg)) 66.66%, transparent 66.66%), linear-gradient(-45deg, transparent 33.33%, rgb(var(--color-bg)) 33.33%, rgb(var(--color-bg)) 66.66%, transparent 66.66%)",
            backgroundSize: "16px 12px",
            backgroundPosition: "0 0",
            backgroundColor: "rgb(var(--color-surface))",
          }}
        />
        <div className="px-7 py-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-ink/50">
              Order receipt
            </p>
            <p className="mt-1 text-2xl font-bold text-ink">#404 NOT FOUND</p>
          </div>
          <div className="mt-6 border-t border-dashed border-line pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink/60">Page requested</span>
              <span className="text-ink">missing.html</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Status</span>
              <span className="text-rose-600">DECLINED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Reason</span>
              <span className="text-ink">does not exist</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Issued by</span>
              <span className="text-ink">your browser</span>
            </div>
          </div>
          <div className="mt-6 border-t border-dashed border-line pt-4 text-center">
            <p className="text-xs text-ink/50 leading-relaxed">
              Don't worry — we won't charge you for a 404. Try the buttons
              below to get a refund of your time.
            </p>
          </div>
          <Ctas align="justify-center" />
        </div>
        {/* zigzag bottom edge */}
        <div
          aria-hidden
          className="h-3"
          style={{
            backgroundImage:
              "linear-gradient(45deg, rgb(var(--color-bg)) 33.33%, transparent 33.33%, transparent 66.66%, rgb(var(--color-bg)) 66.66%), linear-gradient(-45deg, rgb(var(--color-bg)) 33.33%, transparent 33.33%, transparent 66.66%, rgb(var(--color-bg)) 66.66%)",
            backgroundSize: "16px 12px",
            backgroundColor: "rgb(var(--color-surface))",
          }}
        />
      </div>
    </div>
  )
}

/* ────────────────────────── */
/* Variant 5 — Cute astronaut */
/* ────────────────────────── */
function Astronaut() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-gradient-to-br from-bg via-surface to-bg overflow-hidden relative">
      {/* twinkling stars */}
      {[
        [12, 18], [20, 80], [85, 22], [70, 70], [40, 12], [58, 88],
      ].map(([x, y], i) => (
        <span
          key={i}
          aria-hidden
          className="absolute w-1 h-1 rounded-full bg-ink/40 animate-pulse"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.4}s` }}
        />
      ))}

      <div className="relative max-w-xl text-center">
        <svg viewBox="0 0 200 200" className="w-40 mx-auto" aria-hidden>
          {/* helmet */}
          <circle cx="100" cy="90" r="55" fill="rgb(var(--color-surface))" stroke="rgb(var(--color-ink))" strokeWidth="3" />
          {/* visor */}
          <ellipse cx="100" cy="85" rx="38" ry="32" fill="rgb(var(--color-primary))" />
          <ellipse cx="86" cy="76" rx="6" ry="9" fill="rgb(var(--color-bg))" opacity="0.5" />
          {/* body */}
          <rect x="70" y="135" width="60" height="50" rx="14" fill="rgb(var(--color-surface))" stroke="rgb(var(--color-ink))" strokeWidth="3" />
          {/* arm waving */}
          <g transform="rotate(-25 60 145)">
            <rect x="42" y="135" width="20" height="36" rx="8" fill="rgb(var(--color-surface))" stroke="rgb(var(--color-ink))" strokeWidth="3" />
            <circle cx="52" cy="132" r="8" fill="rgb(var(--color-accent))" stroke="rgb(var(--color-ink))" strokeWidth="3" />
          </g>
          {/* badge */}
          <circle cx="100" cy="160" r="8" fill="rgb(var(--color-accent))" />
        </svg>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-ink/60">
          Houston · 404
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-ink">
          We've drifted into uncharted space.
        </h1>
        <p className="mt-4 text-base text-ink/60 max-w-md mx-auto">
          This URL doesn't orbit any of our planets. Beam back to home base
          and we'll start the mission over.
        </p>
        <Ctas />
      </div>
    </div>
  )
}

/* ────────────────── */
/* Variant 6 — Vinyl  */
/* ────────────────── */
function Vinyl() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-bg">
      <div className="max-w-3xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="relative aspect-square mx-auto w-full max-w-xs">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,0.4)] animate-[spin_8s_linear_infinite]"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0 2px, transparent 2px 6px)",
            }}
          />
          <span aria-hidden className="absolute inset-[28%] rounded-full bg-primary" />
          <span aria-hidden className="absolute inset-[44%] rounded-full bg-bg" />
          <span aria-hidden className="absolute inset-[48%] rounded-full bg-ink" />
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink/60">
            Side B · Track 404
          </p>
          <h1 className="mt-2 text-4xl md:text-5xl font-semibold text-ink">
            Hmm, the record skipped.
          </h1>
          <p className="mt-4 text-base text-ink/60 max-w-md mx-auto md:mx-0">
            That groove leads to nowhere. Lift the needle and pick a fresh
            track from our shelves.
          </p>
          <Ctas align="justify-center md:justify-start" />
        </div>
      </div>
    </div>
  )
}

/* ───────────────────── */
/* Variant 7 — Tape glitch */
/* ───────────────────── */
function TapeGlitch() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-bg">
      <div className="max-w-2xl w-full">
        <div className="border-2 border-ink/15 rounded-3xl p-8 md:p-12 bg-surface relative overflow-hidden">
          {/* corner tape */}
          {[
            "top-3 left-3 -rotate-12",
            "top-3 right-3 rotate-12",
            "bottom-3 left-3 -rotate-6",
            "bottom-3 right-3 rotate-6",
          ].map((pos, i) => (
            <span
              key={i}
              aria-hidden
              className={`absolute ${pos} w-16 h-6 bg-accent/60`}
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}
            />
          ))}
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink/60 text-center">
            Lost & found · #404
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold text-ink text-center">
            This page packed up and left.
          </h1>
          <p className="mt-5 text-base text-ink/60 max-w-md mx-auto text-center">
            Maybe it was renamed. Maybe it was never here. Maybe it's at the
            bottom of a moving box. Whatever — let's get you somewhere live.
          </p>
          <Ctas />
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────── */
/* Variant 8 — Search again */
/* ──────────────────────── */
function SearchAgain() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12 bg-bg">
      <div className="max-w-xl text-center w-full">
        <div className="mx-auto w-32 h-32 rounded-full bg-surface flex items-center justify-center relative">
          <i className="ph-bold ph-magnifying-glass text-[64px] text-ink/40" aria-hidden />
          <span aria-hidden className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-rose-500 text-white text-base font-bold flex items-center justify-center shadow-md">
            !
          </span>
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-ink/60">
          Result · 404
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-ink">
          Nothing matches that address.
        </h1>
        <p className="mt-4 text-base text-ink/60 max-w-md mx-auto">
          Double-check the URL, or just dive into the catalog — there's plenty
          to find.
        </p>
        <form
          action="/search"
          method="get"
          className="mt-6 flex items-center gap-2 max-w-sm mx-auto"
          role="search"
        >
          <input
            type="search"
            name="q"
            placeholder="Try a search instead…"
            className="flex-1 h-11 px-4 rounded-full border border-line bg-bg text-sm text-ink placeholder:text-ink/40 outline-none focus:border-primary"
            aria-label="Search"
          />
          <button
            type="submit"
            className="h-11 px-5 rounded-full bg-primary text-primary-fg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>
        <Ctas />
      </div>
    </div>
  )
}

const VARIANTS = [
  LostCart,
  Glitchy,
  FloatingBoxes,
  Receipt,
  Astronaut,
  Vinyl,
  TapeGlitch,
  SearchAgain,
]
