/**
 * Media Upload Route — POST /api/media/upload
 *
 * Unified media upload endpoint for images AND videos.
 *
 * Flow:
 * 1. Multer receives the file into memory (buffer).
 * 2. File signature is validated (magic bytes — blocks executables).
 * 3. Images: Sharp → WebP (full + thumb), OpenAI Vision → alt/title/caption.
 *    Videos: Saved as-is with sanitized filename.
 * 4. Returns the public URL + SEO metadata.
 *
 * Date-based folder structure (WordPress-style):
 *   uploads/2026/04/product-name-abc123.webp
 *   uploads/2026/04/product-name-abc123-thumb.webp
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";
import { env } from "../config/env";
import { authGuard } from "../middleware/auth-guard";
import { uploadRateLimiter } from "../middleware/rate-limiter";
import { validateFileSignature } from "../utils/file-signature";
import { processImage, sanitizeFilename } from "../services/image-processor";
import { generateAltText } from "../services/alt-text-generator";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "video/mp4", "video/webm", "video/quicktime",
            "application/pdf",
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    },
});

function formatToExtension(format: string): string {
    const map: Record<string, string> = {
        JPEG: "jpg", PNG: "png", WebP: "webp", GIF: "gif", BMP: "bmp",
        MP4: "mp4", MOV: "mov", WebM: "webm", AVI: "avi",
    };
    return map[format] || "bin";
}

/**
 * Get date prefix for video uploads (same as image-processor uses).
 */
function getDatePrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}/${month}`;
}

/**
 * Persist a `<filename>.meta.json` sidecar alongside every uploaded
 * media file. Stores SEO metadata (alt/title/caption + dimensions)
 * so the storefront can resolve it later without re-running the
 * AI pipeline. Failure is non-fatal — the upload still succeeds.
 */
async function writeMetaSidecar(
    relativePath: string,
    meta: Record<string, unknown>
): Promise<void> {
    try {
        const fullPath = path.join(env.UPLOAD_DIR, relativePath + ".meta.json");
        await fs.writeFile(fullPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (err: any) {
        console.warn(`[CDN] meta sidecar write failed for ${relativePath}:`, err?.message);
    }
}

// ── POST /api/media/upload ──
router.post(
    "/upload",
    uploadRateLimiter,
    authGuard,
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "media", maxCount: 1 },
        { name: "files", maxCount: 1 },
    ]),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const file = files?.["image"]?.[0] || files?.["media"]?.[0] || files?.["files"]?.[0];

            if (!file) {
                console.log("[CDN] Upload rejected: no file in request");
                res.status(400).json({
                    success: false,
                    error: 'No file uploaded. Send a file with field name "image", "media", or "files".',
                });
                return;
            }

            console.log(`[CDN] 📥 Upload received: "${file.originalname}" (${(file.buffer.length / 1024).toFixed(1)}KB, ${file.mimetype})`);

            const rawSlug =
                (req.body?.slug as string) ||
                file.originalname?.replace(/\.[^.]+$/, "") ||
                "upload";
            const slug = sanitizeFilename(rawSlug.length >= 2 ? rawSlug : "upload");

            const signatureCheck = validateFileSignature(file.buffer);
            if (!signatureCheck.valid) {
                console.log(`[CDN] Upload rejected: invalid file signature`);
                res.status(400).json({ success: false, error: signatureCheck.error });
                return;
            }

            const originalFilename =
                (req.body?.originalFilename as string) || file.originalname || undefined;

            if (signatureCheck.type === "image") {
                if (file.buffer.length > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
                    res.status(413).json({
                        success: false,
                        error: `Image exceeds maximum size of ${env.MAX_FILE_SIZE_MB}MB.`,
                    });
                    return;
                }

                // Image processing + alt-text generation in parallel
                const [result, seo] = await Promise.all([
                    processImage(file.buffer, slug, env.UPLOAD_DIR, originalFilename),
                    generateAltText(file.buffer, { originalFilename, slug }),
                ]);

                // Fallback title derived from cleaned filename.
                const fallbackTitle = result.baseName
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());

                console.log(`[CDN] ✅ Image uploaded: ${result.fullUrl}`);

                const finalTitle = seo.title || fallbackTitle;
                const imageRelative = `${result.datePrefix}/${result.filename}`;
                await writeMetaSidecar(imageRelative, {
                    alt: seo.alt,
                    title: finalTitle,
                    caption: seo.caption,
                    type: "image",
                    width: result.widthPx,
                    height: result.heightPx,
                    sizeBytes: result.sizeBytes,
                    format: signatureCheck.format,
                    originalFilename: originalFilename || null,
                    createdAt: new Date().toISOString(),
                });

                res.status(201).json({
                    success: true,
                    data: {
                        url: result.fullUrl,
                        thumbUrl: result.thumbUrl,
                        filename: imageRelative,
                        thumbFilename: `${result.datePrefix}/${result.thumbFilename}`,
                        width: result.widthPx,
                        height: result.heightPx,
                        sizeBytes: result.sizeBytes,
                        thumbSizeBytes: result.thumbSizeBytes,
                        format: signatureCheck.format,
                        type: "image",
                        originalFilename: originalFilename || null,
                        // ── SEO metadata ──
                        alt: seo.alt,
                        title: finalTitle,
                        caption: seo.caption,
                    },
                });
            } else if (signatureCheck.type === "pdf") {
                const maxPdfMB = 20;
                if (file.buffer.length > maxPdfMB * 1024 * 1024) {
                    res.status(413).json({
                        success: false,
                        error: `PDF exceeds maximum size of ${maxPdfMB}MB.`,
                    });
                    return;
                }

                const datePrefix = getDatePrefix();
                const dateDir = path.join(env.UPLOAD_DIR, datePrefix);
                await fs.mkdir(dateDir, { recursive: true });

                const shortId = nanoid(8);
                const pdfBaseName = originalFilename
                    ? sanitizeFilename(originalFilename)
                    : slug;
                const filename = `${pdfBaseName}-${shortId}.pdf`;
                const filePath = path.join(dateDir, filename);

                await fs.writeFile(filePath, file.buffer);

                console.log(`[CDN] ✅ PDF uploaded: ${datePrefix}/${filename}`);

                const pdfRelative = `${datePrefix}/${filename}`;
                const pdfTitle = pdfBaseName.replace(/-/g, " ");
                await writeMetaSidecar(pdfRelative, {
                    alt: null,
                    title: pdfTitle,
                    caption: null,
                    type: "pdf",
                    sizeBytes: file.buffer.length,
                    format: "PDF",
                    originalFilename: originalFilename || null,
                    createdAt: new Date().toISOString(),
                });

                res.status(201).json({
                    success: true,
                    data: {
                        url: `${env.CDN_PUBLIC_URL}/uploads/${pdfRelative}`,
                        thumbUrl: null,
                        filename: pdfRelative,
                        sizeBytes: file.buffer.length,
                        format: "PDF",
                        type: "pdf",
                        originalFilename: originalFilename || null,
                        alt: null,
                        title: pdfTitle,
                        caption: null,
                    },
                });
            } else {
                const maxVideoMB = 100;
                if (file.buffer.length > maxVideoMB * 1024 * 1024) {
                    res.status(413).json({
                        success: false,
                        error: `Video exceeds maximum size of ${maxVideoMB}MB.`,
                    });
                    return;
                }

                // Date-based folder for videos too
                const datePrefix = getDatePrefix();
                const dateDir = path.join(env.UPLOAD_DIR, datePrefix);
                await fs.mkdir(dateDir, { recursive: true });

                const shortId = nanoid(8);
                const ext = formatToExtension(signatureCheck.format);
                const videoBaseName = originalFilename
                    ? sanitizeFilename(originalFilename)
                    : slug;
                const filename = `${videoBaseName}-${shortId}.${ext}`;
                const filePath = path.join(dateDir, filename);

                await fs.writeFile(filePath, file.buffer);

                console.log(`[CDN] ✅ Video uploaded: ${datePrefix}/${filename}`);

                const videoRelative = `${datePrefix}/${filename}`;
                const videoTitle = videoBaseName.replace(/-/g, " ");
                await writeMetaSidecar(videoRelative, {
                    alt: null,
                    title: videoTitle,
                    caption: null,
                    type: "video",
                    sizeBytes: file.buffer.length,
                    format: signatureCheck.format,
                    originalFilename: originalFilename || null,
                    createdAt: new Date().toISOString(),
                });

                res.status(201).json({
                    success: true,
                    data: {
                        url: `${env.CDN_PUBLIC_URL}/uploads/${videoRelative}`,
                        thumbUrl: null,
                        filename: videoRelative,
                        sizeBytes: file.buffer.length,
                        format: signatureCheck.format,
                        type: "video",
                        originalFilename: originalFilename || null,
                        alt: null,
                        title: videoTitle,
                        caption: null,
                    },
                });
            }
        } catch (err: any) {
            console.error("[CDN] ❌ Upload processing failed:", err);
            if (err.code === "LIMIT_FILE_SIZE") {
                res.status(413).json({ success: false, error: "File exceeds maximum allowed size." });
                return;
            }
            res.status(500).json({ success: false, error: "Internal server error during media processing." });
        }
    }
);

// ── GET /api/media/meta ──
//
// Public read-only endpoint for resolving SEO metadata (alt/title/
// caption) for one or many CDN URLs/paths. Used by the storefront when
// rendering <img> tags to ensure every image has its AI-generated alt
// text applied. No auth — meta is non-sensitive and the underlying
// sidecar files are already publicly readable as static JSON.
//
// Query params:
//   ?path=2026/04/foo.webp                     (single)
//   ?paths=2026/04/foo.webp,2026/04/bar.webp   (batch, comma-separated)
//   ?url=https://cdn.example.com/uploads/...   (full URL — extracts path)
router.get(
    "/meta",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const single = (req.query.path as string) || "";
            const fullUrl = (req.query.url as string) || "";
            const batch = (req.query.paths as string) || "";

            const candidates: string[] = [];
            if (single) candidates.push(single);
            if (fullUrl) {
                // Strip "<base>/uploads/" prefix to get the relative path
                const m = fullUrl.match(/\/uploads\/(.+)$/);
                if (m) candidates.push(m[1]);
            }
            if (batch) {
                for (const p of batch.split(",").map((s) => s.trim()).filter(Boolean)) {
                    candidates.push(p);
                }
            }

            if (!candidates.length) {
                res.status(400).json({
                    success: false,
                    error: "Provide at least one of: path, paths, url.",
                });
                return;
            }

            const results: Record<string, any> = {};
            for (const raw of candidates) {
                const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
                if (normalized.includes("..")) continue;
                const metaPath = path.join(env.UPLOAD_DIR, normalized + ".meta.json");
                try {
                    const raw = await fs.readFile(metaPath, "utf8");
                    results[normalized] = JSON.parse(raw);
                } catch {
                    results[normalized] = null;
                }
            }

            res.setHeader("Cache-Control", "public, max-age=300");
            res.json({ success: true, data: results });
        } catch (err: any) {
            console.error("[CDN] Meta lookup failed:", err);
            res.status(500).json({ success: false, error: "Internal server error during meta lookup." });
        }
    }
);

// ── DELETE /api/media/delete ──
router.delete(
    "/delete",
    authGuard,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { filename } = req.body;
            if (!filename || typeof filename !== "string") {
                res.status(400).json({ success: false, error: 'Missing "filename" in request body.' });
                return;
            }

            // Support both flat filenames and date-prefixed paths like "2026/04/file.webp"
            const normalized = filename.replace(/\\/g, "/");

            // Security: prevent path traversal
            if (normalized.includes("..")) {
                res.status(400).json({ success: false, error: "Invalid filename. Path traversal detected." });
                return;
            }

            const fullPath = path.join(env.UPLOAD_DIR, normalized);
            const thumbPath = fullPath.replace(/(\.\w+)$/, "-thumb$1");
            const metaPath = fullPath + ".meta.json";

            let deleted = false;
            try { await fs.unlink(fullPath); deleted = true; } catch { /* ok */ }
            try { await fs.unlink(thumbPath); } catch { /* ok */ }
            try { await fs.unlink(metaPath); } catch { /* ok */ }

            console.log(`[CDN] 🗑️ Delete: ${normalized} — ${deleted ? "removed" : "not found"}`);

            res.json({ success: true, message: deleted ? "File deleted." : "File not found (may already be deleted)." });
        } catch (err: any) {
            console.error("[CDN] Delete failed:", err);
            res.status(500).json({ success: false, error: "Internal server error during file deletion." });
        }
    }
);

// ── GET /api/media/list ──
router.get(
    "/list",
    authGuard,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
            const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || "50", 10)));

            await fs.mkdir(env.UPLOAD_DIR, { recursive: true });

            // Recursively collect all files from uploads (including date subfolders)
            const allFiles = await collectFiles(env.UPLOAD_DIR, env.UPLOAD_DIR);

            // Filter out thumbnails and hidden files
            const mainFiles = allFiles.filter((f) => !f.relativePath.includes("-thumb.") && !path.basename(f.relativePath).startsWith("."));

            // Get stats to sort by date (newest first)
            const fileStatsPromises = mainFiles.map(async ({ relativePath, fullPath }) => {
                try {
                    const stats = await fs.stat(fullPath);
                    const filename = path.basename(relativePath);
                    const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(filename);

                    let thumbUrl: string | null = null;
                    if (isImage) {
                        const thumbPath = fullPath.replace(/(\.\w+)$/, "-thumb$1");
                        try {
                            await fs.stat(thumbPath);
                            const thumbRelative = relativePath.replace(/(\.\w+)$/, "-thumb$1");
                            thumbUrl = `${env.CDN_PUBLIC_URL}/uploads/${thumbRelative.replace(/\\/g, "/")}`;
                        } catch {
                            thumbUrl = null;
                        }
                    }

                    return {
                        filename: relativePath.replace(/\\/g, "/"),
                        url: `${env.CDN_PUBLIC_URL}/uploads/${relativePath.replace(/\\/g, "/")}`,
                        thumbUrl,
                        sizeBytes: stats.size,
                        createdAt: stats.birthtimeMs || stats.mtimeMs || 0,
                        type: isImage ? "image" : "video",
                    };
                } catch {
                    return null;
                }
            });

            const fileStats = ((await Promise.all(fileStatsPromises)).filter(Boolean) as any[]).sort(
                (a, b) => b.createdAt - a.createdAt
            );

            const total = fileStats.length;
            const start = (page - 1) * limit;
            const paginated = fileStats.slice(start, start + limit);

            res.json({
                success: true,
                data: { files: paginated, total, page, limit, hasMore: start + limit < total },
            });
        } catch (err: any) {
            console.error("[CDN] List media failed:", err);
            res.status(500).json({ success: false, error: "Internal server error reading media directory." });
        }
    }
);

/**
 * Recursively collect all files from a directory tree.
 * Returns relative paths from the baseDir.
 */
async function collectFiles(
    dir: string,
    baseDir: string
): Promise<{ relativePath: string; fullPath: string }[]> {
    const results: { relativePath: string; fullPath: string }[] = [];
    let entries: string[];
    try {
        entries = await fs.readdir(dir);
    } catch {
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry);
        try {
            const stat = await fs.stat(full);
            if (stat.isDirectory()) {
                const sub = await collectFiles(full, baseDir);
                results.push(...sub);
            } else {
                results.push({
                    relativePath: path.relative(baseDir, full),
                    fullPath: full,
                });
            }
        } catch {
            // skip unreadable entries
        }
    }
    return results;
}

export default router;
