import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  toast,
} from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { fetchSettings, saveSettings, uploadFile } from "../../lib/settings-sdk"
import { A, adminSection, adminStickyHeader, adminSectionTitle, adminDescription, adminHelpText } from "../../lib/admin-theme"

// All keys the storefront can read.
const DEFAULT_KEYS = [
  "site_name",
  "site_tagline",
  "site_logo_url",
  "site_logo_width_mobile",
  "site_logo_width_desktop",
  "site_favicon_url",
  "seo_home_title",
  "seo_home_description",
  "seo_home_keywords",
  "seo_default_og_image",
  "announcement_bar_text",
  "announcement_bar_enabled",
  "announcement_bar_bg",
  "announcement_bar_fg",
  "announcement_bar_speed",
  "contact_email",
  "contact_phone",
  "contact_address",
  // Business / LocalBusiness profile (drives JSON-LD + AI prompt)
  "business_type",
  "business_country",
  "business_locality",
  "business_region",
  "business_postal_code",
  "business_license_number",
  "business_opening_hours",
  "business_price_range",
  "social_facebook",
  "social_instagram",
  "social_twitter",
  "social_youtube",
  "social_pinterest",
  "social_tiktok",
  "footer_copyright",
  "google_analytics_id",
  "meta_pixel_id",
  "head_code",
  // Storefront appearance
  "product_card_aspect",
  "whatsapp_number",
  "whatsapp_widget_enabled",
  "whatsapp_buy_now_enabled",
  "whatsapp_chatbot_enabled",
  "cart_drawer_enabled",
  "cart_drawer_cross_sell_enabled",
  "cart_drawer_cross_sell_count",
  "sticky_pdp_bar_enabled",
  "recent_purchases_ticker_enabled",
  "recent_purchases_ticker_interval",
  // Static pages content
  "page_about_title",
  "page_about_content",
  "page_privacy_title",
  "page_privacy_content",
  "page_disclaimer_title",
  "page_disclaimer_content",
  "page_terms_title",
  "page_terms_content",
  "page_refund_title",
  "page_refund_content",
  "page_home_content",
] as const

// Allowed product-card aspect ratios. The storefront falls back to 3/4 if
// the saved value isn't in this list — change carefully.
const PRODUCT_CARD_ASPECTS: Array<{ value: string; label: string }> = [
  { value: "1/1", label: "Square (1 : 1)" },
  { value: "6/7", label: "Portrait compact (6 : 7)" },
  { value: "4/5", label: "Portrait short (4 : 5)" },
  { value: "3/4", label: "Portrait (3 : 4)" },
  { value: "2/3", label: "Portrait tall (2 : 3)" },
  { value: "11/14", label: "Anvogue editorial (11 : 14)" },
  { value: "9/16", label: "Fashion tall (9 : 16)" },
]

type SettingsState = Record<string, string>

