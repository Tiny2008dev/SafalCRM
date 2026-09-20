const db = require("../config/db");

const safeNumber = (value) => Number(value || 0);

exports.getClientReport = async(req, res) => {
    try {
        const [
            [{ totalClients }]
        ] = await db.query(
            "SELECT COUNT(*) AS totalClients FROM clients"
        );

        const [clients] = await db.query(
            "SELECT id, name, email, phone, created_at FROM clients ORDER BY created_at DESC"
        );

        res.json({
            totalClients: safeNumber(totalClients),
            clients,
        });
    } catch (error) {
        console.error("Client Report Error:", error);
        res.status(500).json({
            message: "Unable to load client report.",
        });
    }
};

exports.getInventoryReport = async(req, res) => {
    try {
        const [
            [{ totalMaterials }]
        ] = await db.query(
            "SELECT COUNT(*) AS totalMaterials FROM materials"
        );

        const [
            [{ currentStock }]
        ] = await db.query(
            "SELECT COALESCE(SUM(current_stock), 0) AS currentStock FROM materials"
        );

        const [
            [{ minimumStock }]
        ] = await db.query(
            "SELECT COALESCE(SUM(minimum_stock), 0) AS minimumStock FROM materials"
        );

        const [lowStockMaterials] = await db.query(
            `SELECT id, material_code, material_name, current_stock, minimum_stock, unit
             FROM materials
             WHERE current_stock <= minimum_stock
             ORDER BY current_stock ASC, material_name ASC`
        );

        res.json({
            totalMaterials: safeNumber(totalMaterials),
            currentStock: safeNumber(currentStock),
            minimumStock: safeNumber(minimumStock),
            lowStockMaterials,
        });
    } catch (error) {
        console.error("Inventory Report Error:", error);
        res.status(500).json({
            message: "Unable to load inventory report.",
        });
    }
};

exports.getProductReport = async(req, res) => {
    try {
        const [
            [{ totalProducts }]
        ] = await db.query(
            "SELECT COUNT(*) AS totalProducts FROM products"
        );

        const [products] = await db.query(
            `SELECT id, product_code, product_name, size, selling_price, description, created_at
             FROM products
             ORDER BY created_at DESC`
        );

        res.json({
            totalProducts: safeNumber(totalProducts),
            products,
        });
    } catch (error) {
        console.error("Product Report Error:", error);
        res.status(500).json({
            message: "Unable to load product report.",
        });
    }
};

exports.getProductionReport = async(req, res) => {
    try {
        const [
            [summary]
        ] = await db.query(
            `SELECT
                COUNT(*) AS totalProduction,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
             FROM production_orders`
        );

        res.json({
            totalProduction: safeNumber(summary && summary.totalProduction),
            pending: safeNumber(summary && summary.pending),
            completed: safeNumber(summary && summary.completed),
            cancelled: safeNumber(summary && summary.cancelled),
        });
    } catch (error) {
        console.error("Production Report Error:", error);
        res.status(500).json({
            message: "Unable to load production report.",
        });
    }
};

exports.getOrderReport = async(req, res) => {
    try {
        const [
            [summary]
        ] = await db.query(
            `SELECT
                COUNT(*) AS totalOrders,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'Processing' THEN 1 ELSE 0 END) AS processing,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
                COALESCE(SUM(total_amount), 0) AS totalOrderAmount
             FROM sales_orders`
        );

        res.json({
            totalOrders: safeNumber(summary && summary.totalOrders),
            pending: safeNumber(summary && summary.pending),
            processing: safeNumber(summary && summary.processing),
            completed: safeNumber(summary && summary.completed),
            cancelled: safeNumber(summary && summary.cancelled),
            totalOrderAmount: safeNumber(summary && summary.totalOrderAmount),
        });
    } catch (error) {
        console.error("Order Report Error:", error);
        res.status(500).json({
            message: "Unable to load order report.",
        });
    }
};