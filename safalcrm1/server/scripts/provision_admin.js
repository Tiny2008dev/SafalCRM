require("dotenv").config({ path: process.env.PROVISION_ENV_FILE || ".env" });
const crypto = require("crypto");
const { promisify } = require("util");
const mysql = require("mysql2/promise");

const scrypt = promisify(crypto.scrypt);

async function main() {
    const { ADMIN_USERNAME: username, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
    if (!username?.trim() || !email?.trim() || typeof password !== "string" || password.length < 16 || new Set(password).size < 10 || /password|admin123|change-me/i.test(password)) {
        throw new Error("Set ADMIN_USERNAME, ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters in protected environment configuration.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || username.length > 100 || email.length > 254) {
        throw new Error("Administrator username or email is invalid.");
    }
    const config = {
        host: process.env.PROVISION_DB_HOST,
        port: process.env.PROVISION_DB_PORT ? Number(process.env.PROVISION_DB_PORT) : 3306,
        user: process.env.PROVISION_DB_USER,
        password: process.env.PROVISION_DB_PASSWORD,
        database: process.env.PROVISION_DB_NAME,
    };
    if ([config.host, config.user, config.password, config.database].some((value) => !value?.trim())) {
        throw new Error("Set PROVISION_DB_HOST, PROVISION_DB_USER, PROVISION_DB_PASSWORD, PROVISION_DB_NAME and PROVISION_DB_PORT for this one-time operation.");
    }
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        throw new Error("PROVISION_DB_PORT must be a valid port number between 1 and 65535.");
    }
    if (config.user.trim().toLowerCase() === "root") throw new Error("Use the dedicated provisioning account, not MySQL root.");
    const db = await mysql.createConnection(config);
    try {
        const [existing] = await db.execute("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1", [username.trim(), email.trim()]);
        if (existing.length) throw new Error("An account with this username or email already exists; no existing account was changed.");
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = await scrypt(password, salt, 64);
        await db.execute("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'admin')", [username.trim(), email.trim().toLowerCase(), `scrypt$${salt}$${hash.toString("hex")}`]);
        console.log("Administrator account created. Clear ADMIN_PASSWORD and PROVISION_DB_* from the provisioning environment.");
    } finally {
        await db.end();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
