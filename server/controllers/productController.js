const db = require("../config/db");

const parsePrice = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const mapProduct = (row) => ({
    id: row.id,
    product_code: row.product_code,
    product_name: row.product_name,
    size: row.size,
    description: row.description,
    selling_price: row.selling_price,
    created_at: row.created_at,
});

const productCodeExists = async(productCode, excludedId = null) => {
    const sql = excludedId ?
        "SELECT id FROM products WHERE product_code = ? AND id != ?" :
        "SELECT id FROM products WHERE product_code = ?";
    const params = excludedId ? [productCode, excludedId] : [productCode];
    const [rows] = await db.query(sql, params);
    return rows.length > 0;
};

const validateProduct = ({ product_code, product_name, size, selling_price }) => {
    const errors = [];

    if (!product_code || !product_code.toString().trim()) {
        errors.push("Product code is required.");
    }
    if (!product_name || !product_name.toString().trim()) {
        errors.push("Product name is required.");
    }
    if (!size || !size.toString().trim()) {
        errors.push("Size is required.");
    }

    const sellingPrice = parsePrice(selling_price);
    if (sellingPrice === null || sellingPrice < 0) {
        errors.push("Selling price must be 0 or greater.");
    }

    return { errors, sellingPrice };
};

exports.getProducts = async(req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM products ORDER BY created_at DESC");
        res.json(rows.map(mapProduct));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load products." });
    }
};

exports.createProduct = async(req, res) => {
    const { product_code, product_name, size, description, selling_price } = req.body;
    const { errors, sellingPrice } = validateProduct({
        product_code,
        product_name,
        size,
        selling_price,
    });

    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") });
    }

    try {
        if (await productCodeExists(product_code)) {
            return res.status(400).json({ message: "Product code must be unique." });
        }

        const [result] = await db.query(
            "INSERT INTO products (product_code, product_name, size, description, selling_price) VALUES (?, ?, ?, ?, ?)", [
                product_code.toString().trim(),
                product_name.toString().trim(),
                size.toString().trim(),
                description ? description.toString().trim() : null,
                sellingPrice,
            ]
        );

        const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [result.insertId]);
        res.status(201).json(mapProduct(rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to add product." });
    }
};

exports.updateProduct = async(req, res) => {
    const { id } = req.params;
    const { product_code, product_name, size, description, selling_price } = req.body;
    const { errors, sellingPrice } = validateProduct({
        product_code,
        product_name,
        size,
        selling_price,
    });

    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") });
    }

    try {
        const [existing] = await db.query("SELECT id FROM products WHERE id = ?", [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        if (await productCodeExists(product_code, id)) {
            return res.status(400).json({ message: "Product code must be unique." });
        }

        await db.query(
            "UPDATE products SET product_code = ?, product_name = ?, size = ?, description = ?, selling_price = ? WHERE id = ?", [
                product_code.toString().trim(),
                product_name.toString().trim(),
                size.toString().trim(),
                description ? description.toString().trim() : null,
                sellingPrice,
                id,
            ]
        );

        const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
        res.json(mapProduct(rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to update product." });
    }
};

exports.deleteProduct = async(req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query("DELETE FROM products WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found." });
        }
        res.json({ message: "Product deleted." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to delete product." });
    }
};