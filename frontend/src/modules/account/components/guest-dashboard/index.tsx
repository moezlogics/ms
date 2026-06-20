"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getGuestId, getGuestProfile, saveGuestProfile, getGuestOrders, GuestProfile } from "@lib/util/guest"
import { fetchGuestOrders, fetchGuestReviews } from "@lib/data/guest"

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  placed: { bg: "bg-blue-500/10", text: "text-blue-600" },
  confirmed: { bg: "bg-indigo-500/10", text: "text-indigo-600" },
  completed: { bg: "bg-green-500/10", text: "text-green-600" },
  delivered: { bg: "bg-green-500/10", text: "text-green-600" },
  canceled: { bg: "bg-rose-500/10", text: "text-rose-600" },
  default: { bg: "bg-ink/5", text: "text-ink/60" },
}

export default function GuestDashboard() {
  const [guestId, setGuestId] = useState("")
  const [profile, setProfile] = useState<GuestProfile>({ name: "", phone: "", email: "" })
  const [nameInput, setNameInput] = useState("")
  const [phoneInput, setPhoneInput] = useState("")
  const [emailInput, setEmailInput] = useState("")

  const [orders, setOrders] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [activeTab, setActiveTab] = useState<"orders" | "reviews">("orders")
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const gid = getGuestId()
    setGuestId(gid)
    
    const prof = getGuestProfile()
    setProfile(prof)
    setNameInput(prof.name || "")
    setPhoneInput(prof.phone || "")
    setEmailInput(prof.email || "")

    // Fetch Guest Orders
    const localOrderIds = getGuestOrders()
    setLoadingOrders(true)
    fetchGuestOrders(gid, localOrderIds)
      .then((data) => setOrders(data))
      .finally(() => setLoadingOrders(false))

    // Fetch Guest Reviews
    setLoadingReviews(true)
    fetchGuestReviews(gid)
      .then((data) => setReviews(data))
      .finally(() => setLoadingReviews(false))
  }, [])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const updated = {
      name: nameInput.trim(),
      phone: phoneInput.trim(),
      email: emailInput.trim(),
    }
    saveGuestProfile(updated)
    setProfile(updated)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6 animate-enter">
      {/* Celebration/Welcome Guest Header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-6 border border-primary/15 relative overflow-hidden">
        <div className="absolute right-4 bottom-0 translate-y-1/3 opacity-10">
          <i className="ph-fill ph-user-circle text-[150px] text-primary" />
        </div>
        <div className="space-y-2 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
            Guest Dashboard
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
            Welcome, {profile.name || "Guest Shopper"}!
          </h1>
          <p className="text-xs text-ink/60 max-w-lg leading-relaxed">
            Your guest identity is secured locally on this browser. You can track orders and view your ratings without needing an account.
          </p>
        </div>
      </div>

      {/* Rewards Call to Action */}
      <div className="bg-surface border border-line/60 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-warning/35 transition-all">
        <div className="flex gap-4 items-start">
          <div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
            <i className="ph-fill ph-coins text-2xl" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-ink text-sm md:text-base flex items-center gap-1.5">
              🪙 Claim 10 Welcome Coins!
            </h3>
            <p className="text-xs text-ink/50 leading-relaxed max-w-md">
              Create a free account to join our E-Med Rewards. Logged-in users earn coins on every order to redeem for exclusive discounts.
            </p>
          </div>
        </div>
        <LocalizedClientLink
          href="/account/login"
          className="px-5 py-2.5 rounded-full bg-primary text-primary-fg text-xs font-semibold hover:brightness-110 active:scale-95 transition-all text-center shrink-0"
        >
          Register & Earn Coins
        </LocalizedClientLink>
      </div>

      {/* Split details and tab view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Contact details saved locally */}
        <section className="bg-surface border border-line/50 rounded-3xl p-5 space-y-4 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <i className="ph ph-address-book text-lg" />
            </div>
            <div>
              <h2 className="font-bold text-ink text-sm">Quick Contacts</h2>
              <p className="text-[10px] text-ink/40">Pre-fills checkouts on this device</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-ink/50">Full Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Muhammad Ali"
                className="w-full text-xs px-3.5 py-2.5 bg-bg border border-line rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-ink/50">Mobile Number</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 03001234567"
                className="w-full text-xs px-3.5 py-2.5 bg-bg border border-line rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-ink/50">Email Address</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="e.g. ali@example.com"
                className="w-full text-xs px-3.5 py-2.5 bg-bg border border-line rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className={`text-[10px] text-success font-medium transition-opacity ${isSaved ? "opacity-100" : "opacity-0"}`}>
                ✓ Saved to browser
              </span>
              <button
                type="submit"
                className="px-4 py-2 bg-ink text-bg text-xs font-semibold rounded-full hover:brightness-110 active:scale-95 transition"
              >
                Save Local Info
              </button>
            </div>
          </form>
        </section>

        {/* Tab switcher and lists */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex border-b border-line gap-4">
            <button
              onClick={() => setActiveTab("orders")}
              className={`pb-2.5 text-sm font-bold border-b-2 transition ${activeTab === "orders" ? "border-primary text-primary" : "border-transparent text-ink/40"}`}
            >
              My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-2.5 text-sm font-bold border-b-2 transition ${activeTab === "reviews" ? "border-primary text-primary" : "border-transparent text-ink/40"}`}
            >
              My Reviews ({reviews.length})
            </button>
          </div>

          {activeTab === "orders" && (
            <div className="space-y-3">
              {loadingOrders ? (
                <div className="text-center text-xs text-ink/40 py-12">
                  <i className="ph-bold ph-spinner animate-spin text-lg block mx-auto mb-2" />
                  Loading guest orders…
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-surface rounded-3xl p-10 text-center border border-line/45">
                  <i className="ph ph-package text-3xl text-ink/20 block mx-auto mb-2" />
                  <h4 className="font-semibold text-ink text-xs mb-1">No orders yet</h4>
                  <p className="text-[10px] text-ink/45 mb-4">Orders placed from this browser will appear here.</p>
                  <LocalizedClientLink href="/store" className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    Start Shopping
                  </LocalizedClientLink>
                </div>
              ) : (
                <ul className="space-y-3">
                  {orders.map((o) => {
                    const statusConfig = STATUS_COLORS[o.status] || STATUS_COLORS.default
                    return (
                      <li key={o.id} className="bg-surface border border-line/50 rounded-3xl p-4 space-y-3 hover:shadow-sm transition">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-ink/40">ORDER #{o.display_id}</span>
                            <div className="text-[10px] text-ink/50">
                              {new Date(o.created_at).toLocaleDateString("en-PK", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {o.status}
                          </span>
                        </div>

                        {/* Items preview */}
                        <div className="flex gap-3 overflow-x-auto pb-1">
                          {o.items?.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 bg-bg border border-line/40 rounded-xl p-1.5 shrink-0 max-w-[200px]">
                              {item.thumbnail && (
                                <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover" />
                              )}
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-ink truncate w-24">{item.title}</p>
                                <p className="text-[9px] text-ink/40">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-line/40 pt-3">
                          <div>
                            <span className="text-[10px] text-ink/45 block">Total Amount</span>
                            <span className="text-xs font-extrabold text-ink">
                              Rs. {o.total?.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <LocalizedClientLink
                              href={`/order/${o.id}/confirmed`}
                              className="px-3 py-1.5 rounded-full bg-primary text-primary-fg text-[10px] font-bold hover:brightness-110 active:scale-95 transition"
                            >
                              Track Status
                            </LocalizedClientLink>
                            {(o.status === "completed" || o.status === "delivered") && (
                              <LocalizedClientLink
                                href={`/account/orders/details/${o.id}/return`}
                                className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold active:scale-95 transition"
                              >
                                Return / Exchange
                              </LocalizedClientLink>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-3">
              {loadingReviews ? (
                <div className="text-center text-xs text-ink/40 py-12">
                  <i className="ph-bold ph-spinner animate-spin text-lg block mx-auto mb-2" />
                  Loading guest reviews…
                </div>
              ) : reviews.length === 0 ? (
                <div className="bg-surface rounded-3xl p-10 text-center border border-line/45">
                  <i className="ph ph-star text-3xl text-ink/20 block mx-auto mb-2" />
                  <h4 className="font-semibold text-ink text-xs mb-1">No reviews yet</h4>
                  <p className="text-[10px] text-ink/45">Reviews you submit on products will be displayed here.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="bg-surface border border-line/50 rounded-3xl p-4 space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-flex gap-0.5 mb-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <i
                                key={star}
                                className={`ph-fill ph-star text-xs ${star <= r.rating ? "text-warning" : "text-ink/15"}`}
                              />
                            ))}
                          </span>
                          <span className="text-[9px] text-ink/35 block">
                            {new Date(r.created_at).toLocaleDateString("en-PK", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${r.status === "approved" ? "bg-green-500/10 text-green-600" : "bg-warning/10 text-warning"}`}>
                          {r.status === "approved" ? "Approved" : "Pending Approval"}
                        </span>
                      </div>

                      <p className="text-xs text-ink/80 leading-relaxed font-medium">
                        {r.content}
                      </p>

                      {r.photos && r.photos.length > 0 && (
                        <div className="flex gap-1">
                          {r.photos.map((photo: string, idx: number) => (
                            <img key={idx} src={photo} alt="" className="w-10 h-10 object-cover rounded-lg border border-line/40" />
                          ))}
                        </div>
                      )}

                      {r.owner_reply && (
                        <div className="rounded-xl bg-primary/5 border border-primary/10 p-2 text-[11px] text-ink/75">
                          <span className="font-bold text-primary block mb-0.5">Store Reply</span>
                          {r.owner_reply}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
