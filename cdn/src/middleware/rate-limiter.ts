/**
 * Rate Limiter — Prevents upload abuse.
 * Limits: 30 uploads per minute per IP address.
 */

import rateLimit from "express-rate-limit";

export const uploadRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many upload requests. Limit: 30 per minute. Please try again later.",
    },
    keyGenerator: (req) => {
        return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
            || req.ip
            || "unknown";
    },
});
