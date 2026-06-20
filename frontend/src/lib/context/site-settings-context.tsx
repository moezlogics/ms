"use client"

import React, { createContext, useContext } from "react"

interface SiteSettingsContextType {
  aspectClass: string
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  aspectClass: "aspect-[3/4]", // default fallback
})

export const SiteSettingsProvider = ({
  children,
  aspectClass,
}: {
  children: React.ReactNode
  aspectClass: string
}) => {
  return (
    <SiteSettingsContext.Provider value={{ aspectClass }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export const useSiteSettings = () => useContext(SiteSettingsContext)
