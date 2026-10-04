const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const db = require("../config/db");

const applyMigration = async() => {
    try {
        const [columns] = await db.query("SHOW COLUMNS FROM materials LIKE 'is_active'");
        if (columns.length > 0) {
            console.log("materials.is_active already exists.");
            return;
        }

        await db.query(
            "ALTER TABLE materials ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER client_id"
        );
        console.log("Added materials.is_active; existing materials remain active.");
    } catch (error) {
        console.error("Material archive migration failed:", error.code || error.message);
        process.exitCode = 1;
    } finally {
        await db.end();
    }
};

applyMigration();