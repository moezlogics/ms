"use client"

import { useState } from "react"
import { submitContactForm } from "@modules/contact/actions"

type FormState = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

const INITIAL: FormState = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof FormState, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    setSubmitting(true)
    try {
      const result = await submitContactForm({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject || undefined,
        message: form.message,
      })

      if (result.success) {
        setSuccess(true)
        setForm(INITIAL)
      } else {
        setError(result.error)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="ph-fill ph-check-circle text-3xl text-green-600" aria-hidden />
        </div>
        <h3 className="heading4 mb-2">Message Sent!</h3>
        <p className="body1 text-secondary mb-6">
          Thank you for reaching out. We'll get back to you as soon as possible.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-button-uppercase text-brand-green hover:underline"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="caption1 font-semibold text-brand-black block mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="John Doe"
            required
            className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
          />
        </div>
        <div>
          <label className="caption1 font-semibold text-brand-black block mb-1.5">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="caption1 font-semibold text-brand-black block mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+92 300 0000000"
            className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
          />
        </div>
        <div>
          <label className="caption1 font-semibold text-brand-black block mb-1.5">
            Subject
          </label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => set("subject", e.target.value)}
            placeholder="Order inquiry, product question..."
            className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="caption1 font-semibold text-brand-black block mb-1.5">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="How can we help you?"
          required
          rows={6}
          className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="button-main w-full sm:w-auto sm:self-start disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  )
}
