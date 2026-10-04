const express = require("express");
const router = express.Router();
const {
    getBom,
    createBomItem,
    updateBomItem,
    deleteBomItem,
} = require("../controllers/bomController");

router.get("/:productId", getBom);
router.post("/", createBomItem);
router.put("/:id", updateBomItem);
router.delete("/:id", deleteBomItem);

module.exports = router;