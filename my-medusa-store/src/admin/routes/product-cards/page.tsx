import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, toast } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { fetchSettings, saveSettings } from "../../lib/settings-sdk"
import { A } from "../../lib/admin-theme"
import { sdk } from "../../lib/sdk"
import {
  PRODUCT_CARD_VARIANTS,
  DEFAULT_PRODUCT_CARD_VARIANT,
  type ProductCardVariantMeta,
} from "../../lib/product-card-variants"

/**
 * Sample product data used to render the preview cards. Using a
 * generic unsplash/placeholder image avoids coupling this admin page
 * to any specific product in the catalog.
 */
const SAMPLE = {
  title: "Cotton poplin wide-leg trousers",
  price: "PKR 4,200",
  original: "PKR 5,500",
  discount: 24,
  image:
    "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=70",
  secondary:
    "https://images.unsplash.com/photo-1584276433295-4b59fdbe9ee3?auto=format&fit=crop&w=800&q=70",
  eyebrow: "Resort '26",
}

/* ------------------------------------------------------------------ */
/* Preview cards — lightweight HTML/CSS mockups of each storefront    */
/* variant. Not meant to be pixel-perfect, just close enough that an  */
/* operator can tell them apart at a glance.                           */
/* ------------------------------------------------------------------ */

const imgBox: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "3 / 4",
  overflow: "hidden",
  background: "#f5f5f4",
}

const img: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
}

const Badge = ({
  children,
  bg = "#1f1f1f",
  fg = "#fff",
  round = 3,
}: {
  children: React.ReactNode
  bg?: string
  fg?: string
  round?: number
}) => (
  <span
    style={{
      fontSize: 9,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      background: bg,
      color: fg,
      padding: "2px 6px",
      borderRadius: round,
      display: "inline-block",
    }}
  >
    {children}
  </span>
)



const PreviewMinimal = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div style={{ ...imgBox, borderRadius: 10 }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        <Badge bg="#171717">New</Badge>
        <Badge bg="#dc2626">Sale</Badge>
      </div>
    </div>
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, color: "#1f1f1f", lineHeight: 1.35 }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{data.price}</span>
      </div>
    </div>
  </div>
)

const PreviewEditorial = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div style={{ ...imgBox, borderRadius: 6 }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 10, left: 10 }}>
        <Badge bg="#fff" fg="#1f1f1f" round={999}>−{data.discount}%</Badge>
      </div>
    </div>
    <div style={{ marginTop: 12, textAlign: "center" }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5 }}>
        {data.eyebrow}
      </div>
      <div style={{ fontSize: 13, color: "#1f1f1f", marginTop: 3, fontWeight: 500 }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
        <span style={{ fontSize: 12, color: "#dc2626" }}>{data.price}</span>
      </div>
    </div>
  </div>
)

const PreviewBoxed = ({ data }: { data: typeof SAMPLE }) => (
  <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
    <div style={{ ...imgBox, borderRadius: 0 }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <Badge bg="#171717">New</Badge>
      </div>
    </div>
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#1f1f1f", lineHeight: 1.35 }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>{data.price}</span>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
      </div>
    </div>
  </div>
)

const PreviewLuxe = ({ data }: { data: typeof SAMPLE }) => (
  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
    <div style={{ ...imgBox, borderRadius: 0 }}>
      <img src={data.image} style={img} alt="" />
    </div>
    <div style={{ position: "absolute", top: 10, left: 10 }}>
      <Badge bg="#171717" round={999}>New</Badge>
    </div>

    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: 12,
        paddingTop: 40,
        background: "linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,0))",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: "#fff", lineHeight: 1.3 }}>{data.title}</div>
      <div style={{ fontSize: 12, color: "#fff", marginTop: 3, fontWeight: 600 }}>{data.price}</div>
    </div>
  </div>
)

const PreviewHoverReveal = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div style={{ ...imgBox, borderRadius: 10 }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 10, left: 10 }}>
        <Badge bg="#dc2626" round={999}>−{data.discount}%</Badge>
      </div>

      <div
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 10,
          background: "#fff",
          color: "#1f1f1f",
          borderRadius: 999,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,.15)",
        }}
      >
        👁  View product
      </div>
    </div>
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#1f1f1f", lineHeight: 1.35 }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{data.price}</span>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
      </div>
    </div>
  </div>
)

