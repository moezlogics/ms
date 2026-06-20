"use client"

import { useEffect, useRef } from "react"

/**
 * Six-input OTP code field with auto-advance, paste-to-fill, and
 * keyboard navigation. Controlled — pass `value` (a 6-character string,
 * "" if empty) and an `onChange` callback.
 */
export default function OtpInput({
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const setAt = (i: number, char: string) => {
    const next = (value || "").padEnd(6, " ").split("")
    next[i] = char
    onChange(next.join("").replace(/\s/g, "").slice(0, 6))
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (value[i]) {
        setAt(i, "")
      } else if (i > 0) {
        refs.current[i - 1]?.focus()
        setAt(i - 1, "")
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus()
    }
  }

  const onInput = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, "")
    if (!digits) return setAt(i, "")

    if (digits.length === 1) {
      setAt(i, digits)
      if (i < 5) refs.current[i + 1]?.focus()
    } else {
      // Paste of multiple digits — fill from current cell forward
      const next = (value || "").padEnd(6, " ").split("")
      for (let k = 0; k < digits.length && i + k < 6; k++) {
        next[i + k] = digits[k]
      }
      onChange(next.join("").replace(/\s/g, "").slice(0, 6))
      const lastIndex = Math.min(i + digits.length - 1, 5)
      refs.current[lastIndex]?.focus()
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={disabled}
          value={value[i] || ""}
          onChange={(e) => onInput(e, i)}
          onKeyDown={(e) => onKey(e, i)}
          onFocus={(e) => e.target.select()}
          className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-semibold rounded-lg border border-ui-border-base bg-ui-bg-field focus:border-ui-fg-interactive focus:ring-1 focus:ring-ui-fg-interactive outline-none transition disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
