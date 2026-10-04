const express = require("express");
const router = express.Router();
const {
    getClientReport,
    getInventoryReport,
    getProductReport,
    getProductionReport,
    getOrderReport,
    getOrdersAnalytics,
    getOrdersTimeSeries,
    getOrdersByClient,
    getOrdersByProduct,
    getFilteredOrders,
    getClientAnalytics,
    getOrderAnalytics,
    getProductAnalytics,
    getProductionAnalytics,
    getInventoryAnalytics,
    getAllAlerts,
    getReportsOverview,
} = require("../controllers/reportController");

router.get("/", getReportsOverview);
router.get("/clients", getClientReport);
router.get("/inventory", getInventoryReport);
router.get("/products", getProductReport);
router.get("/production", getProductionReport);
router.get("/orders", getOrderReport);
router.get("/orders/analytics", getOrdersAnalytics);
router.get("/orders/timeseries", getOrdersTimeSeries);
router.get("/orders/by-client", getOrdersByClient);
router.get("/orders/by-product", getOrdersByProduct);
router.get("/orders/detailed", getFilteredOrders);
router.get("/client/:clientId/analytics", getClientAnalytics);
router.get("/order/:orderId/analytics", getOrderAnalytics);
router.get("/product/:productId/analytics", getProductAnalytics);
router.get("/production/analytics", getProductionAnalytics);
router.get("/inventory/analytics", getInventoryAnalytics);
router.get("/lookup", getAllAlerts);

module.exports = router;