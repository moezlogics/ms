"use client"

import React, { useState } from "react"

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-ink/40 hover:text-ink transition-all duration-150 rounded-lg hover:bg-surface-alt flex items-center justify-center shrink-0 border border-transparent hover:border-line/30"
      title="Copy to clipboard"
    >
      <i className={copied ? "ph-bold ph-check text-success text-[11px]" : "ph-bold ph-copy text-[11px]"} />
    </button>
  )
}
