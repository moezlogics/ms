/**
 * Image Processor — Sharp-based WebP Conversion Pipeline
 *
 * WordPress-style naming with date-based folders:
 *   Full:  uploads/2026/04/{sanitized-name}-{shortId}.webp
 *   Thumb: uploads/2026/04/{sanitized-name}-{shortId}-thumb.webp
 *
 * Date prefix + nanoid(8) guarantees uniqueness so two files with
 * the same original name never collide.
 *
 * Features:
 *   - EXIF auto-rotate (handles phone uploads)
 *   - Progressive WebP with configurable quality
 *   - Thumbnail generation (400px default)
 *   - SEO-friendly slug filenames
 *   - Date-organised folder structure (year/month)
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { nanoid } from "nanoid";
import { env } from "../config/env";

export interface ProcessedImage {
    filename: string;
    thumbFilename: string;
    fullPath: string;
    thumbPath: string;
    fullUrl: string;
    thumbUrl: string;
    widthPx: number;
    heightPx: number;
    sizeBytes: number;
    thumbSizeBytes: number;
    baseName: string;
    /** Relative path inside uploads dir, e.g. "2026/04" */
    datePrefix: string;
}

/**
 * Sanitize a raw string into an SEO-friendly slug.
 * Strips file extension, lowercases, removes diacritics,
 * keeps only a-z, 0-9, hyphens.
 *
 * Examples:
 *   "My Product Image.jpg"     → "my-product-image"
 *   "Ünïcödé Tëst (1).png"    → "unicode-test-1"
 *   "___weird---name   .webp"  → "weird-name"
 */
export function sanitizeFilename(raw: string): string {
    const withoutExt = raw.replace(/\.[^.]+$/, "");
    return (
        withoutExt
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
            .replace(/[^a-z0-9\s-]/g, "")      // keep only safe chars
            .replace(/\s+/g, "-")               // spaces → hyphens
            .replace(/-+/g, "-")                // collapse multiple hyphens
            .replace(/^-|-$/g, "")              // trim leading/trailing
            .substring(0, 80) || "image"
    );
}

/**
 * Get date prefix like "2026/04" for WordPress-style folder organisation.
 */
function getDatePrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}/${month}`;
}

/**
 * Build a guaranteed-unique filename by checking the filesystem.
 * Tries up to 5 times with nanoid(8), then falls back to nanoid(12).
 */
function buildUniqueName(baseName: string, dateDir: string) {
    for (let i = 0; i < 5; i++) {
        const shortId = nanoid(8);
        const filename = `${baseName}-${shortId}.webp`;
        const thumbFilename = `${baseName}-${shortId}-thumb.webp`;
        if (!fsSync.existsSync(path.join(dateDir, filename))) {
            return { filename, thumbFilename, shortId };
        }
    }
    // Extremely unlikely fallback — use longer ID
    const shortId = nanoid(12);
    return {
        filename: `${baseName}-${shortId}.webp`,
        thumbFilename: `${baseName}-${shortId}-thumb.webp`,
        shortId,
    };
}

/**
 * Processes, compresses, and saves an uploaded image.
 *
 * @param buffer           - Raw file buffer from Multer
 * @param slug             - Fallback slug (e.g., "product-name")
 * @param uploadDir        - Absolute path to the root uploads directory
 * @param originalFilename - Original filename from the uploader (for SEO slug)
 * @returns ProcessedImage with URLs, paths, and metadata
 */
export async function processImage(
    buffer: Buffer,
    slug: string,
    uploadDir: string,
    originalFilename?: string
): Promise<ProcessedImage> {
    // Date-based subfolder: uploads/2026/04/
    const datePrefix = getDatePrefix();
    const dateDir = path.join(uploadDir, datePrefix);
    await fs.mkdir(dateDir, { recursive: true });

    // WordPress-style: use original name as base, fall back to slug
    const baseName = originalFilename
        ? sanitizeFilename(originalFilename)
        : sanitizeFilename(slug);
    const { filename, thumbFilename } = buildUniqueName(baseName, dateDir);

    const fullPath = path.join(dateDir, filename);
    const thumbPath = path.join(dateDir, thumbFilename);

    // Pipeline 1: Full-size WebP (auto-rotate based on EXIF for phone uploads)
    const fullResult = await sharp(buffer)
        .rotate()
        .resize({ width: env.MAX_WIDTH, withoutEnlargement: true, fit: "inside" })
        .webp({ quality: env.WEBP_QUALITY, effort: 6, smartSubsample: true })
        .toFile(fullPath);

    // Pipeline 2: Thumbnail WebP
    const thumbResult = await sharp(buffer)
        .rotate()
        .resize({ width: env.THUMB_WIDTH, withoutEnlargement: true, fit: "inside" })
        .webp({ quality: Math.max(env.WEBP_QUALITY - 5, 75), effort: 6, smartSubsample: true })
        .toFile(thumbPath);

    console.log(`[CDN] ✅ Processed: ${datePrefix}/${filename} (${fullResult.width}×${fullResult.height}, ${(fullResult.size / 1024).toFixed(1)}KB)`);

    return {
        filename,
        thumbFilename,
        fullPath,
        thumbPath,
        fullUrl: `${env.CDN_PUBLIC_URL}/uploads/${datePrefix}/${filename}`,
        thumbUrl: `${env.CDN_PUBLIC_URL}/uploads/${datePrefix}/${thumbFilename}`,
        widthPx: fullResult.width,
        heightPx: fullResult.height,
        sizeBytes: fullResult.size,
        thumbSizeBytes: thumbResult.size,
        baseName,
        datePrefix,
    };
}
