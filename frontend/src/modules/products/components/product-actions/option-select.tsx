import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

/**
 * Lightweight named-color → hex map. If the admin entered a real color
 * name (e.g. "Black", "Navy"), we render it as a swatch. Anything not
 * in this map falls back to treating the option like a text pill.
 */
const COLOR_MAP: Record<string, string> = {
  black: "#111111",
  white: "#ffffff",
  red: "#dc2626",
  blue: "#2563eb",
  navy: "#1e3a8a",
  sky: "#38bdf8",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  green: "#16a34a",
  olive: "#65a30d",
  lime: "#84cc16",
  yellow: "#eab308",
  amber: "#f59e0b",
  orange: "#f97316",
  peach: "#fdba74",
  pink: "#ec4899",
  rose: "#f43f5e",
  purple: "#9333ea",
  violet: "#7c3aed",
  indigo: "#4f46e5",
  magenta: "#d946ef",
  brown: "#78350f",
  beige: "#f5f5dc",
  cream: "#fef3c7",
  tan: "#d2b48c",
  khaki: "#bdb76b",
  grey: "#6b7280",
  gray: "#6b7280",
  silver: "#c0c0c0",
  gold: "#d4af37",
  ivory: "#fffff0",
  maroon: "#800000",
  burgundy: "#881337",
  charcoal: "#36454f",
  mint: "#86efac",
  coral: "#ff7f50",
  lavender: "#a78bfa",
  mustard: "#eab308",
}

function detectIsColor(title: string): boolean {
  const t = title.trim().toLowerCase()
  return /colou?r|shade|tone|hue|finish/.test(t)
}

function resolveColor(value: string): string | null {
  const v = value.trim().toLowerCase()
  if (COLOR_MAP[v]) return COLOR_MAP[v]
  // Exact hex input
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v
  // Rough keyword match: "rose gold" → try gold
  for (const key of Object.keys(COLOR_MAP)) {
    if (v.includes(key)) return COLOR_MAP[key]
  }
  return null
}

/**
 * Professional variant selector.
 *
 *   • Color/shade options render as circular swatches with a selected ring.
 *   • Size options (S/M/L/XL or numeric) render as square pill buttons
 *     with a strong active state.
 *   • Any other text option renders as horizontal pill buttons.
 *
 * Improves on the previous version by giving real visual feedback
 * (selection ring, hover glow) and making the controls feel tactile.
 */
const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const values = (option.values ?? []).map((v) => v.value)
  const isColor = detectIsColor(title)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
          {title}
        </span>
        {current && (
          <span className="text-[11px] text-ink/60">
            <span className="font-medium text-ink">{current}</span>
          </span>
        )}
      </div>

      <div
        className={clx(
          "flex flex-wrap",
          isColor ? "gap-2" : "gap-1.5"
        )}
        data-testid={dataTestId}
      >
        {values.map((v) => {
          const active = v === current
          if (isColor) {
            const bg = resolveColor(v)
            return (
              <button
                key={v}
                type="button"
                onClick={() => updateOption(option.id, v)}
                disabled={disabled}
                aria-label={v}
                aria-pressed={active}
                title={v}
                data-testid="option-button"
                className={clx(
                  "relative w-8 h-8 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  active
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-bg scale-[1.05]"
                    : "hover:scale-[1.08] ring-1 ring-line"
                )}
                style={{
                  background: bg || "#f3f4f6",
                  ...(bg === "#ffffff" || bg === "#fffff0" || bg === "#fef3c7"
                    ? { boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }
                    : {}),
                }}
              >
                {!bg && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-ink/70">
                    {v.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {active && bg && (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <i
                      className="ph-bold ph-check text-[12px]"
                      style={{
                        color:
                          bg === "#ffffff" ||
                          bg === "#fffff0" ||
                          bg === "#fef3c7" ||
                          bg === "#f5f5dc"
                            ? "#111"
                            : "#fff",
                      }}
                      aria-hidden
                    />
                  </span>
                )}
              </button>
            )
          }

          // Size / text pill
          return (
            <button
              key={v}
              type="button"
              onClick={() => updateOption(option.id, v)}
              disabled={disabled}
              aria-pressed={active}
              data-testid="option-button"
              className={clx(
                "min-w-[40px] h-8 px-3 rounded-full text-[12px] font-medium transition-all duration-200",
                "border disabled:opacity-40 disabled:cursor-not-allowed",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                active
                  ? "bg-primary text-primary-fg border-primary shadow-[0_4px_14px_-4px_rgb(var(--color-primary)/0.45)]"
                  : "bg-bg text-ink border-line hover:border-primary hover:text-primary"
              )}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
