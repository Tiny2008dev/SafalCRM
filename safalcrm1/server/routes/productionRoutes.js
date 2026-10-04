const express = require("express");
const router = express.Router();
const {
    getProductionOrders,
    getProductionOrderById,
    createProductionOrder,
    updateProductionOrder,
} = require("../controllers/productionController");

router.get("/", getProductionOrders);
router.get("/:id", getProductionOrderById);
router.post("/", createProductionOrder);
router.put("/:id", updateProductionOrder);

module.exports = router;
module.exports = router;