const PreviewCompact = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div style={{ ...imgBox, borderRadius: 6 }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 6, left: 6 }}>
        <Badge bg="#dc2626" round={3}>−{data.discount}%</Badge>
      </div>
    </div>
    <div style={{ marginTop: 6 }}>
      <div
        style={{
          fontSize: 12,
          color: "#1f1f1f",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {data.title}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>{data.price}</span>
        <span style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
      </div>
    </div>
  </div>
)

const PreviewSpotlight = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div
      style={{
        ...imgBox,
        borderRadius: 16,
        boxShadow: "0 18px 40px -18px rgba(31,31,31,0.25)",
      }}
    >
      <img src={data.image} style={img} alt="" />
      {/* Circular discount chip */}
      <div style={{ position: "absolute", top: 10, left: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#dc2626",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            boxShadow: "0 4px 10px rgba(220,38,38,0.35)",
            border: "2px solid #fff",
          }}
        >
          −{data.discount}%
        </span>
      </div>
      {/* Glow ring */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          boxShadow: "inset 0 0 0 1px rgba(31,31,31,0.12)",
          pointerEvents: "none",
        }}
      />
    </div>
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#1f1f1f" }}>
        {data.title}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#dc2626" }}>
            {data.price}
          </span>
          <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>
            {data.original}
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "#696c70",
          }}
        >
          Shop →
        </span>
      </div>
    </div>
  </div>
)

const PreviewSplitFrame = ({ data }: { data: typeof SAMPLE }) => (
  <div
    style={{
      borderRadius: 16,
      border: "1px solid #e9e9e9",
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
    }}
  >
    <div style={{ ...imgBox, borderRadius: 0 }}>
      <img src={data.image} style={img} alt="" />
      {/* Ribbon */}
      <div style={{ position: "absolute", top: 10, left: 10 }}>
        <Badge bg="#dc2626">−{data.discount}%</Badge>
      </div>
    </div>
    <div
      style={{
        position: "relative",
        padding: "12px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 14,
          bottom: 14,
          width: 3,
          borderRadius: 9999,
          background: "#1f1f1f",
          opacity: 0.7,
        }}
      />
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 8 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1f1f1f",
            lineHeight: 1.35,
            marginBottom: 4,
          }}
        >
          {data.title}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#dc2626" }}>
            {data.price}
          </span>
          <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>
            {data.original}
          </span>
        </div>
      </div>
      <span
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "#f7f7f7",
          color: "#1f1f1f",
          fontSize: 13,
        }}
      >
        →
      </span>
    </div>
  </div>
)

const PreviewShowcase = ({ data }: { data: typeof SAMPLE }) => (
  <div
    style={{
      position: "relative",
      width: "100%",
      aspectRatio: "3 / 4",
      borderRadius: 16,
      overflow: "hidden",
      background: "#111",
    }}
  >
    <img src={data.image} style={img} alt="" />
    {/* Dark scrim */}
    <span
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 70%)",
        pointerEvents: "none",
      }}
    />
    {/* Badges */}
    <div
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <Badge bg="#fff" fg="#1f1f1f">✨ New</Badge>
      <Badge bg="#dc2626">−{data.discount}% OFF</Badge>
    </div>
    {/* Title + price overlay */}
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: 14,
        color: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.35,
          textShadow: "0 2px 8px rgba(0,0,0,0.55)",
        }}
      >
        {data.title}
      </div>
      <div
        style={{
          marginTop: 4,
          display: "flex",
          gap: 6,
          alignItems: "baseline",
          textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700 }}>{data.price}</span>
        <span style={{ fontSize: 11, opacity: 0.65, textDecoration: "line-through" }}>
          {data.original}
        </span>
      </div>
    </div>
  </div>
)

