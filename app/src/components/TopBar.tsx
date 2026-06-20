import { useSettings } from "../settings"

export default function TopBar({
  title,
  subtitle,
  right,
  showBrand = true,
  loading = false,
  onBack,
}: {
  title?: string
  subtitle?: string
  right?: React.ReactNode
  showBrand?: boolean
  loading?: boolean
  onBack?: () => void
}) {
  const { name, logo } = useSettings()
  return (
    <header className="topbar">
      {onBack && (
        <button className="iconbtn" onClick={onBack} style={{ marginRight: 4, flexShrink: 0 }} title="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      {showBrand && !onBack &&
        (logo ? (
          <img src={logo} alt={name} className="brandlogo" />
        ) : (
          <div className="brandmark">{(name || "S").charAt(0).toUpperCase()}</div>
        ))}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>{title || name}</h1>
        {subtitle && <span className="sub">{subtitle}</span>}
      </div>
      {right}
      {loading && (
        <div className="live-progress-container">
          <div className="live-progress-bar" />
        </div>
      )}
    </header>
  )
}
