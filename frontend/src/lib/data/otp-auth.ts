/**
 * Storefront client for the backend's OTP auth endpoints.
 * Used by the signup-with-OTP flow and the forgot-password flow.
 */

const PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:3062"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export type OtpPurpose = "signup" | "password_reset" | "email_verify"

async function post<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${PUBLIC_BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`)
  }
  return data as T
}

export async function sendOtp(email: string, purpose: OtpPurpose) {
  return post<{ success: true; expires_at: string }>("/store/auth/otp/send", {
    email,
    purpose,
  })
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: OtpPurpose
) {
  return post<{ success: true; verified: boolean }>(
    "/store/auth/otp/verify",
    { email, code, purpose }
  )
}

export async function resetPasswordWithOtp(
  email: string,
  code: string,
  new_password: string
) {
  return post<{ success: true }>("/store/auth/otp/reset-password", {
    email,
    code,
    new_password,
  })
}