const PreviewMedicinePill = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div
      style={{
        ...imgBox,
        borderRadius: 22,
        border: "1px solid #d1fae5",
        background: "#f0fdf4",
      }}
    >
      <img src={data.image} style={img} alt="" />
      {/* In-stock pulse */}
      <div style={{ position: "absolute", top: 10, left: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            background: "rgba(255,255,255,0.95)",
            color: "#047857",
            padding: "3px 8px",
            borderRadius: 999,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 0 3px rgba(16,185,129,0.3)",
            }}
          />
          In Stock
        </span>
      </div>
      {/* Discount circle */}
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#f43f5e",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            border: "2px solid #fff",
            boxShadow: "0 3px 8px rgba(244,63,94,0.35)",
          }}
        >
          −{data.discount}%
        </span>
      </div>
      {/* Cart icon CTA */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "#059669",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          boxShadow: "0 4px 10px rgba(5,150,105,0.35)",
        }}
      >
        🛒
      </div>
    </div>
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1f1f1f" }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "baseline" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#047857" }}>{data.price}</span>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>
          {data.original}
        </span>
      </div>
    </div>
  </div>
)

const PreviewTechSpec = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div
      style={{
        ...imgBox,
        borderRadius: 10,
        background: "#020617",
        boxShadow: "0 0 0 1px rgba(34,211,238,0.5), 0 18px 40px -18px rgba(34,211,238,0.4)",
      }}
    >
      <img src={data.image} style={img} alt="" />
      {/* Corner brackets */}
      <span style={{ position: "absolute", top: 6, left: 6, width: 10, height: 10, borderTop: "1px solid #22d3ee", borderLeft: "1px solid #22d3ee" }} />
      <span style={{ position: "absolute", top: 6, right: 6, width: 10, height: 10, borderTop: "1px solid #22d3ee", borderRight: "1px solid #22d3ee" }} />
      <span style={{ position: "absolute", bottom: 6, left: 6, width: 10, height: 10, borderBottom: "1px solid #22d3ee", borderLeft: "1px solid #22d3ee" }} />
      <span style={{ position: "absolute", bottom: 6, right: 6, width: 10, height: 10, borderBottom: "1px solid #22d3ee", borderRight: "1px solid #22d3ee" }} />
      {/* Badges */}
      <div style={{ position: "absolute", top: 12, left: 14, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.6, background: "#22d3ee", color: "#020617", padding: "2px 6px", borderRadius: 2, fontFamily: "monospace" }}>
          ⚡ NEW
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.6, background: "#f43f5e", color: "#fff", padding: "2px 6px", borderRadius: 2, fontFamily: "monospace" }}>
          −{data.discount}% OFF
        </span>
      </div>
    </div>
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1f1f1f", textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace" }}>
        {data.title}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "baseline" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1f1f1f", fontFamily: "monospace" }}>
          {data.price}
        </span>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through", fontFamily: "monospace" }}>
          {data.original}
        </span>
      </div>
      {/* CTA bar */}
      <div
        style={{
          marginTop: 8,
          height: 32,
          borderRadius: 6,
          background: "#020617",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.6,
          fontFamily: "monospace",
        }}
      >
        Add to Cart →
      </div>
    </div>
  </div>
)

