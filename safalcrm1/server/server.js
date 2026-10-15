require("dotenv").config();

const { validateAuthConfig } = require("./middleware/auth");
validateAuthConfig();
const app = require("./app");
const db = require("./config/db");
db.validateDatabaseConfig();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Safal CRM backend listening on port ${PORT}`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") console.error(`Port ${PORT} is already in use. Please check if another backend instance is already running.`);
    else console.error("Server startup error:", err);
    process.exit(1);
});
