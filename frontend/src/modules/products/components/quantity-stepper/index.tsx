"use client"

type Props = {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  disabled?: boolean
}

/**
 * Professional ± stepper for the PDP.
 *
 *   [ − ]  [  3  ]  [ + ]
 *
 * Circular minus/plus buttons flanking a non-editable numeric display.
 * Hover lifts the buttons, disabled state dims them. Meant to sit inline
 * with the Add-to-Cart CTA on the right.
 */
export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled,
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  const btn =
    "w-8 h-8 flex items-center justify-center rounded-full bg-bg text-ink border border-line transition-all duration-200 hover:bg-primary hover:text-primary-fg hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full p-0.5 bg-surface border border-line">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className={btn}
      >
        <i className="ph-bold ph-minus text-[11px]" aria-hidden />
      </button>
      <span
        aria-live="polite"
        className="min-w-[24px] text-center text-xs font-semibold text-ink tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className={btn}
      >
        <i className="ph-bold ph-plus text-[11px]" aria-hidden />
      </button>
    </div>
  )
}
