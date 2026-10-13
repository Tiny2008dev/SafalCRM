require("dotenv").config();
const app = require("./app");
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Safal CRM backend listening on http://localhost:${PORT}`);
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Please check if another backend instance is already running.`);
    } else {
        console.error("Server startup error:", err);
    }
    process.exit(1);
});