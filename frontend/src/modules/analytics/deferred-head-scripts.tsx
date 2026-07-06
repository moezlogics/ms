"use client"

import { useEffect } from "react"

type Props = {
  scripts: string[]
}

function injectScriptBlock(html: string) {
  const tpl = document.createElement("template")
  tpl.innerHTML = html.trim()
  const src = tpl.content.querySelector("script")
  if (!src) return

  const s = document.createElement("script")
  for (const attr of src.attributes) {
    s.setAttribute(attr.name, attr.value)
  }
  if (src.src) {
    s.async = true
    s.src = src.src
  } else {
    s.text = src.text || src.textContent || ""
  }
  document.head.appendChild(s)
}

export default function DeferredHeadScripts({ scripts }: Props) {
  useEffect(() => {
    if (!scripts.length) return

    const run = () => {
      for (const block of scripts) {
        try {
          injectScriptBlock(block)
        } catch {
          /* ignore */
        }
      }
    }

    const schedule = () => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(run, { timeout: 6000 })
      } else {
        setTimeout(run, 3000)
      }
    }

    if (document.readyState === "complete") schedule()
    else window.addEventListener("load", schedule, { once: true })
  }, [scripts])

  return null
}