const PreviewFashionDrape = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div style={{ ...imgBox, aspectRatio: "3 / 4", borderRadius: 0, background: "#fafaf9" }}>
      <img src={data.image} style={img} alt="" />
      {/* Minimal text badges */}
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: 2.5, color: "#1c1917" }}>
          New In
        </span>
        <span style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: 2.5, color: "#be123c" }}>
          −{data.discount}% Off
        </span>
      </div>
      {/* Quick shop bar at bottom */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255,255,255,0.95)",
          color: "#1c1917",
          textAlign: "center",
          padding: "10px 0",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 2.2,
        }}
      >
        + Quick Shop
      </div>
    </div>
    <div style={{ marginTop: 12, display: "flex", justifycontent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "#1c1917", fontFamily: "Georgia, serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {data.title}
        </div>
        <div style={{ marginTop: 3, display: "flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontSize: 12, color: "#44403c", fontFamily: "Georgia, serif" }}>{data.price}</span>
          <span style={{ fontSize: 10, color: "#a8a29e", textDecoration: "line-through" }}>{data.original}</span>
        </div>
      </div>
      {/* Swatches */}
      <div style={{ display: "flex", marginLeft: 0 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: ["#1c1917", "#a8a29e", "#fde68a"][i],
              border: "2px solid #fff",
              marginLeft: i === 0 ? 0 : -4,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          />
        ))}
      </div>
    </div>
    <div style={{ marginTop: 6, fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: 2.2, color: "#78716c" }}>
      Shop →
    </div>
  </div>
)

const PreviewShopify = ({ data }: { data: typeof SAMPLE }) => (
  <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
    <div style={{ ...imgBox, borderRadius: 0, aspectRatio: "3 / 4" }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <Badge bg="#171717">New</Badge>
        <Badge bg="#dc2626">Save {data.discount}%</Badge>
        <Badge bg="#2563eb">Express</Badge>
      </div>
    </div>
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#1f1f1f", lineHeight: 1.4 }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#171717" }}>{data.price}</span>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
      </div>
    </div>
  </div>
)

const PreviewShopUs = ({ data }: { data: typeof SAMPLE }) => (
  <div style={{ border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "rgba(149, 157, 165, 0.1) 0px 4px 12px" }}>
    <div style={{ ...imgBox, borderRadius: 0, aspectRatio: "3 / 4" }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <Badge bg="#AE1C9A">New</Badge>
        <Badge bg="#dc2626">−{data.discount}%</Badge>
      </div>
    </div>
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 2, color: "#f59e0b", fontSize: 12, marginBottom: 6 }}>
        <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#232532", lineHeight: 1.4 }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#AE1C9A" }}>{data.price}</span>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
      </div>
    </div>
  </div>
)

const PreviewPixio = ({ data }: { data: typeof SAMPLE }) => (
  <div>
    <div style={{ ...imgBox, borderRadius: 20 }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 16, left: 16 }}>
        <Badge bg="#fff" fg="#171717" round={30}>Get {data.discount}% Off</Badge>
      </div>
    </div>
    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1f1f1f", width: "70%", lineHeight: 1.4 }}>{data.title}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1f1f1f" }}>{data.price}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</div>
      </div>
    </div>
  </div>
)

