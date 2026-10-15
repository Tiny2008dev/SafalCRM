const crypto = require("crypto");

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const developmentSecret = crypto.randomBytes(48).toString("hex");

function validRole(role) {
    return typeof role === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,49}$/.test(role);
}

function getSigningSecret(env = process.env) {
    const secret = env.JWT_SECRET;
    if (typeof secret !== "string" || secret.length < 32 || new Set(secret).size < 12 || /(replace|change|example|generate|random|placeholder|your[-_ ]|todo)/i.test(secret) || /^(.)\1{20,}$/i.test(secret)) return null;
    return secret;
}

function validateAuthConfig(env = process.env) {
    if (env.NODE_ENV === "production" && !getSigningSecret(env)) {
        throw new Error("JWT_SECRET must be configured with at least 32 non-placeholder characters in production.");
    }
}

function signingSecret() {
    return getSigningSecret() || (process.env.NODE_ENV === "production" ? null : developmentSecret);
}

function issueToken(user) {
    const secret = signingSecret();
    if (!secret) throw new Error("A valid JWT_SECRET is required to issue tokens.");
    if (!Number.isSafeInteger(user?.id) || user.id < 1 || !validRole(user?.role)) throw new Error("Cannot issue a token with invalid claims.");
    const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

function unauthorized(res) {
    return res.status(401).json({ message: "Invalid or expired session." });
}

function authenticateToken(req, res, next) {
    const secret = signingSecret();
    if (!secret) return unauthorized(res);
    const [scheme, token, extra] = String(req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token || extra) return unauthorized(res);
    const [payload, signature, trailing] = token.split(".");
    if (!payload || !signature || trailing || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(signature)) return unauthorized(res);
    const expected = crypto.createHmac("sha256", secret).update(payload).digest();
    let received;
    try { received = Buffer.from(signature, "base64url"); } catch { return unauthorized(res); }
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return unauthorized(res);
    try {
        const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        const keys = Object.keys(user).sort().join(",");
        if (keys !== "exp,id,role" || !Number.isSafeInteger(user.id) || user.id < 1 || !validRole(user.role) || !Number.isSafeInteger(user.exp) || user.exp <= Date.now()) return unauthorized(res);
        req.user = { id: user.id, role: user.role };
        return next();
    } catch { return unauthorized(res); }
}

function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Administrator access required." });
    return next();
}

module.exports = { issueToken, authenticateToken, requireAdmin, validateAuthConfig, getSigningSecret };
