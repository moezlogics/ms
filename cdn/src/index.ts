/**
 * Ecomm CDN Server — Self-hosted Image Processing & Serving
 *
 * Architecture:
 * ┌────────────────────────────────────────────────────────┐
 * │                    Express Server                      │
 * │                                                        │
 * │  POST /api/media/upload                                │
 * │    → Rate Limiter (30/min/IP)                         │
 * │    → Auth Guard (x-cdn-key header)                    │
 * │    → Multer (memory buffer)                           │
 * │    → File Signature Validator (magic bytes)           │
 * │    → Sharp Pipeline (WebP + thumbnail)                │
 * │    → Disk Write → Return URL                          │
 * │                                                        │
 * │  GET /uploads/*                                        │
 * │    → express.static with immutable cache headers      │
 * │                                                        │
 * │  GET /health                                           │
 * │    → { status: "ok", uptime, memory }                 │
 * └────────────────────────────────────────────────────────┘
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { env } from "./config/env";
import mediaRoutes from "./routes/media";

const app = express();

// ── Security Hardening ──
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) { callback(null, true); return; }
        if (env.CORS_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} is not allowed.`));
        }
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-cdn-key", "Authorization"],
}));

app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

// ── Ensure uploads directory exists ──
if (!fs.existsSync(env.UPLOAD_DIR)) {
    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    console.log(`📁 Created uploads directory: ${env.UPLOAD_DIR}`);
}

// ── Static file serving with immutable caching ──
app.use(
    "/uploads",
    express.static(env.UPLOAD_DIR, {
        maxAge: "365d",
        immutable: true,
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.setHeader("X-Content-Type-Options", "nosniff");
            // Force inline display so opening a CDN URL in a new tab previews
            // the image/video in the browser instead of downloading it.
            // .meta.json sidecars are an exception — they're metadata only.
            if (!filePath.endsWith(".meta.json")) {
                res.setHeader("Content-Disposition", "inline");
            }
        },
    })
);

// ── API Routes ──
app.use("/api/media", mediaRoutes);

// ── Health Check ──
app.get("/health", (_req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
        status: "ok",
        service: "ecomm-cdn",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        memory: {
            rssBytes: memUsage.rss,
            heapUsedBytes: memUsage.heapUsed,
            heapTotalBytes: memUsage.heapTotal,
        },
    });
});

// ── 404 Handler ──
app.use((_req, res) => {
    res.status(404).json({ success: false, error: "Route not found." });
});

// ── Global Error Handler ──
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[CDN] Unhandled error:", err);
    res.status(500).json({ success: false, error: "Internal server error." });
});

// ── Start Server ──
app.listen(env.PORT, () => {
    console.log("");
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║          🖼️  Ecomm CDN Server Started            ║");
    console.log("╠══════════════════════════════════════════════════╣");
    console.log(`║  Port:        ${String(env.PORT).padEnd(35)}║`);
    console.log(`║  Public URL:  ${env.CDN_PUBLIC_URL.padEnd(35)}║`);
    console.log(`║  Upload Dir:  ${env.UPLOAD_DIR.substring(0, 35).padEnd(35)}║`);
    console.log(`║  Max Size:    ${(env.MAX_FILE_SIZE_MB + "MB").padEnd(35)}║`);
    console.log(`║  WebP Quality: ${(env.WEBP_QUALITY + "%").padEnd(34)}║`);
    console.log(`║  API Key:     ${(env.CDN_API_KEY ? "✅ Configured" : "⚠️ UNPROTECTED").padEnd(35)}║`);
    console.log("╚══════════════════════════════════════════════════╝");
    console.log("");
});

export default app;
