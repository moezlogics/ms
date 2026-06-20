import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "../api"
import { enablePush } from "../push"
import { useSettings } from "../settings"

export default function Login() {
  const navigate = useNavigate()
  const { name, logo, reload } = useSettings()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      reload() // pull branding/theme now that we're authed
      try { await enablePush() } catch {}
      navigate("/dashboard", { replace: true })
    } catch (e: any) {
      if (e?.status === 429) {
        // Backend locked this IP after too many failed attempts.
        setLocked(true)
        setErr(e?.message || "Too many attempts. Locked for 1 hour.")
      } else {
        setErr(e?.message || "Login failed. Check your email and password.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        {logo ? (
          <img src={logo} alt={name} className="login-logo" />
        ) : (
          <div className="login-mark">{(name || "S").charAt(0).toUpperCase()}</div>
        )}
        <h1>{name}</h1>
        <p className="muted">Orders Admin — sign in to continue</p>

        {locked ? (
          <div
            style={{
              marginTop: 18,
              padding: "16px",
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.08)",
              color: "#fca5a5",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            🔒 <strong>Access locked</strong>
            <br />
            Bahut zyada ghalat attempts. Ye device 1 ghante ke liye block hai.
            Baad mein try karein.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--fg-sub)",
                    borderRadius: 8,
                  }}
                >
                  {showPw ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 1.1-.8 2.6-2.1 3.9M6.1 6.1C4 7.5 3 9.6 3 11c0 2 4 7 9 7 1 0 1.9-.2 2.8-.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button className="btn primary mt" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
      {err && !locked && <div className="toast err">{err}</div>}
    </div>
  )
}
