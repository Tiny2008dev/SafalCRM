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
    product_date: row.product_date,
    expiry_date: row.expiry_date,
    client_id: row.client_id,
    client_name: row.client_name || null,
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

const isValidDate = (value) => !value || (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
);

const validateProduct = ({ product_code, product_name, size, selling_price, client_id, product_date, expiry_date }) => {
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
    if (!isValidDate(product_date)) errors.push("Date must be a valid calendar date.");
    if (!isValidDate(expiry_date)) errors.push("Expiry date must be a valid calendar date.");
    if (product_date && expiry_date && expiry_date < product_date) errors.push("Expiry date cannot be earlier than the product date.");

    const clientId = client_id === "" || client_id === null || client_id === undefined ? null : Number(client_id);
    if (clientId !== null && (!Number.isInteger(clientId) || clientId <= 0)) errors.push("Client is invalid.");
    return { errors, sellingPrice, clientId };
};

const clientExists = async (id) => (await db.query("SELECT id FROM clients WHERE id = ?", [id]))[0].length > 0;

exports.getProducts = async(req, res) => {
    try {
        const [rows] = await db.query("SELECT p.*, c.name AS client_name FROM products p LEFT JOIN clients c ON c.id = p.client_id ORDER BY p.created_at DESC");
        res.json(rows.map(mapProduct));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load products." });
    }
};

exports.createProduct = async(req, res) => {
    const { product_code, product_name, size, description, selling_price, product_date, expiry_date, client_id } = req.body;
    const { errors, sellingPrice, clientId } = validateProduct({
        product_code,
        product_name,
        size,
        selling_price,
        product_date,
        expiry_date,
        client_id,
    });

    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") });
    }

    try {
        if (await productCodeExists(product_code)) {
            return res.status(400).json({ message: "Product code must be unique." });
        }
        if (clientId && !(await clientExists(clientId))) return res.status(400).json({ message: "Client is invalid." });

        const [result] = await db.query(
            "INSERT INTO products (product_code, product_name, size, description, selling_price, product_date, expiry_date, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                product_code.toString().trim(),
                product_name.toString().trim(),
                size.toString().trim(),
                description ? description.toString().trim() : null,
                sellingPrice,
                product_date || null,
                expiry_date || null,
                clientId,
            ]
        );

        const [rows] = await db.query("SELECT p.*, c.name AS client_name FROM products p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = ?", [result.insertId]);
        res.status(201).json(mapProduct(rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to add product." });
    }
};

exports.updateProduct = async(req, res) => {
    const { id } = req.params;
    const { product_code, product_name, size, description, selling_price, product_date, expiry_date, client_id } = req.body;
    const { errors, sellingPrice, clientId } = validateProduct({
        product_code,
        product_name,
        size,
        selling_price,
        product_date,
        expiry_date,
        client_id,
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
        if (clientId && !(await clientExists(clientId))) return res.status(400).json({ message: "Client is invalid." });

        await db.query(
            "UPDATE products SET product_code = ?, product_name = ?, size = ?, description = ?, selling_price = ?, product_date = ?, expiry_date = ?, client_id = ? WHERE id = ?", [
                product_code.toString().trim(),
                product_name.toString().trim(),
                size.toString().trim(),
                description ? description.toString().trim() : null,
                sellingPrice,
                product_date || null,
                expiry_date || null,
                clientId,
                id,
            ]
        );

        const [rows] = await db.query("SELECT p.*, c.name AS client_name FROM products p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = ?", [id]);
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
