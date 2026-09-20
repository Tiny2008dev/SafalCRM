const express = require("express");
const router = express.Router();
const {
    getClientReport,
    getInventoryReport,
    getProductReport,
    getProductionReport,
    getOrderReport,
} = require("../controllers/reportController");

router.get("/clients", getClientReport);
router.get("/inventory", getInventoryReport);
router.get("/products", getProductReport);
router.get("/production", getProductionReport);
router.get("/orders", getOrderReport);

module.exports = router;