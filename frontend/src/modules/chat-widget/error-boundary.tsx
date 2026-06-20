"use client"

import React from "react"

/**
 * Isolation boundary for the chat widget.
 *
 * The chat widget is mounted in the ROOT layout, so before this existed,
 * ANY uncaught render error inside it (e.g. a malformed AI response shape
 * that the message renderer didn't expect) bubbled all the way up to
 * `app/global-error.tsx` and replaced the ENTIRE site with the
 * "Something went wrong loading the store" screen — the user could be on
 * any page and the whole store would blank out just because the chat UI
 * hit a bad state.
 *
 * This boundary contains those failures to the widget itself: if the
 * widget crashes, it simply unmounts (renders nothing) and the rest of
 * the store keeps working.
 *
 * RECOVERY: After an error, the widget automatically retries after a
 * short delay (2s). This means if the error was transient (e.g. a
 * brief race condition or a one-off bad state), the widget comes back
 * on its own without needing a page reload.
 */
export class ChatWidgetErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorCount: number }
> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, errorCount: 0 }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // Log for diagnostics but never surface to the shopper.
    console.error("[chat-widget] contained render error:", error)

    // Auto-retry after a short delay, up to 3 times.
    // After 3 consecutive crashes, stay down to avoid a crash loop.
    this.setState((prev) => {
      const newCount = prev.errorCount + 1
      if (newCount <= 3) {
        this.scheduleRetry(newCount)
      }
      return { errorCount: newCount }
    })
  }

  private scheduleRetry(attempt: number) {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    // Exponential backoff: 2s, 4s, 8s
    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 8000)
    this.retryTimer = setTimeout(() => {
      this.setState({ hasError: false })
    }, delay)
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer)
  }

  render() {
    if (this.state.hasError) {
      // Render nothing — the store stays fully usable without the widget.
      return null
    }
    return this.props.children
  }
}

export default ChatWidgetErrorBoundary
