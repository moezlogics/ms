const path = require("path")

module.exports = {
  darkMode: "class",
  presets: [require("@medusajs/ui-preset")],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@medusajs/ui/dist/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        width: "width margin",
        height: "height",
        bg: "background-color",
        display: "display opacity",
        visibility: "visibility",
        padding: "padding-top padding-right padding-bottom padding-left",
      },
      colors: {
        /**
         * Theme tokens — driven by CSS variables that are injected from the
         * admin /admin/theme page via getSiteSettings() in the root layout.
         * Use `primary`, `accent`, `surface`, etc. in new code. The `brand.*`
         * aliases below are kept so existing components keep working —
         * they read from the same CSS variables, so changing the theme in
         * admin updates them automatically.
         */
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          fg: "rgb(var(--color-primary-fg) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          fg: "rgb(var(--color-accent-fg) / <alpha-value>)",
        },
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          alt: "rgb(var(--color-surface-alt) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
        },
        line: "rgb(var(--color-border) / <alpha-value>)",
        // Header tokens — kept separate from page tokens so a dark header
        // on a light page (or vice versa) keeps icons/text legible.
        header: {
          DEFAULT: "rgb(var(--color-header-bg) / <alpha-value>)",
          fg: {
            DEFAULT: "rgb(var(--color-header-fg) / <alpha-value>)",
            muted: "rgb(var(--color-header-fg-muted) / <alpha-value>)",
          },
          hover: "rgb(var(--color-header-hover-bg) / <alpha-value>)",
          line: "rgb(var(--color-header-border) / <alpha-value>)",
          accent: "rgb(var(--color-header-accent) / <alpha-value>)",
        },
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",

        /* Anvogue legacy aliases — same CSS vars so they re-theme too */
        brand: {
          black: "rgb(var(--color-primary) / <alpha-value>)",
          green: "rgb(var(--color-accent) / <alpha-value>)",
          secondary: "rgb(var(--color-text-muted) / <alpha-value>)",
          secondary2: "rgb(var(--color-text-muted) / <alpha-value>)",
          surface: "rgb(var(--color-surface) / <alpha-value>)",
          line: "rgb(var(--color-border) / <alpha-value>)",
          red: "rgb(var(--color-danger) / <alpha-value>)",
          purple: "rgb(var(--color-info) / <alpha-value>)",
          success: "rgb(var(--color-success) / <alpha-value>)",
          yellow: "rgb(var(--color-warning) / <alpha-value>)",
          pink: "rgb(var(--color-danger) / <alpha-value>)",
        },
        grey: {
          0: "#FFFFFF",
          5: "#F9FAFB",
          10: "#F3F4F6",
          20: "#E5E7EB",
          30: "#D1D5DB",
          40: "#9CA3AF",
          50: "#6B7280",
          60: "#4B5563",
          70: "#374151",
          80: "#1F2937",
          90: "#111827",
        },
      },
      boxShadow: {
        "anvogue-xs": "0px 2px 2px 0px rgba(28, 36, 51, 0.10)",
        "anvogue-sm": "0px 10px 25px 0px rgba(43, 52, 74, 0.12)",
      },
      borderRadius: {
        // Override Tailwind's default scale so admin-selected radius
        // applies to every `rounded-*` class across the storefront —
        // not just the custom aliases below. Components built with
        // stock `rounded-md` / `rounded-lg` / `rounded-xl` now follow
        // the theme too. The CSS variables come from `buildTheme()`
        // in `src/lib/util/theme.ts` (admin → site-settings → :root).
        none: "0px",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-base)",
        md: "var(--radius-base)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-xl)",
        "3xl": "var(--radius-xl)",
        full: "9999px",
        // Legacy / Anvogue-named aliases — same vars so existing
        // components keep working as-is.
        soft: "var(--radius-sm)",
        base: "var(--radius-base)",
        rounded: "var(--radius-base)",
        large: "var(--radius-xl)",
        xl2: "var(--radius-xl)",
        pop: "var(--radius-lg)",
        circle: "9999px",
      },
      maxWidth: {
        "8xl": "100rem",
        anvogue: "1322px",
      },
      screens: {
        "2xsmall": "320px",
        xsmall: "512px",
        small: "1024px",
        medium: "1280px",
        large: "1440px",
        xlarge: "1680px",
        "2xlarge": "1920px",
      },
      fontSize: {
        "3xl": "2rem",
      },
      fontFamily: {
        /**
         * Drives every `font-sans` class across the storefront.
         *
         * `--font-stack` is set in `:root` (globals.css) to the
         * Instrument Sans default and overridden at runtime by the
         * inline <style id="dynamic-theme"> block in `app/layout.tsx`
         * once the admin picks a different font. We list it FIRST so
         * any admin choice (Inter, Manrope, Poppins, Playfair, etc.)
         * wins — and keep the original Instrument Sans + system stack
         * as deep fallbacks so the page never goes unstyled if a
         * Google Font request hangs.
         */
        sans: [
          "var(--font-stack)",
          "var(--font-instrument-sans)",
          "Instrument Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Ubuntu",
          "sans-serif",
        ],
        display: [
          "var(--font-stack)",
          "var(--font-instrument-sans)",
          "Instrument Sans",
          "sans-serif",
        ],
      },
      keyframes: {
        ring: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in-top": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out-top": {
          "0%": {
            height: "100%",
          },
          "99%": {
            height: "0",
          },
          "100%": {
            visibility: "hidden",
          },
        },
        "accordion-slide-up": {
          "0%": {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          "100%": {
            height: "0",
            opacity: "0",
          },
        },
        "accordion-slide-down": {
          "0%": {
            "min-height": "0",
            "max-height": "0",
            opacity: "0",
          },
          "100%": {
            "min-height": "var(--radix-accordion-content-height)",
            "max-height": "none",
            opacity: "1",
          },
        },
        enter: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        leave: {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
        "slide-in": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        ring: "ring 2.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
        "fade-in-right":
          "fade-in-right 0.3s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-in-top": "fade-in-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-out-top":
          "fade-out-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "accordion-open":
          "accordion-slide-down 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        "accordion-close":
          "accordion-slide-up 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        enter: "enter 200ms ease-out",
        "slide-in": "slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)",
        leave: "leave 150ms ease-in forwards",
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-radix")()],
}
