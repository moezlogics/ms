import { useLocation, useNavigate } from "react-router-dom"

const tabs = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill={a ? "var(--accent)" : "currentColor"} />
      </svg>
    ),
  },
  {
    to: "/orders",
    label: "Orders",
    icon: (a: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10l1.5 2H22v2h-1l-1 12H4L3 8H2V6h4.5L8 4zm-1.8 4 .9 10h11.8l.9-10H5.2z" fill={a ? "var(--accent)" : "currentColor"} />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="bottomnav">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.to)
        return (
          <button
            key={t.to}
            className={`navbtn ${active ? "active" : ""}`}
            onClick={() => navigate(t.to)}
          >
            {t.icon(active)}
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
