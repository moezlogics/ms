type Point = { date: string; sales: number; orders: number }

/** Lightweight dependency-free area/line chart (SVG). */
export default function MiniAreaChart({
  data,
  metric,
  height = 150,
}: {
  data: Point[]
  metric: "sales" | "orders"
  height?: number
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-mut)", fontSize: 13 }}>
        No trend data
      </div>
    )
  }

  const W = 320
  const H = height
  const pad = 6
  const vals = data.map((d) => (metric === "sales" ? d.sales : d.orders))
  const max = Math.max(1, ...vals)
  const n = data.length
  const stepX = (W - pad * 2) / Math.max(1, n - 1)

  const pts = vals.map((v, i) => {
    const x = pad + i * stepX
    const y = pad + (H - pad * 2) * (1 - v / max)
    return [x, y] as const
  })

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3.5 : 0} fill="var(--accent)" />
      ))}
    </svg>
  )
}
