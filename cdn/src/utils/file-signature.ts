/**
 * File Signature Validator — Magic Byte Analysis
 *
 * Prevents malware execution by validating the actual file content
 * against known image/video format signatures.
 *
 * Supported formats:
 *   Images: JPEG, PNG, WebP, GIF, BMP
 *   Videos: MP4, MOV, WebM, AVI
 */

interface SignatureRule {
    name: string;
    type: "image" | "video" | "pdf";
    magic: number[];
    offset: number;
}

const ALLOWED_SIGNATURES: SignatureRule[] = [
    // ── Images ──
    { name: "JPEG", type: "image", magic: [0xff, 0xd8, 0xff], offset: 0 },
    { name: "PNG", type: "image", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
    { name: "WebP", type: "image", magic: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    { name: "GIF", type: "image", magic: [0x47, 0x49, 0x46, 0x38], offset: 0 },
    { name: "BMP", type: "image", magic: [0x42, 0x4d], offset: 0 },
    // ── Videos ──
    { name: "MP4", type: "video", magic: [0x66, 0x74, 0x79, 0x70], offset: 4 },
    { name: "MOV", type: "video", magic: [0x6d, 0x6f, 0x6f, 0x76], offset: 4 },
    { name: "WebM", type: "video", magic: [0x1a, 0x45, 0xdf, 0xa3], offset: 0 },
    { name: "AVI", type: "video", magic: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    // ── PDFs ──
    { name: "PDF", type: "pdf", magic: [0x25, 0x50, 0x44, 0x46], offset: 0 },
];

export function validateFileSignature(
    buffer: Buffer
): { valid: true; format: string; type: "image" | "video" | "pdf" } | { valid: false; error: string } {
    if (!buffer || buffer.length < 12) {
        return { valid: false, error: "File is too small to validate (< 12 bytes)." };
    }

    for (const rule of ALLOWED_SIGNATURES) {
        const slice = buffer.subarray(rule.offset, rule.offset + rule.magic.length);
        const matches = rule.magic.every((byte, i) => slice[i] === byte);
        if (matches) {
            if (rule.magic[0] === 0x52 && rule.magic[1] === 0x49) {
                const typeSlice = buffer.subarray(8, 12);
                const isWebP = typeSlice[0] === 0x57 && typeSlice[1] === 0x45 &&
                    typeSlice[2] === 0x42 && typeSlice[3] === 0x50;
                const isAvi = typeSlice[0] === 0x41 && typeSlice[1] === 0x56 &&
                    typeSlice[2] === 0x49 && typeSlice[3] === 0x20;
                if (isWebP) return { valid: true, format: "WebP", type: "image" };
                if (isAvi) return { valid: true, format: "AVI", type: "video" };
                return { valid: true, format: rule.name, type: rule.type };
            }
            return { valid: true, format: rule.name, type: rule.type };
        }
    }

    const hexDump = Array.from(buffer.subarray(0, 12))
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ");

    return {
        valid: false,
        error: `Unsupported file type. Expected JPEG, PNG, WebP, GIF, MP4, MOV, WebM, or PDF but got signature: [${hexDump}].`,
    };
}
