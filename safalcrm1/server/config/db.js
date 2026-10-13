require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "safal_crm",
    waitForConnections: true,
    connectionLimit: 10,
});

const db = pool.promise();

const ensureClientTableColumns = async () => {
    try {
        const [columns] = await db.query("SHOW COLUMNS FROM clients");
        const existingColumns = new Set(columns.map((column) => column.Field));
        const pendingColumns = [];

        if (!existingColumns.has("gstin")) {
            pendingColumns.push("ADD COLUMN gstin VARCHAR(20) AFTER company_name");
        }
        if (!existingColumns.has("office_address")) {
            pendingColumns.push("ADD COLUMN office_address VARCHAR(255) AFTER gstin");
        }
        if (!existingColumns.has("godown_address")) {
            pendingColumns.push("ADD COLUMN godown_address VARCHAR(255) AFTER office_address");
        }

        for (const columnStatement of pendingColumns) {
            await db.query(`ALTER TABLE clients ${columnStatement}`);
        }

        if (pendingColumns.length > 0) {
            console.log(`Client schema updated: ${pendingColumns.length} column(s) added.`);
        }
    } catch (error) {
        console.error("Client schema check failed:", error.message);
        throw error;
    }
};

db.ensureClientTableColumns = ensureClientTableColumns;

module.exports = db;