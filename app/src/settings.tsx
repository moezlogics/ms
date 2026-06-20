import { createContext, useContext, useEffect, useState } from "react"
import { getSiteSettings, getToken } from "./api"
import { STORE_LABEL } from "./config"

type Settings = Record<string, string>

type Ctx = {
  name: string
  logo?: string
  settings: Settings
  reload: () => void
}

const SettingsContext = createContext<Ctx>({
  name: STORE_LABEL,
  settings: {},
  reload: () => {},
})

function applyTheme(s: Settings) {
  // Admin app remains strictly in the premium dark obsidian mode.
  // We ignore storefront color themes to prevent light-mode overrides.
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({})

  const reload = () => {
    if (!getToken()) return
    getSiteSettings()
      .then(({ settings }) => {
        setSettings(settings || {})
        applyTheme(settings || {})
        const name = settings?.site_name || STORE_LABEL
        document.title = `${name} · Orders`
      })
      .catch(() => {
        /* keep defaults */
      })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const name = settings.site_name || STORE_LABEL
  const logo = settings.site_logo_url || undefined

  return (
    <SettingsContext.Provider value={{ name, logo, settings, reload }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
