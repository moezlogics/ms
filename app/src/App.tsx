import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { getToken } from "./api"
import { SettingsProvider } from "./settings"
import BottomNav from "./components/BottomNav"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Orders from "./pages/Orders"
import OrderDetail from "./pages/OrderDetail"

function RequireAuth({ children }: { children: JSX.Element }) {
  const navigate = useNavigate()
  const ok = !!getToken()
  useEffect(() => {
    if (!ok) navigate("/login", { replace: true })
  }, [ok, navigate])
  return ok ? children : null
}

export default function App() {
  const { pathname } = useLocation()
  const showNav = !!getToken() && pathname !== "/login"

  return (
    <SettingsProvider>
      <div className={`app ${showNav ? "with-nav" : ""}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="*" element={<Navigate to={getToken() ? "/dashboard" : "/login"} replace />} />
        </Routes>
        {showNav && <BottomNav />}
      </div>
    </SettingsProvider>
  )
}
