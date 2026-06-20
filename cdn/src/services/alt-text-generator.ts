/**
 * Alt Text Generator — OpenAI Vision (gpt-4o-mini)
 *
 * Generates SEO-optimized alt/title/caption for an image buffer.
 * Uses GPT-4o-mini's vision capability to analyse the image content
 * and produce keyword-rich, e-commerce-ready metadata.
 *
 * Features:
 *   - Downscales image to 512px for cheaper/faster inference
 *   - E-commerce focused prompts (products, categories, brands)
 *   - Supports English & Urdu responses
 *   - Retry logic (1 retry on transient failures)
 *   - Non-blocking: any failure returns null values — uploads never break
 */

import OpenAI from "openai";
import sharp from "sharp";
import { env } from "../config/env";

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
    if (!env.AUTO_ALT_ENABLED || !env.OPENAI_API_KEY) return null;
    if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    return client;
}

export interface AltTextResult {
    alt: string | null;
    title: string | null;
    caption: string | null;
}

function truncate(text: string, max: number): string {
    const clean = text.replace(/\s+/g, " ").trim().replace(/^["']|["']$/g, "");
    if (clean.length <= max) return clean;
    return clean.substring(0, max - 1).replace(/[,;:.\s][^,;:.\s]*$/, "") + "…";
}

/**
 * Attempt an OpenAI call with 1 retry on transient errors.
 */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        const status = err?.status || err?.response?.status;
        // Retry on 429 (rate limit), 500, 502, 503 (transient server errors)
        if (status && [429, 500, 502, 503].includes(status)) {
            console.warn(`[CDN] ${label}: retrying after ${status}...`);
            await new Promise((r) => setTimeout(r, 1500));
            return await fn();
        }
        throw err;
    }
}

export async function generateAltText(
    buffer: Buffer,
    context?: { originalFilename?: string; slug?: string }
): Promise<AltTextResult> {
    const c = getClient();
    if (!c) {
        console.log("[CDN] Alt-text: skipped (disabled or no API key)");
        return { alt: null, title: null, caption: null };
    }

    try {
        // Downscale the image for cheaper/faster vision inference.
        const small = await sharp(buffer)
            .rotate()
            .resize({ width: 1024, withoutEnlargement: true, fit: "inside" })
            .jpeg({ quality: 90 })
            .toBuffer();

        const dataUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
        const hint = context?.originalFilename || context?.slug || "";

        const langInstruction = env.AUTO_ALT_LANG.toLowerCase().startsWith("ur")
            ? "Respond in Urdu."
            : env.AUTO_ALT_LANG.toLowerCase().startsWith("en")
            ? "Respond in English."
            : `Respond in language code: ${env.AUTO_ALT_LANG}.`;

        const completion = await withRetry(
            () =>
                c.chat.completions.create({
                    model: env.OPENAI_ALT_MODEL,
                    temperature: 0.2,
                    max_tokens: 400,
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an expert SEO copywriter for a premium e-commerce store. " +
                                "You write image metadata that ranks exceptionally well in Google Image Search and provides excellent accessibility. " +
                                "Return STRICT JSON with exactly these keys: alt, title, caption. " +
                                `alt: Write a detailed, highly descriptive, keyword-rich description (under ${env.AUTO_ALT_MAX_CHARS} characters). ` +
                                "Analyze the product package/item thoroughly. Identify and include: " +
                                "1. Brand/Manufacturer name (e.g. Nestle, Apple, L'Oreal) if visible. " +
                                "2. Exact product name, flavor, variant, or model (e.g. Fruita Vitals Orange Juice, iPhone 15 Pro Max Natural Titanium). " +
                                "3. Net weight, volume, or pack size (e.g. 1-litre, 250g, Pack of 6) if visible. " +
                                "4. Packaging description: colors, design, container type (bottle, carton, glass jar, box, bag, pouch). " +
                                "5. Visual setting: plain background, held in hand, showing texture, front view, etc. " +
                                "Do NOT use generic filler words like 'image of', 'photo of', 'picture of'. Do not sound spammy; write naturally. " +
                                "title: 4-8 words in Title Case — a clean, professional e-commerce product title. " +
                                "caption: one engaging marketing sentence (max 200 chars). " +
                                langInstruction,
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text:
                                        "Generate SEO metadata for this e-commerce image." +
                                        (hint ? ` Original filename hint: "${hint}".` : "") +
                                        " Focus on what's in the image — product, style, color, brand. " +
                                        ' Avoid generic filler words like "image", "picture", "photo".',
                                },
                                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                            ],
                        },
                    ],
                }),
            "alt-text"
        );

        const raw = completion.choices?.[0]?.message?.content?.trim() || "{}";
        let parsed: any = {};
        try {
            parsed = JSON.parse(raw);
        } catch {
            console.warn("[CDN] Alt-text: failed to parse JSON response:", raw.substring(0, 200));
            return { alt: null, title: null, caption: null };
        }

        const result = {
            alt: typeof parsed.alt === "string" ? truncate(parsed.alt, env.AUTO_ALT_MAX_CHARS) : null,
            title: typeof parsed.title === "string" ? truncate(parsed.title, 70) : null,
            caption: typeof parsed.caption === "string" ? truncate(parsed.caption, 200) : null,
        };

        console.log(`[CDN] ✅ Alt-text generated: "${result.alt}" | title: "${result.title}"`);
        return result;
    } catch (err: any) {
        console.warn("[CDN] ⚠️ Alt-text generation failed (upload continues):", err?.message || err);
        return { alt: null, title: null, caption: null };
    }
}
