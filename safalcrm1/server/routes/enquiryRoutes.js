const express = require("express");
const crypto = require("crypto");
const db = require("../config/db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { publicEnquiryLimiter } = require("../middleware/rateLimit");
const router = express.Router();
const statuses = new Set(["New", "Contacted", "Qualified", "Closed"]);

function clean(value, max) {
    if (typeof value !== "string") return "";
    return value.replace(/[<>\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

router.post("/", publicEnquiryLimiter, async (req, res) => {
    const companyName = clean(req.body.companyName, 150);
    const contactPerson = clean(req.body.contactPerson, 120);
    const email = clean(req.body.email, 254).toLowerCase();
    const phone = clean(req.body.phone, 40);
    const productInterest = clean(req.body.productInterest, 200);
    const message = clean(req.body.message, 3000);
    const idempotencyKey = typeof req.body.idempotencyKey === "string" ? req.body.idempotencyKey.trim() : "";
    const quantity = req.body.quantity === "" || req.body.quantity == null ? null : Number(req.body.quantity);
    if (!companyName || !contactPerson || !email || !productInterest || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ message: "Company, contact person, valid email, product interest, and message are required." });
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) return res.status(400).json({ message: "A valid submission key is required. Please refresh the form and try again." });
    if (req.body.phone && !phone) return res.status(400).json({ message: "Enter a valid phone number." });
    if (quantity !== null && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000000))
        return res.status(400).json({ message: "Quantity must be a whole number between 1 and 10,000,000." });
    const submissionHash = crypto.createHash("sha256").update(idempotencyKey).digest("hex");
    try {
        const [result] = await db.query(
            "INSERT INTO b2b_enquiries (company_name, contact_person, email, phone, product_interest, quantity, message, submission_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [companyName, contactPerson, email, phone || null, productInterest, quantity, message, submissionHash]
        );
        return res.status(201).json({ message: "Thank you. Your enquiry has been received.", id: result.insertId });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            try {
                const [rows] = await db.query("SELECT id FROM b2b_enquiries WHERE submission_key = ? LIMIT 1", [submissionHash]);
                if (rows.length) return res.status(200).json({ message: "This enquiry has already been received.", id: rows[0].id, duplicate: true });
            } catch { /* Report through the generic response below. */ }
        }
        console.error("Enquiry submission failed:", error.message);
        return res.status(500).json({ message: "We could not submit your enquiry. Please try again later." });
    }
});

router.get("/", authenticateToken, async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 150) : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    if (status && !statuses.has(status)) return res.status(400).json({ message: "A valid enquiry status is required." });
    const conditions = [];
    const values = [];
    if (status) {
        conditions.push("status = ?");
        values.push(status);
    }
    if (search) {
        conditions.push("(company_name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR product_interest LIKE ?)");
        const term = `%${search}%`;
        values.push(term, term, term, term);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    try {
        const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM b2b_enquiries${where}`, values);
        const [rows] = await db.query(
            `SELECT id, company_name, contact_person, email, phone, product_interest, quantity, message, status, created_at FROM b2b_enquiries${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );
        return res.json({ enquiries: rows, limit, offset, total: Number(count.total) });
    } catch (error) {
        console.error("Enquiry retrieval failed:", error.message);
        return res.status(500).json({ message: "Unable to load enquiries." });
    }
});

router.patch("/:id/status", authenticateToken, requireAdmin, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const status = clean(req.body.status, 20);
    if (!Number.isInteger(id) || id < 1 || !statuses.has(status)) return res.status(400).json({ message: "A valid enquiry ID and status are required." });
    try {
        const [result] = await db.query("UPDATE b2b_enquiries SET status = ? WHERE id = ?", [status, id]);
        if (!result.affectedRows) return res.status(404).json({ message: "Enquiry not found." });
        return res.json({ message: "Enquiry status updated." });
    } catch (error) {
        console.error("Enquiry status update failed:", error.message);
        return res.status(500).json({ message: "Unable to update enquiry status." });
    }
});

module.exports = router;
