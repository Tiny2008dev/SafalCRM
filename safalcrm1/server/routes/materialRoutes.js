const express = require("express");
const router = express.Router();
const {
    getMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    restoreMaterial,
    permanentlyDeleteMaterial,
} = require("../controllers/materialController");

router.get("/", getMaterials);
router.post("/", createMaterial);
router.put("/:id", updateMaterial);
router.put("/:id/restore", restoreMaterial);
router.delete("/:id/permanent", permanentlyDeleteMaterial);
router.delete("/:id", deleteMaterial);

module.exports = router;