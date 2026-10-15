require("dotenv").config();
const crypto = require("crypto");
const { promisify } = require("util");
const db = require("../config/db");
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const key = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${key.toString("hex")}`;
}

async function main() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [users] = await connection.query("SELECT id, password FROM users FOR UPDATE");
        let updated = 0;
        for (const user of users) {
            if (typeof user.password === "string" && !user.password.startsWith("scrypt$")) {
                await connection.query("UPDATE users SET password = ? WHERE id = ?", [await hashPassword(user.password), user.id]);
                updated += 1;
            }
        }
        await connection.commit();
        console.log(`Password hash migration complete. Updated ${updated} user password(s).`);
    } catch (error) {
        await connection.rollback();
        console.error("Password hash migration failed:", error.message);
        process.exitCode = 1;
    } finally {
        connection.release();
        await db.end();
    }
}

main();
