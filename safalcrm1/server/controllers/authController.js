const db = require("../config/db");
const crypto = require("crypto");
const { promisify } = require("util");
const { issueToken } = require("../middleware/auth");
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const key = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${key.toString("hex")}`;
}

async function passwordMatches(stored, supplied) {
    if (!stored.startsWith("scrypt$")) return stored === supplied;
    const [, salt, expectedHex] = stored.split("$");
    const expected = Buffer.from(expectedHex, "hex");
    const actual = await scrypt(supplied, salt, expected.length);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

exports.loginUser = async (req, res) => {
    const identifier = String(req.body.identifier ?? req.body.email ?? req.body.username ?? "").trim();
    const { password } = req.body;
    if (!identifier || typeof password !== "string" || !password) return res.status(400).json({ message: "Email or username and password are required." });
    try {
        const [rows] = await db.query("SELECT id, username, email, password, role FROM users WHERE email = ? OR username = ?", [identifier, identifier]);
        if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials." });
        const user = rows[0];
        if (!(await passwordMatches(user.password, password))) return res.status(401).json({ message: "Invalid credentials." });
        if (!user.password.startsWith("scrypt$")) await db.query("UPDATE users SET password = ? WHERE id = ?", [await hashPassword(password), user.id]);
        return res.json({ id: user.id, username: user.username, email: user.email, role: user.role, token: issueToken(user) });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json({ message: "Unable to process login." });
    }
};
