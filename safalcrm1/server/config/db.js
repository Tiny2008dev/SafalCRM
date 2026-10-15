require("dotenv").config();
const mysql = require("mysql2");

function validateDatabaseConfig(env = process.env) {
    if (env.NODE_ENV !== "production") return;
    const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter((key) => !env[key]?.trim());
    if (missing.length) throw new Error(`Required production database settings are missing: ${missing.join(", ")}.`);
    if (env.DB_USER.trim().toLowerCase() === "root") throw new Error("The CRM application must use a dedicated non-root MySQL account in production.");
    if (/(replace|placeholder|change|example|your[-_ ]|todo)/i.test(env.DB_PASSWORD)) throw new Error("DB_PASSWORD must be set to a real protected credential in production.");
}

validateDatabaseConfig();
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "safal_crm",
    waitForConnections: true,
    connectionLimit: 10,
});

const db = pool.promise();

db.validateDatabaseConfig = validateDatabaseConfig;

module.exports = db;
