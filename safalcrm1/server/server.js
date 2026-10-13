
require("dotenv").config();

const app = require("./app");
const db = require("./config/db");

const PORT = process.env.PORT || 5000;

db.ensureClientTableColumns()
    .then(() => {
        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log(`Safal CRM backend listening on http://localhost:${PORT}`);
        });

        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                console.error(
                    `Port ${PORT} is already in use. Please check if another backend instance is already running.`
                );
            } else {
                console.error("Server startup error:", err);
            }
            process.exit(1);
        });
    })
    .catch((error) => {
        console.error("Failed to initialize database schema:", error.message);
        process.exit(1);
    });