const PreviewShopifyBold = ({ data }: { data: typeof SAMPLE }) => (
  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
    <div style={{ ...imgBox, borderRadius: 0, aspectRatio: "3 / 4" }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <Badge bg="#171717">New</Badge>
        <Badge bg="#e11d48">Sale {data.discount}%</Badge>
      </div>
    </div>
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#171717", lineHeight: 1.4 }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#e11d48" }}>{data.price}</span>
        <span style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
      </div>
      <div style={{ marginTop: 10, background: "#171717", color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase", textAlign: "center", padding: "8px 0", borderRadius: 4 }}>
        Add to Cart
      </div>
    </div>
  </div>
)

const PreviewShopifyGrid = ({ data }: { data: typeof SAMPLE }) => (
  <div style={{ border: "1px solid #f3f4f6", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
    <div style={{ ...imgBox, borderRadius: 0, aspectRatio: "4 / 5" }}>
      <img src={data.image} style={img} alt="" />
      <div style={{ position: "absolute", top: 8, left: 8 }}>
        <Badge bg="#e11d48">Save {data.discount}%</Badge>
      </div>
    </div>
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#9ca3af", marginBottom: 3 }}>BRAND</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1f1f1f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.title}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "baseline" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#e11d48" }}>{data.price}</span>
        <span style={{ fontSize: 10, color: "#9ca3af", textDecoration: "line-through" }}>{data.original}</span>
      </div>
    </div>
  </div>
)

const PREVIEW_COMPONENTS: Record<string, ({ data }: { data: typeof SAMPLE }) => JSX.Element> = {
  minimal: PreviewMinimal,
  editorial: PreviewEditorial,
  boxed: PreviewBoxed,
  luxe: PreviewLuxe,
  "hover-reveal": PreviewHoverReveal,
  compact: PreviewCompact,
  spotlight: PreviewSpotlight,
  "split-frame": PreviewSplitFrame,
  showcase: PreviewShowcase,
  "medicine-pill": PreviewMedicinePill,
  "tech-spec": PreviewTechSpec,
  "fashion-drape": PreviewFashionDrape,
  shopify: PreviewShopify,
  shopus: PreviewShopUs,
  pixio: PreviewPixio,
  "shopify-bold": PreviewShopifyBold,
  "shopify-grid": PreviewShopifyGrid,
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const ProductCardsPage = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initial, setInitial] = useState<string>(DEFAULT_PRODUCT_CARD_VARIANT)
  const [selected, setSelected] = useState<string>(DEFAULT_PRODUCT_CARD_VARIANT)
  const [sampleData, setSampleData] = useState<typeof SAMPLE>(SAMPLE)

  useEffect(() => {
    // Load setting
    fetchSettings()
      .then((s) => {
        const v = s.product_card_variant?.trim() || DEFAULT_PRODUCT_CARD_VARIANT
        setInitial(v)
        setSelected(v)
      })
      .catch((e) => {
        toast.error("Failed to load settings: " + (e as Error).message)
      })

    // Fetch real product preview data
    sdk.client.fetch("/admin/products", { query: { limit: 1 } })
      .then((res: any) => {
        const p = res.products?.[0]
        if (p) {
          const v = p.variants?.[0]
          const prices = v?.prices || []
          const pObj = prices[0]
          let priceStr = "PKR 4,200"
          let origStr = "PKR 5,500"
          let discPct = 24
          if (pObj) {
            const amt = typeof pObj.amount === "number" ? pObj.amount : parseFloat(pObj.amount)
            const currency = (pObj.currency_code || "PKR").toUpperCase()
            priceStr = `${currency} ${amt.toLocaleString()}`
            origStr = `${currency} ${(Math.round(amt * 1.3)).toLocaleString()}`
            discPct = 23
          }
          setSampleData({
            title: p.title || SAMPLE.title,
            price: priceStr,
            original: origStr,
            discount: discPct,
            image: p.thumbnail || p.images?.[0]?.url || SAMPLE.image,
            secondary: p.images?.[1]?.url || p.thumbnail || SAMPLE.secondary,
            eyebrow: p.collection?.title || SAMPLE.eyebrow,
          })
        }
      })
      .catch((e) => {
        console.warn("Failed to load real product preview", e)
      })
      .finally(() => setLoading(false))
  }, [])

  const dirty = useMemo(() => selected !== initial, [selected, initial])

  const onSave = async () => {
    setSaving(true)
    try {
      await saveSettings({ product_card_variant: selected })
      setInitial(selected)
      toast.success("Product card design saved — refresh the storefront to see it live.")
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-0 overflow-hidden">
      {/* Header */}
      <div
        style={{
          padding: 20,
          borderBottom: A.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          background: A.bgCard,
        }}
      >
        <div>
          <Heading>Product Card Design</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Pick how every product preview looks across the storefront — shop grid, featured rails, search results, related products.
          </Text>
        </div>
        <Button variant="primary" onClick={onSave} disabled={saving || loading || !dirty}>
          {saving ? "Saving..." : dirty ? "Save design" : "Saved"}
        </Button>
      </div>

      {/* Grid */}
      <div style={{ padding: 20, background: A.bgSubtle }}>
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {PRODUCT_CARD_VARIANTS.map((variant: ProductCardVariantMeta) => {
              const active = variant.key === selected
              const Preview = PREVIEW_COMPONENTS[variant.key]
              return (
                <button
                  key={variant.key}
                  onClick={() => setSelected(variant.key)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    background: A.bgCard,
                    borderRadius: 12,
                    border: active ? "2px solid " + A.fg : A.border,
                    padding: 14,
                    boxShadow: active
                      ? "0 6px 20px rgba(0,0,0,.08)"
                      : "0 1px 2px rgba(0,0,0,.03)",
                    transition: "all .15s ease",
                    position: "relative",
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "#1f1f1f",
                        color: "#fff",
                        borderRadius: 999,
                        width: 22,
                        height: 22,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        zIndex: 2,
                      }}
                    >
                      ✓
                    </span>
                  )}

                  {/* Preview */}
                  <div style={{ pointerEvents: "none" }}>
                    {Preview ? <Preview data={sampleData} /> : null}
                  </div>

                  {/* Meta */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: A.fg }}>
                        {variant.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 0.6,
                          background: A.bgField,
                          color: A.fgSubtle,
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {variant.tag}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: A.fgSubtle, lineHeight: 1.5 }}>
                      {variant.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: A.border,
          background: A.bgCard,
          fontSize: 12,
          color: A.fgSubtle,
          lineHeight: 1.5,
        }}
      >
        💡 Changes take effect immediately on the storefront (ISR cache is 60s). Hard-refresh the site if the new design doesn’t appear right away.
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Product Cards",
})

export default ProductCardsPage
