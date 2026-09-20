const db = require("../config/db");

const toNumber = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getProductMaterialRows = async(productId) => {
    const [rows] = await db.query(
        `SELECT
            b.id,
            b.product_id,
            b.material_id,
            b.quantity AS quantity_required,
            b.unit,
            b.created_at,
            m.material_name,
            m.material_code
         FROM bom b
         LEFT JOIN materials m
            ON m.id = b.material_id
         WHERE b.product_id = ?
         ORDER BY b.created_at DESC`, [productId]
    );

    return rows;
};

const validateBomInput = ({
    product_id,
    material_id,
    quantity_required
}) => {
    const errors = [];

    if (!product_id || Number(product_id) <= 0) {
        errors.push("Product is required.");
    }

    if (!material_id || Number(material_id) <= 0) {
        errors.push("Material is required.");
    }

    const quantity = toNumber(quantity_required);

    if (quantity === null || quantity <= 0) {
        errors.push("Quantity must be greater than 0.");
    }

    return {
        errors,
        quantity
    };
};

const productExists = async(id) => {
    const [rows] = await db.query(
        "SELECT id FROM products WHERE id = ?", [id]
    );

    return rows.length > 0;
};

const getMaterial = async(id) => {
    const [rows] = await db.query(
        `SELECT id, material_name, material_code, unit
         FROM materials
         WHERE id = ?`, [id]
    );

    return rows.length > 0 ? rows[0] : null;
};

const bomItemExistsForProductAndMaterial = async(
    productId,
    materialId,
    excludedId = null
) => {
    let sql;
    let params;

    if (excludedId) {
        sql = `
            SELECT id
            FROM bom
            WHERE product_id = ?
              AND material_id = ?
              AND id != ?
        `;

        params = [
            productId,
            materialId,
            excludedId
        ];
    } else {
        sql = `
            SELECT id
            FROM bom
            WHERE product_id = ?
              AND material_id = ?
        `;

        params = [
            productId,
            materialId
        ];
    }

    const [rows] = await db.query(sql, params);

    return rows.length > 0;
};

const mapBomItem = (row) => ({
    id: row.id,
    product_id: row.product_id,
    material_id: row.material_id,
    quantity_required: row.quantity_required,
    unit: row.unit,
    material_name: row.material_name,
    material_code: row.material_code,
    created_at: row.created_at
});

exports.getBom = async(req, res) => {
    const { productId } = req.params;
    const parsedProductId = Number(productId);

    if (!Number.isInteger(parsedProductId) ||
        parsedProductId <= 0
    ) {
        return res.status(400).json({
            message: "Invalid product id."
        });
    }

    try {
        const exists = await productExists(parsedProductId);

        if (!exists) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        const rows = await getProductMaterialRows(
            parsedProductId
        );

        res.json(rows.map(mapBomItem));
    } catch (error) {
        console.error("GET BOM ERROR:", error);

        res.status(500).json({
            message: "Unable to load BOM."
        });
    }
};

exports.createBomItem = async(req, res) => {
    const {
        product_id,
        material_id,
        quantity_required
    } = req.body;

    const {
        errors,
        quantity
    } = validateBomInput({
        product_id,
        material_id,
        quantity_required
    });

    if (errors.length > 0) {
        return res.status(400).json({
            message: errors.join(" ")
        });
    }

    try {
        if (!(await productExists(product_id))) {
            return res.status(400).json({
                message: "Product is invalid."
            });
        }

        const material = await getMaterial(material_id);

        if (!material) {
            return res.status(400).json({
                message: "Material is invalid."
            });
        }

        if (
            await bomItemExistsForProductAndMaterial(
                product_id,
                material_id
            )
        ) {
            return res.status(400).json({
                message: "This material is already in the product BOM."
            });
        }

        const [result] = await db.query(
            `INSERT INTO bom
                (product_id, material_id, quantity, unit)
             VALUES (?, ?, ?, ?)`, [
                Number(product_id),
                Number(material_id),
                quantity,
                material.unit
            ]
        );

        const [rows] = await db.query(
            `SELECT
                b.id,
                b.product_id,
                b.material_id,
                b.quantity AS quantity_required,
                b.unit,
                b.created_at,
                m.material_name,
                m.material_code
             FROM bom b
             LEFT JOIN materials m
                ON m.id = b.material_id
             WHERE b.id = ?`, [result.insertId]
        );

        res.status(201).json(
            mapBomItem(rows[0])
        );
    } catch (error) {
        console.error("CREATE BOM ERROR:", error);

        res.status(500).json({
            message: "Unable to add BOM item."
        });
    }
};

exports.updateBomItem = async(req, res) => {
    const { id } = req.params;

    const {
        product_id,
        material_id,
        quantity_required
    } = req.body;

    const {
        errors,
        quantity
    } = validateBomInput({
        product_id,
        material_id,
        quantity_required
    });

    if (errors.length > 0) {
        return res.status(400).json({
            message: errors.join(" ")
        });
    }

    try {
        const [existing] = await db.query(
            `SELECT id, product_id, material_id
             FROM bom
             WHERE id = ?`, [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: "BOM item not found."
            });
        }

        if (!(await productExists(product_id))) {
            return res.status(400).json({
                message: "Product is invalid."
            });
        }

        const material = await getMaterial(material_id);

        if (!material) {
            return res.status(400).json({
                message: "Material is invalid."
            });
        }

        if (
            await bomItemExistsForProductAndMaterial(
                product_id,
                material_id,
                id
            )
        ) {
            return res.status(400).json({
                message: "This material is already in the product BOM."
            });
        }

        await db.query(
            `UPDATE bom
             SET product_id = ?,
                 material_id = ?,
                 quantity = ?,
                 unit = ?
             WHERE id = ?`, [
                Number(product_id),
                Number(material_id),
                quantity,
                material.unit,
                id
            ]
        );

        const [rows] = await db.query(
            `SELECT
                b.id,
                b.product_id,
                b.material_id,
                b.quantity AS quantity_required,
                b.unit,
                b.created_at,
                m.material_name,
                m.material_code
             FROM bom b
             LEFT JOIN materials m
                ON m.id = b.material_id
             WHERE b.id = ?`, [id]
        );

        res.json(
            mapBomItem(rows[0])
        );
    } catch (error) {
        console.error("UPDATE BOM ERROR:", error);

        res.status(500).json({
            message: "Unable to update BOM item."
        });
    }
};

exports.deleteBomItem = async(req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query(
            "DELETE FROM bom WHERE id = ?", [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "BOM item not found."
            });
        }

        res.json({
            message: "BOM item deleted."
        });
    } catch (error) {
        console.error("DELETE BOM ERROR:", error);

        res.status(500).json({
            message: "Unable to delete BOM item."
        });
    }
};