/**
 * Auth Guard Middleware — API Key Validation
 *
 * Protects the upload endpoint from unauthorized access.
 * Header: x-cdn-key: <CDN_API_KEY>
 */

import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export function authGuard(req: Request, res: Response, next: NextFunction): void {
    // If no API key is configured, skip (dev-only convenience)
    if (!env.CDN_API_KEY) {
        next();
        return;
    }

    const providedKey = req.headers["x-cdn-key"] as string | undefined;

    if (!providedKey) {
        res.status(401).json({
            success: false,
            error: "Missing x-cdn-key header. Upload requires authentication.",
        });
        return;
    }

    // Constant-time comparison to prevent timing attacks
    if (providedKey.length !== env.CDN_API_KEY.length) {
        res.status(403).json({ success: false, error: "Invalid API key." });
        return;
    }

    let mismatch = 0;
    for (let i = 0; i < providedKey.length; i++) {
        mismatch |= providedKey.charCodeAt(i) ^ env.CDN_API_KEY.charCodeAt(i);
    }

    if (mismatch !== 0) {
        res.status(403).json({ success: false, error: "Invalid API key." });
        return;
    }

    next();
}
