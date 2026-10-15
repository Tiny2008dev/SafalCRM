const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const materialRoutes = require("./routes/materialRoutes");
const productRoutes = require("./routes/productRoutes");
const bomRoutes = require("./routes/bomRoutes");
const productionRoutes = require("./routes/productionRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const { authenticateToken, requireAdmin, validateAuthConfig } = require("./middleware/auth");
validateAuthConfig();

const app = express();
function authorizeCRMRequest(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    return requireAdmin(req, res, next);
}
const allowedOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001,http://localhost:5173"))
    .split(",").map((origin) => origin.trim()).filter(Boolean);
if (process.env.NODE_ENV === "production") {
    if (!allowedOrigins.length || allowedOrigins.some((origin) => !origin.startsWith("https://"))) {
        throw new Error("Production CORS_ORIGINS must list the HTTPS origins of the deployed frontends.");
    }
    const hops = Number(process.env.TRUST_PROXY_HOPS);
    if (!Number.isInteger(hops) || hops < 1) throw new Error("Set TRUST_PROXY_HOPS to the exact trusted reverse-proxy hop count in production.");
    app.set("trust proxy", hops);
    app.use((req, res, next) => req.secure ? next() : res.status(400).json({ message: "HTTPS is required." }));
}
app.use(cors({ origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
} }));
app.use(express.json({ limit: "32kb" }));

app.use("/api/enquiries", enquiryRoutes);
app.use("/api/clients", authenticateToken, authorizeCRMRequest);
app.use("/api/materials", authenticateToken, authorizeCRMRequest);
app.use("/api/products", authenticateToken, authorizeCRMRequest);
app.use("/api/bom", authenticateToken, authorizeCRMRequest);
app.use("/api/production", authenticateToken, authorizeCRMRequest);
app.use("/api/orders", authenticateToken, authorizeCRMRequest);
app.use("/api/dashboard", authenticateToken, authorizeCRMRequest);
app.use("/api/reports", authenticateToken, authorizeCRMRequest);

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bom", bomRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Safal CRM backend is running." });
});

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
});

module.exports = app;
