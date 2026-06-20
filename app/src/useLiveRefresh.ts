import { useEffect, useRef } from "react"

/**
 * Keeps a screen live without manual refresh:
 *   1. Polls `onRefresh` every `intervalMs` (default 10s) while the tab
 *      is visible — new orders appear on their own, no push required.
 *   2. Refetches instantly when the service worker reports a new order
 *      (push → postMessage), so a background order pops in immediately.
 *   3. Refetches when the app returns to the foreground.
 */
export function useLiveRefresh(onRefresh: () => void, intervalMs = 10000) {
  const cb = useRef(onRefresh)
  cb.current = onRefresh

  useEffect(() => {
    let timer: any = null

    const tick = () => {
      if (document.visibilityState === "visible") cb.current()
    }
    timer = setInterval(tick, intervalMs)

    const onVisible = () => {
      if (document.visibilityState === "visible") cb.current()
    }
    document.addEventListener("visibilitychange", onVisible)

    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "new-order") cb.current()
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage)

    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      navigator.serviceWorker?.removeEventListener("message", onSwMessage)
    }
  }, [intervalMs])
}
