"use client"

import React, { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import SmartSearchBarPlaceholder from "./search-placeholder"

// Dynamically import the heavy search bar component only when needed.
const DynamicSearchBar = dynamic(
  () => import("@modules/search/components/smart-search-bar"),
  { ssr: false }
)

export default function LazySearchBar() {
  const [activated, setActivated] = useState(false)
  const [initialMobileOpen, setInitialMobileOpen] = useState(false)
  const [initialDesktopOpen, setInitialDesktopOpen] = useState(false)

  // Listen to mobile trigger event or keyboard shortcut to activate search dynamically
  useEffect(() => {
    const handleMobileSearch = () => {
      setInitialMobileOpen(true)
      setActivated(true)
    }

    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (window.innerWidth < 768) {
          setInitialMobileOpen(true)
        } else {
          setInitialDesktopOpen(true)
        }
        setActivated(true)
      }
    }

    window.addEventListener("open-mobile-search", handleMobileSearch)
    document.addEventListener("keydown", handleShortcut)

    return () => {
      window.removeEventListener("open-mobile-search", handleMobileSearch)
      document.removeEventListener("keydown", handleShortcut)
    }
  }, [])

  if (!activated) {
    return (
      <SmartSearchBarPlaceholder
        onFocus={() => {
          setInitialDesktopOpen(true)
          setActivated(true)
        }}
      />
    )
  }

  return (
    <DynamicSearchBar
      initialMobileOpen={initialMobileOpen}
      initialDesktopOpen={initialDesktopOpen}
    />
  )
}
