import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
    PORT: parseInt(process.env.PORT || "3061", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    CDN_PUBLIC_URL: process.env.CDN_PUBLIC_URL || "http://localhost:3061",
    CDN_API_KEY: process.env.CDN_API_KEY || "",
    UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || "./uploads"),
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10),
    WEBP_QUALITY: parseInt(process.env.WEBP_QUALITY || "90", 10),
    MAX_WIDTH: parseInt(process.env.MAX_WIDTH || "1920", 10),
    THUMB_WIDTH: parseInt(process.env.THUMB_WIDTH || "400", 10),
    CORS_ORIGINS: (process.env.CORS_ORIGINS || "http://localhost:3060,http://localhost:3062,http://localhost:3061")
        .split(",")
        .map((o) => o.trim()),

    // ── Auto SEO ──
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENAI_ALT_MODEL: process.env.OPENAI_ALT_MODEL || "gpt-4o-mini",
    AUTO_ALT_ENABLED: (process.env.AUTO_ALT_ENABLED || "true").toLowerCase() === "true",
    AUTO_ALT_LANG: process.env.AUTO_ALT_LANG || "en",
    AUTO_ALT_MAX_CHARS: parseInt(process.env.AUTO_ALT_MAX_CHARS || "250", 10),
} as const;

// Fail-fast: CDN_API_KEY is mandatory in production
if (!env.CDN_API_KEY) {
    console.warn(
        "⚠️  CDN_API_KEY is not set. Upload endpoint is UNPROTECTED. Set it in .env for production."
    );
}

if (env.AUTO_ALT_ENABLED && !env.OPENAI_API_KEY) {
    console.warn(
        "⚠️  AUTO_ALT_ENABLED=true but OPENAI_API_KEY is missing. Alt-text generation will be skipped (alt=null)."
    );
}
