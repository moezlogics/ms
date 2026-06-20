"use client"

/**
 * Root-level error boundary — catches crashes in the root layout itself
 * (the case the (main)/error.tsx boundary can't reach). Must render its
 * own <html>/<body>. Plain inline styles: global CSS may not be loaded
 * when this renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#fff",
          color: "#111",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 18, margin: 0 }}>
          Something went wrong loading the store
        </h2>
        <p style={{ fontSize: 14, color: "#666", margin: 0, maxWidth: 380 }}>
          It&apos;s usually a temporary network issue. Please try again.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 22px",
              borderRadius: 12,
              border: "none",
              background: "#111",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 22px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#111",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