const Section = ({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) => (
  <div style={adminSection}>
    <div style={{ marginBottom: 16 }}>
      <h3 style={adminSectionTitle}>{title}</h3>
      {description && (
        <p style={adminDescription}>
          {description}
        </p>
      )}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {children}
    </div>
  </div>
)

const Field = ({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: React.ReactNode
}) => (
  <div>
    <Label>{label}</Label>
    {children}
    {help && (
      <p style={adminHelpText}>{help}</p>
    )}
  </div>
)

const ImageField = ({
  label,
  value,
  onChange,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}) => {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const onFile = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await uploadFile(file)
      if (uploaded.url) onChange(uploaded.url)
    } catch (e) {
      toast.error("Upload failed: " + (e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field label={label} help={help}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {value && (
          <img
            src={value}
            alt={label}
            style={{
              width: 80,
              height: 80,
              objectFit: "cover",
              borderRadius: 6,
              border: A.border,
            }}
          />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Input
            placeholder="https://..."
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => ref.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {value && (
              <Button
                variant="danger"
                size="small"
                onClick={() => onChange("")}
              >
                Clear
              </Button>
            )}
          </div>
          <input
            ref={ref}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e: any) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ""
            }}
          />
        </div>
      </div>
    </Field>
  )
}

const Page = () => {
  const [settings, setSettings] = useState<SettingsState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        const full: SettingsState = {}
        for (const k of DEFAULT_KEYS) full[k] = s[k] ?? ""
        setSettings(full)
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const set = (k: string, v: string) =>
    setSettings((prev) => ({ ...prev, [k]: v }))

  const onSave = async () => {
    setSaving(true)
    try {
      const cleaned: Record<string, string> = {}
      for (const k of Object.keys(settings)) {
        cleaned[k] = settings[k] ?? ""
      }
      await saveSettings(cleaned)
      toast.success("Settings saved")
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <p>Loading settings...</p>
      </Container>
    )
  }

  return (
    <Container className="p-6">
      <div
        style={adminStickyHeader}
      >
        <div>
          <Heading>Site Settings</Heading>
          <p style={adminDescription}>
            All of these values are used dynamically across the storefront.
          </p>
        </div>
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      <Section title="General" description="Store identity & branding">
        <Field label="Site Name" help="Displayed in the header and used in the <title> tag">
          <Input
            value={settings.site_name}
            onChange={(e: any) => set("site_name", e.target.value)}
            placeholder="My Store"
          />
        </Field>
        <Field label="Tagline">
          <Input
            value={settings.site_tagline}
            onChange={(e: any) => set("site_tagline", e.target.value)}
            placeholder="Premium Fashion"
          />
        </Field>
        <ImageField
          label="Logo"
          value={settings.site_logo_url}
          onChange={(v) => set("site_logo_url", v)}
          help="If empty, Site Name is shown as text logo"
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Mobile Logo Width (px)" help="Custom width in pixels for mobile view (e.g. 100). Default is 100.">
            <Input
              type="number"
              value={settings.site_logo_width_mobile}
              onChange={(e: any) => set("site_logo_width_mobile", e.target.value)}
              placeholder="100"
            />
          </Field>
          <Field label="Desktop Logo Width (px)" help="Custom width in pixels for desktop view (e.g. 150). Default is 120.">
            <Input
              type="number"
              value={settings.site_logo_width_desktop}
              onChange={(e: any) => set("site_logo_width_desktop", e.target.value)}
              placeholder="120"
            />
          </Field>
        </div>
        <ImageField
          label="Favicon"
          value={settings.site_favicon_url}
          onChange={(v) => set("site_favicon_url", v)}
          help=".ico, .png (32x32) recommended"
        />
      </Section>

      <Section title="SEO (Homepage)" description="Default meta tags for the homepage">
        <Field label="Home Title">
          <Input
            value={settings.seo_home_title}
            onChange={(e: any) => set("seo_home_title", e.target.value)}
            placeholder="My Store | Premium Fashion"
          />
        </Field>
        <Field label="Meta Description">
          <Textarea
            value={settings.seo_home_description}
            onChange={(e: any) => set("seo_home_description", e.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Keywords">
          <Input
            value={settings.seo_home_keywords}
            onChange={(e: any) => set("seo_home_keywords", e.target.value)}
            placeholder="fashion, clothing, ..."
          />
        </Field>
        <ImageField
          label="Default OG / Social Image"
          value={settings.seo_default_og_image}
          onChange={(v) => set("seo_default_og_image", v)}
          help="Used when a page doesn't define its own OG image"
        />
      </Section>

      <Section title="Announcement Bar" description="Shown at the very top of the site">
        <Field label="Enabled">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch
              checked={settings.announcement_bar_enabled === "true"}
              onCheckedChange={(v: boolean) =>
                set("announcement_bar_enabled", v ? "true" : "false")
              }
            />
            <span style={{ fontSize: 13 }}>
              {settings.announcement_bar_enabled === "true"
                ? "Visible on the storefront"
                : "Hidden"}
            </span>
          </div>
        </Field>
        <Field
          label="Messages"
          help="One announcement per line. Multiple lines will scroll continuously as a single ticker (like the example below). Leave on a single line for a static-style ticker."
        >
          <Textarea
            value={settings.announcement_bar_text}
            onChange={(e: any) => set("announcement_bar_text", e.target.value)}
            placeholder={
              "Free shipping on orders over Rs. 2,000\n" +
              "Use code WELCOME10 for 10% off your first order\n" +
              "Cash on delivery available across Pakistan"
            }
            rows={4}
            style={{ fontFamily: "inherit", lineHeight: 1.6 }}
          />
        </Field>
        <Field
          label="Scroll speed"
          help="Pixels per second. Higher = faster. Leave blank for the default (60)."
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", maxWidth: 360 }}>
            <input
              type="range"
              min={20}
              max={150}
              step={5}
              value={Number(settings.announcement_bar_speed) || 60}
              onChange={(e: any) =>
                set("announcement_bar_speed", String(e.target.value))
              }
              style={{ flex: 1 }}
              aria-label="Ticker scroll speed"
            />
            <Input
              value={settings.announcement_bar_speed}
              onChange={(e: any) =>
                set("announcement_bar_speed", e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="60"
              style={{ width: 80, fontFamily: "monospace", textAlign: "center" }}
              inputMode="numeric"
            />
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field
            label="Background colour"
            help="Leave blank to use your theme's primary colour."
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="color"
                value={settings.announcement_bar_bg || "#1F1F1F"}
                onChange={(e: any) =>
                  set("announcement_bar_bg", e.target.value.toUpperCase())
                }
                style={{
                  width: 40,
                  height: 40,
                  border: A.border,
                  borderRadius: 8,
                  background: "transparent",
                  cursor: "pointer",
                }}
                aria-label="Announcement background colour"
              />
              <Input
                value={settings.announcement_bar_bg}
                onChange={(e: any) =>
                  set("announcement_bar_bg", e.target.value)
                }
                placeholder="#1F1F1F (or leave blank)"
                style={{ fontFamily: "monospace", fontSize: 13 }}
              />
            </div>
          </Field>
          <Field
            label="Text colour"
            help="Leave blank to use your theme's on-primary colour."
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="color"
                value={settings.announcement_bar_fg || "#FFFFFF"}
                onChange={(e: any) =>
                  set("announcement_bar_fg", e.target.value.toUpperCase())
                }
                style={{
                  width: 40,
                  height: 40,
                  border: A.border,
                  borderRadius: 8,
                  background: "transparent",
                  cursor: "pointer",
                }}
                aria-label="Announcement text colour"
              />
              <Input
                value={settings.announcement_bar_fg}
                onChange={(e: any) =>
                  set("announcement_bar_fg", e.target.value)
                }
                placeholder="#FFFFFF (or leave blank)"
                style={{ fontFamily: "monospace", fontSize: 13 }}
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Contact Information" description="Used on the contact page and footer">
        <Field label="Email">
          <Input
            value={settings.contact_email}
            onChange={(e: any) => set("contact_email", e.target.value)}
            placeholder="info@mystore.com"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={settings.contact_phone}
            onChange={(e: any) => set("contact_phone", e.target.value)}
            placeholder="+1-234-567-8900"
          />
        </Field>
        <Field label="Address">
          <Textarea
            value={settings.contact_address}
            onChange={(e: any) => set("contact_address", e.target.value)}
            rows={2}
          />
        </Field>
      </Section>

      <Section
        title="Business Profile"
        description="Drives the JSON-LD structured data (GroceryStore / Pharmacy / Store) Google indexes, and the live system prompt the AI assistant runs with. Defaults to grocery."
      >
        <Field
          label="Business type"
          help={`"grocery" (default) · "pharmacy" · "general". Controls Schema.org @type and the chatbot's domain guardrails.`}
        >
          <Input
            value={settings.business_type}
            onChange={(e: any) => set("business_type", e.target.value)}
            placeholder="grocery"
          />
        </Field>
        <Field label="Country" help="ISO 3166-1 alpha-2, e.g. PK">
          <Input
            value={settings.business_country}
            onChange={(e: any) => set("business_country", e.target.value)}
            placeholder="PK"
          />
        </Field>
        <Field label="City / locality">
          <Input
            value={settings.business_locality}
            onChange={(e: any) => set("business_locality", e.target.value)}
            placeholder="Karachi"
          />
        </Field>
        <Field label="Province / region">
          <Input
            value={settings.business_region}
            onChange={(e: any) => set("business_region", e.target.value)}
            placeholder="Sindh"
          />
        </Field>
        <Field label="Postal code">
          <Input
            value={settings.business_postal_code}
            onChange={(e: any) => set("business_postal_code", e.target.value)}
            placeholder="75500"
          />
        </Field>
        <Field
          label="Opening hours"
          help={`Schema.org spec, e.g. "Mo-Sa 09:00-22:00".`}
        >
          <Input
            value={settings.business_opening_hours}
            onChange={(e: any) => set("business_opening_hours", e.target.value)}
            placeholder="Mo-Su 09:00-22:00"
          />
        </Field>
        <Field
          label="License number"
          help="Optional. Trade or business registration number rendered in JSON-LD."
        >
          <Input
            value={settings.business_license_number}
            onChange={(e: any) => set("business_license_number", e.target.value)}
            placeholder="e.g. PK-BIZ-12345"
          />
        </Field>
        <Field
          label="Price range"
          help={`Schema.org priceRange — typically "$" / "$$" / "$$$". Defaults to "$$".`}
        >
          <Input
            value={settings.business_price_range}
            onChange={(e: any) => set("business_price_range", e.target.value)}
            placeholder="$$"
          />
        </Field>
      </Section>

      <Section title="Social Links" description="Leave blank to hide an icon">
        {[
          ["social_facebook", "Facebook"],
          ["social_instagram", "Instagram"],
          ["social_twitter", "Twitter / X"],
          ["social_youtube", "YouTube"],
          ["social_pinterest", "Pinterest"],
          ["social_tiktok", "TikTok"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <Input
              value={settings[key]}
              onChange={(e: any) => set(key, e.target.value)}
              placeholder={`https://${(label as string).toLowerCase()}.com/yourstore`}
            />
          </Field>
        ))}
      </Section>

      <Section title="Footer">
        <Field label="Copyright Text">
          <Input
            value={settings.footer_copyright}
            onChange={(e: any) => set("footer_copyright", e.target.value)}
            placeholder={`© ${new Date().getFullYear()} My Store. All Rights Reserved.`}
          />
        </Field>

      </Section>

      <Section
        title="Storefront Appearance"
        description="Controls how product cards look across the whole storefront"
      >
        <Field
          label="Product Card Aspect Ratio"
          help="Applied to every product thumbnail site-wide (home, collections, categories, related products, search)."
        >
          <select
            value={settings.product_card_aspect || "3/4"}
            onChange={(e: any) => set("product_card_aspect", e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: A.border,
              borderRadius: 6,
              fontSize: 14,
              background: A.bgField,
              color: A.fg,
            }}
          >
            {PRODUCT_CARD_ASPECTS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section
        title="Analytics & Tracking"
        description="Tracking pixels and verification snippets injected site-wide."
      >
        <Field
          label="Google Analytics ID (GA4)"
          help="Starts with 'G-'. When set, GA4 script is injected into every page."
        >
          <Input
            value={settings.google_analytics_id}
            onChange={(e: any) => set("google_analytics_id", e.target.value)}
            placeholder="G-XXXXXXXXXX"
          />
        </Field>

        <Field
          label="Meta (Facebook) Pixel ID"
          help="Numeric ID from Meta Events Manager. When set, the Pixel base code is injected and the storefront automatically forwards ViewContent, AddToCart, InitiateCheckout, Purchase and Search events."
        >
          <Input
            value={settings.meta_pixel_id}
            onChange={(e: any) => set("meta_pixel_id", e.target.value)}
            placeholder="123456789012345"
          />
        </Field>

        <Field
          label="Custom Head Code"
          help="Raw HTML injected into <head> on every page. Use for Search Console / Bing / Pinterest verification meta tags, AdSense, GTM, Hotjar, Clarity, or any other third-party snippet. Tags supported: <meta>, <link>, <script>, <noscript>. Be careful — anything you paste here runs on every page."
        >
          <Textarea
            value={settings.head_code}
            onChange={(e: any) => set("head_code", e.target.value)}
            placeholder={`<meta name="google-site-verification" content="..." />\n<script async src="https://pagead2.googlesyndication.com/..."></script>`}
            rows={8}
            style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}
          />
        </Field>
      </Section>

      <Section
        title="Homepage Content"
        description="Content shown at the very bottom of the homepage"
      >
        <Field label="Page Content (HTML supported)">
          <Textarea
            value={settings.page_home_content}
            onChange={(e: any) => set("page_home_content", e.target.value)}
            rows={10}
            placeholder="<p>Add custom homepage content or articles here...</p>"
          />
        </Field>
      </Section>

      <Section
        title="About Us Page"
        description="Content shown on the /about page"
      >
        <Field label="Page Title">
          <Input
            value={settings.page_about_title}
            onChange={(e: any) => set("page_about_title", e.target.value)}
            placeholder="About Us"
          />
        </Field>
        <Field label="Page Content (HTML supported)">
          <Textarea
            value={settings.page_about_content}
            onChange={(e: any) => set("page_about_content", e.target.value)}
            rows={10}
            placeholder="<p>Tell your brand story here...</p>"
          />
        </Field>
      </Section>

      <Section
        title="Privacy Policy Page"
        description="Content shown on the /privacy page"
      >
        <Field label="Page Title">
          <Input
            value={settings.page_privacy_title}
            onChange={(e: any) => set("page_privacy_title", e.target.value)}
            placeholder="Privacy Policy"
          />
        </Field>
        <Field label="Page Content (HTML supported)">
          <Textarea
            value={settings.page_privacy_content}
            onChange={(e: any) => set("page_privacy_content", e.target.value)}
            rows={10}
            placeholder="<p>Your privacy policy text...</p>"
          />
        </Field>
      </Section>

      <Section
        title="Disclaimer Page"
        description="Content shown on the /disclaimer page"
      >
        <Field label="Page Title">
          <Input
            value={settings.page_disclaimer_title}
            onChange={(e: any) => set("page_disclaimer_title", e.target.value)}
            placeholder="Disclaimer"
          />
        </Field>
        <Field label="Page Content (HTML supported)">
          <Textarea
            value={settings.page_disclaimer_content}
            onChange={(e: any) => set("page_disclaimer_content", e.target.value)}
            rows={10}
            placeholder="<p>Your disclaimer text...</p>"
          />
        </Field>
      </Section>

      <Section
        title="Terms & Conditions Page"
        description="Content shown on the /terms page"
      >
        <Field label="Page Title">
          <Input
            value={settings.page_terms_title}
            onChange={(e: any) => set("page_terms_title", e.target.value)}
            placeholder="Terms & Conditions"
          />
        </Field>
        <Field label="Page Content (HTML supported)">
          <Textarea
            value={settings.page_terms_content}
            onChange={(e: any) => set("page_terms_content", e.target.value)}
            rows={10}
            placeholder="<p>Your terms and conditions text...</p>"
          />
        </Field>
      </Section>

      <Section
        title="Refund & Return Policy Page"
        description="Content shown on the /refund-policy page"
      >
        <Field label="Page Title">
          <Input
            value={settings.page_refund_title}
            onChange={(e: any) => set("page_refund_title", e.target.value)}
            placeholder="Refund & Return Policy"
          />
        </Field>
        <Field label="Page Content (HTML supported)">
          <Textarea
            value={settings.page_refund_content}
            onChange={(e: any) => set("page_refund_content", e.target.value)}
            rows={10}
            placeholder="<p>Your refund and return policy text...</p>"
          />
        </Field>
      </Section>

      <Section
        title="Feature Toggles"
        description="Enable or disable storefront features. Changes take effect on next page load."
      >
        <Field label="WhatsApp Number" help="Include country code, e.g. +923001234567. Used for 'Order on WhatsApp' button on products and floating widget.">
          <Input
            value={settings.whatsapp_number}
            onChange={(e: any) => set("whatsapp_number", e.target.value)}
            placeholder="+923001234567"
          />
        </Field>
        <Field label="WhatsApp Floating Widget">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch
              checked={settings.whatsapp_widget_enabled !== "false"}
              onCheckedChange={(v: boolean) =>
                set("whatsapp_widget_enabled", v ? "true" : "false")
              }
            />
            <span style={{ fontSize: 13 }}>
              {settings.whatsapp_widget_enabled !== "false"
                ? "Floating chat bubble visible on all pages (except product pages)"
                : "Hidden"}
            </span>
          </div>
        </Field>
        <Field label="WhatsApp Buy Now Button">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch
              checked={settings.whatsapp_buy_now_enabled !== "false"}
              onCheckedChange={(v: boolean) =>
                set("whatsapp_buy_now_enabled", v ? "true" : "false")
              }
            />
            <span style={{ fontSize: 13 }}>
              {settings.whatsapp_buy_now_enabled !== "false"
                ? "Visible on product page next to Buy Now"
                : "Hidden"}
            </span>
          </div>
        </Field>
        <Field label="WhatsApp in Chatbot">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch
              checked={settings.whatsapp_chatbot_enabled !== "false"}
              onCheckedChange={(v: boolean) =>
                set("whatsapp_chatbot_enabled", v ? "true" : "false")
              }
            />
            <span style={{ fontSize: 13 }}>
              {settings.whatsapp_chatbot_enabled !== "false"
                ? "Visible in AI Shopping Assistant Chatbot"
                : "Hidden"}
            </span>
          </div>
        </Field>
        <Field label="Cart Drawer (Slide-in)" help="When enabled, clicking 'Add to Cart' opens a slide-in drawer instead of navigating to the cart page.">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch
              checked={settings.cart_drawer_enabled === "true"}
              onCheckedChange={(v: boolean) =>
                set("cart_drawer_enabled", v ? "true" : "false")
              }
            />
            <span style={{ fontSize: 13 }}>
              {settings.cart_drawer_enabled === "true" ? "Enabled" : "Disabled"}
            </span>
          </div>
        </Field>
        {settings.cart_drawer_enabled === "true" && (
          <>
            <Field label="Cross-sell in Cart Drawer" help="Show 'You may also like' products inside the cart drawer.">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Switch
                  checked={settings.cart_drawer_cross_sell_enabled !== "false"}
                  onCheckedChange={(v: boolean) =>
                    set("cart_drawer_cross_sell_enabled", v ? "true" : "false")
                  }
                />
                <span style={{ fontSize: 13 }}>
                  {settings.cart_drawer_cross_sell_enabled !== "false" ? "Show cross-sells" : "Hidden"}
                </span>
              </div>
            </Field>
            <Field label="Cross-sell Product Count">
              <select
                value={settings.cart_drawer_cross_sell_count || "4"}
                onChange={(e: any) => set("cart_drawer_cross_sell_count", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: A.border,
                  borderRadius: 6,
                  fontSize: 14,
                  background: A.bgField,
                  color: A.fg,
                }}
              >
                <option value="2">2 products</option>
                <option value="4">4 products</option>
                <option value="6">6 products</option>
                <option value="8">8 products</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Sticky Add-to-Cart Footer (Mobile)" help="On product pages, replaces the bottom navigation with a sticky add-to-cart bar.">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch
              checked={settings.sticky_pdp_bar_enabled !== "false"}
              onCheckedChange={(v: boolean) =>
                set("sticky_pdp_bar_enabled", v ? "true" : "false")
              }
            />
            <span style={{ fontSize: 13 }}>
              {settings.sticky_pdp_bar_enabled !== "false" ? "Enabled" : "Disabled"}
            </span>
          </div>
        </Field>
        <Field label="Recent Purchases Ticker" help="Shows real-time purchase notifications. Uses actual order data.">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Switch
              checked={settings.recent_purchases_ticker_enabled === "true"}
              onCheckedChange={(v: boolean) =>
                set("recent_purchases_ticker_enabled", v ? "true" : "false")
              }
            />
            <span style={{ fontSize: 13 }}>
              {settings.recent_purchases_ticker_enabled === "true" ? "Visible" : "Hidden"}
            </span>
          </div>
        </Field>
        {settings.recent_purchases_ticker_enabled === "true" && (
          <Field label="Ticker Rotation Interval" help="How often the notification changes (in seconds).">
            <select
              value={settings.recent_purchases_ticker_interval || "30"}
              onChange={(e: any) => set("recent_purchases_ticker_interval", e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: A.border,
                borderRadius: 6,
                fontSize: 14,
                background: A.bgField,
                color: A.fg,
              }}
            >
              <option value="15">Every 15 seconds</option>
              <option value="30">Every 30 seconds</option>
              <option value="45">Every 45 seconds</option>
              <option value="60">Every 60 seconds</option>
            </select>
          </Field>
        )}
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Site Settings",
})

export default Page
