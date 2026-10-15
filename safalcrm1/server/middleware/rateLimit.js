const buckets = new Map();
let operations = 0;

function createRateLimiter({ keyPrefix, limit, windowMs, message }) {
    return function rateLimit(req, res, next) {
        const now = Date.now();
        const caller = String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 128);
        const key = `${keyPrefix || "default"}:${caller}`;
        let bucket = buckets.get(key);
        operations += 1;
        if (operations % 256 === 0 || buckets.size >= 10000) {
            for (const [ip, entry] of buckets) if (entry.resetAt <= now) buckets.delete(ip);
            operations = 0;
        }
        if (!bucket && buckets.size >= 10000) return res.status(429).json({ message });
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        if (bucket.count >= limit) return res.status(429).json({ message });
        bucket.count += 1;
        return next();
    };
}

const publicEnquiryLimiter = createRateLimiter({ keyPrefix: "enquiry", limit: 5, windowMs: 15 * 60 * 1000, message: "Too many enquiries. Please try again later." });
const loginLimiter = createRateLimiter({ keyPrefix: "login", limit: 10, windowMs: 15 * 60 * 1000, message: "Too many login attempts. Please try again later." });

module.exports = { publicEnquiryLimiter, loginLimiter, createRateLimiter };
