const express = require("express");
const router = express.Router();
const {
    getMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
} = require("../controllers/materialController");

router.get("/", getMaterials);
router.post("/", createMaterial);
router.put("/:id", updateMaterial);
router.delete("/:id", deleteMaterial);

module.exports = router;