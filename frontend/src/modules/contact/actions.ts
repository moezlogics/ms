"use server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:3062"

export type ContactFormData = {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}

export type ContactResult =
  | { success: true }
  | { success: false; error: string }

export async function submitContactForm(
  data: ContactFormData
): Promise<ContactResult> {
  const name = data.name.trim()
  const email = data.email.trim()
  const message = data.message.trim()

  if (!name) return { success: false, error: "Please enter your name." }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }
  if (!message) return { success: false, error: "Please enter a message." }

  try {
    const res = await fetch(`${BACKEND_URL}/store/contact`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      body: JSON.stringify({
        name,
        email,
        phone: data.phone?.trim() || undefined,
        subject: data.subject?.trim() || undefined,
        message,
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        error: body.error || "Something went wrong. Please try again.",
      }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      error: "Could not connect to the server. Please try again later.",
    }
  }
}
