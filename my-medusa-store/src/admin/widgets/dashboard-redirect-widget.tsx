import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const DashboardRedirectWidget = () => {
  useEffect(() => {
    const hasRedirected = sessionStorage.getItem("admin_dashboard_redirected")
    if (!hasRedirected) {
      sessionStorage.setItem("admin_dashboard_redirected", "true")
      window.location.href = "/app/dashboard"
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default DashboardRedirectWidget
