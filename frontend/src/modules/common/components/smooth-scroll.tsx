"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/**
 * Premium lightweight smooth scrolling component powered by Lenis.
 * Eases scrolling friction and inertial scrolling cleanly.
 * Respects 'prefers-reduced-motion' by bypassing smooth scrolling.
 */
export default function SmoothScroll() {
  useEffect(() => {
    // Skip on prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    // Skip on touch devices entirely. Lenis only smooths WHEEL scrolling
    // (touch is never hijacked), yet its requestAnimationFrame loop runs
    // every frame regardless — on mobile that's pure main-thread/battery
    // cost with zero visual benefit, and it competes with scrolling work
    // on low-end phones.
    if (window.matchMedia("(pointer: coarse)").matches) {
      return
    }

    const lenis = new Lenis({
      duration: 0.15, // Extremely short duration
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.5, // Much lower multiplier
    })

    let rafId: number

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return null
}
