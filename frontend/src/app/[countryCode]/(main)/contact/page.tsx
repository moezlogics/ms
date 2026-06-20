import { Metadata } from "next"
import { getSiteSettings } from "@lib/data/site-settings"
import { publicSeo } from "@lib/util/seo-url"
import ContactForm from "@modules/contact/components/contact-form"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const siteName = s.site_name?.trim() || undefined
  return publicSeo({
    path: "/contact",
    title: "Contact Us",
    description: `Get in touch with ${siteName || "us"} — questions, feedback, or support requests, we’re here to help.`,
    image: s.seo_default_og_image?.trim() || undefined,
    siteName,
  })
}

export default async function ContactPage() {
  const s = await getSiteSettings()

  const contactEmail = s.contact_email?.trim()
  const contactPhone = s.contact_phone?.trim()
  const contactAddress = s.contact_address?.trim()
  const whatsappNumber = s.whatsapp_number?.trim()

  const cleanPhone = contactPhone ? contactPhone.replace(/\s+/g, "") : ""
  const cleanWhatsapp = whatsappNumber ? whatsappNumber.replace(/\D/g, "") : ""

  const hasContactInfo = contactEmail || contactPhone || contactAddress || whatsappNumber

  return (
    <div className="container-anvogue py-8 md:py-14 pb-16">
      {/* Premium Hero Section */}
      <div className="relative rounded-[24px] md:rounded-[32px] overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-line/45 p-6 md:p-12 mb-10 md:mb-12 shadow-sm select-none">
        <div className="max-w-2xl relative z-10">
          <div className="text-sub-display has-line-before text-primary/70 text-[11px] sm:text-xs">
            Get in touch
          </div>
          <h1 className="heading1 text-ink mt-2 mb-3 tracking-tight">Contact Our Team</h1>
          <p className="body1 text-ink/70 max-w-lg leading-relaxed">
            Have questions about our products, order delivery, or looking for general support? 
            Reach out through our contact form or details below.
          </p>
        </div>
        {/* Abstract shape decoration */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-primary/5 to-transparent opacity-60 pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Contact Info Cards (Left Column) */}
        {hasContactInfo && (
          <div className="lg:col-span-5 flex flex-col gap-5">
            <h2 className="heading4 text-ink mb-1">Contact Information</h2>

            {/* Email Card */}
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-line bg-surface/40 hover:bg-bg hover:border-primary/45 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors duration-300">
                  <i className="ph-fill ph-envelope-simple text-xl" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-ink/45 uppercase tracking-wider">
                    Email Support
                  </div>
                  <p className="text-sm font-semibold text-ink truncate mt-0.5">
                    {contactEmail}
                  </p>
                </div>
              </a>
            )}

            {/* Call Support Card */}
            {contactPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-line bg-surface/40 hover:bg-bg hover:border-primary/45 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-fg transition-colors duration-300">
                  <i className="ph-fill ph-phone text-xl" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-ink/45 uppercase tracking-wider">
                    Call Inquiry
                  </div>
                  <p className="text-sm font-semibold text-ink truncate mt-0.5">
                    {contactPhone}
                  </p>
                </div>
              </a>
            )}

            {/* WhatsApp Card */}
            {whatsappNumber && (
              <a
                href={`https://wa.me/${cleanWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl border border-line bg-surface/40 hover:bg-bg hover:border-success/45 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-success/10 text-success flex items-center justify-center flex-shrink-0 group-hover:bg-success group-hover:text-white transition-colors duration-300">
                  <i className="ph-fill ph-whatsapp-logo text-xl" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-success/80 uppercase tracking-wider">
                    WhatsApp Chat
                  </div>
                  <p className="text-sm font-semibold text-ink truncate mt-0.5">
                    Chat with us online
                  </p>
                </div>
              </a>
            )}

            {/* Address Card */}
            {contactAddress && (
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-line bg-surface/40">
                <div className="w-11 h-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center flex-shrink-0">
                  <i className="ph-fill ph-map-pin text-xl" aria-hidden />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-ink/45 uppercase tracking-wider">
                    Business Address
                  </div>
                  <p className="text-sm font-semibold text-ink/85 mt-1 whitespace-pre-line leading-relaxed">
                    {contactAddress}
                  </p>
                </div>
              </div>
            )}

            {/* Social Links Row */}
            {(s.social_facebook ||
              s.social_instagram ||
              s.social_twitter ||
              s.social_youtube ||
              s.social_tiktok) && (
              <div className="mt-2 p-4 rounded-2xl border border-line bg-surface/40 flex flex-col gap-3">
                <div className="text-[11px] font-bold text-ink/45 uppercase tracking-wider">
                  Social Channels
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { key: "social_facebook", icon: "facebook-logo", label: "Facebook" },
                    { key: "social_instagram", icon: "instagram-logo", label: "Instagram" },
                    { key: "social_twitter", icon: "x-logo", label: "Twitter / X" },
                    { key: "social_youtube", icon: "youtube-logo", label: "YouTube" },
                    { key: "social_tiktok", icon: "tiktok-logo", label: "TikTok" },
                  ]
                    .filter((soc) => s[soc.key]?.trim())
                    .map((soc) => (
                      <a
                        key={soc.key}
                        href={s[soc.key]!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={soc.label}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-line bg-bg hover:bg-primary hover:text-primary-fg hover:border-primary transition-all duration-300 active:scale-90"
                      >
                        <i
                          className={`ph-fill ph-${soc.icon} text-base`}
                          aria-hidden
                        />
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact Form Wrapper (Right Column) */}
        <div className="lg:col-span-7">
          <div className="p-6 md:p-8 rounded-[24px] border border-line bg-bg shadow-sm">
            <h2 className="heading4 text-ink mb-4">Send a Message</h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  )
}
