const db = require("../config/db");

exports.getDashboard = async(req, res) => {
    try {
        const [
            [{ totalClients }]
        ] = await db.query("SELECT COUNT(*) AS totalClients FROM clients");
        const [
            [{ totalProducts }]
        ] = await db.query("SELECT COUNT(*) AS totalProducts FROM products");
        const [
            [{ totalMaterials }]
        ] = await db.query("SELECT COUNT(*) AS totalMaterials FROM materials WHERE is_active = 1");
        const [
            [{ totalOrders }]
        ] = await db.query("SELECT COUNT(*) AS totalOrders FROM sales_orders");
        const [
            [{ lowStockMaterials }]
        ] = await db.query(
            "SELECT COUNT(*) AS lowStockMaterials FROM materials WHERE is_active = 1 AND current_stock <= minimum_stock"
        );
        const [
            [{ pendingProduction }]
        ] = await db.query(
            "SELECT COUNT(*) AS pendingProduction FROM production_orders WHERE status = 'Pending'"
        );

        const [recentOrders] = await db.query(
            `SELECT so.id, so.total_amount, so.order_date, so.status,
                    c.name AS client_name,
                  order_products.product_name
             FROM sales_orders so
             LEFT JOIN clients c ON c.id = so.client_id
              LEFT JOIN (
               SELECT si.sales_order_id,
                   GROUP_CONCAT(DISTINCT p.product_name ORDER BY p.product_name SEPARATOR ', ') AS product_name
               FROM sales_items si
               LEFT JOIN products p ON p.id = si.product_id
               GROUP BY si.sales_order_id
              ) order_products ON order_products.sales_order_id = so.id
             ORDER BY so.created_at DESC
             LIMIT 5`
        );

        const [recentProductionOrders] = await db.query(
            `SELECT po.id, po.quantity, po.production_date, po.status,
                    p.product_name
             FROM production_orders po
             LEFT JOIN products p ON p.id = po.product_id
             ORDER BY po.created_at DESC
             LIMIT 5`
        );

        const [lowStockItems] = await db.query(
            `SELECT id, material_code, material_name, current_stock, minimum_stock, unit
             FROM materials
             WHERE is_active = 1 AND current_stock <= minimum_stock
             ORDER BY current_stock ASC
             LIMIT 5`
        );

        res.json({
            totalClients,
            totalProducts,
            totalMaterials,
            lowStockMaterials,
            pendingProduction,
            totalOrders,
            recentOrders,
            recentProductionOrders,
            lowStockItems,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load dashboard data." });
    }
};