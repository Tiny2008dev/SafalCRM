const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const materialRoutes = require("./routes/materialRoutes");
const productRoutes = require("./routes/productRoutes");
const bomRoutes = require("./routes/bomRoutes");
const productionRoutes = require("./routes/productionRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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