import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { registerServiceWorker } from "./push"
import "./styles.css"

// Register the service worker early so push can be enabled after login.
registerServiceWorker().catch(() => {
  /* SW registration is best-effort; app still works without push */
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
