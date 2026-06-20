import LoginTemplate from "@modules/account/templates/login-template"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your account.",
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return <LoginTemplate />
}
