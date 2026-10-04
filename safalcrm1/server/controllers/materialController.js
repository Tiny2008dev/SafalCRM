const db = require("../config/db");

const parseStockValue = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const mapMaterial = (row) => ({
    id: row.id,
    material_code: row.material_code,
    material_name: row.material_name,
    category: row.category,
    unit: row.unit,
    current_stock: row.current_stock,
    minimum_stock: row.minimum_stock,
    material_source: row.material_source || "OWN",
    client_id: row.client_id,
    client_name: row.client_name || null,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
});

const materialCodeExists = async(material_code, excludedId = null) => {
    const sql = excludedId ?
        "SELECT id FROM materials WHERE material_code = ? AND id != ?" :
        "SELECT id FROM materials WHERE material_code = ?";
    const params = excludedId ? [material_code, excludedId] : [material_code];
    const [rows] = await db.query(sql, params);
    return rows.length > 0;
};

const validateMaterial = ({ material_code, material_name, category, unit, current_stock, minimum_stock, material_source, client_id }) => {
    const errors = [];

    if (!material_code || !material_code.toString().trim()) {
        errors.push("Material code is required.");
    }
    if (!material_name || !material_name.toString().trim()) {
        errors.push("Material name is required.");
    }
    if (!category || !category.toString().trim()) {
        errors.push("Category is required.");
    }
    if (!unit || !unit.toString().trim()) {
        errors.push("Unit is required.");
    }

    const currentStock = parseStockValue(current_stock);
    const minimumStock = parseStockValue(minimum_stock);

    if (currentStock === null || currentStock < 0) {
        errors.push("Current stock must be a non-negative number.");
    }
    if (minimumStock === null || minimumStock < 0) {
        errors.push("Minimum stock must be a non-negative number.");
    }

    const source = String(material_source || "OWN").toUpperCase();
    if (!['CLIENT', 'OWN'].includes(source)) errors.push("Material source must be CLIENT or OWN.");
    const clientId = client_id === "" || client_id === null || client_id === undefined ? null : Number(client_id);
    if (source === 'CLIENT' && (!Number.isInteger(clientId) || clientId <= 0)) errors.push("A client is required for client-provided material.");
    if (source === 'OWN' && clientId !== null) errors.push("Own material cannot be linked to a client.");

    return { errors, currentStock, minimumStock, source, clientId };
};

const clientExists = async(id) => {
    const [rows] = await db.query("SELECT id FROM clients WHERE id = ?", [id]);
    return rows.length > 0;
};

exports.getMaterials = async(req, res) => {
    try {
        const archived = req.query.archived === "true";
        const [rows] = await db.query(
            `SELECT m.*, c.name AS client_name
             FROM materials m
             LEFT JOIN clients c ON c.id = m.client_id
             WHERE m.is_active = ?
             ORDER BY m.created_at DESC`, [archived ? 0 : 1]
        );
        res.json(rows.map(mapMaterial));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load materials." });
    }
};

exports.createMaterial = async(req, res) => {
    const { material_code, material_name, category, unit, current_stock, minimum_stock, material_source, client_id } = req.body;
    const { errors, currentStock, minimumStock, source, clientId } = validateMaterial({
        material_code,
        material_name,
        category,
        unit,
        current_stock,
        minimum_stock,
        material_source,
        client_id,
    });

    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") });
    }

    try {
        if (await materialCodeExists(material_code)) {
            return res.status(400).json({ message: "Material code must be unique." });
        }
        if (clientId && !(await clientExists(clientId))) return res.status(400).json({ message: "Client is invalid." });

        const [result] = await db.query(
            "INSERT INTO materials (material_code, material_name, category, unit, current_stock, minimum_stock, material_source, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                material_code.toString().trim(),
                material_name.toString().trim(),
                category.toString().trim(),
                unit.toString().trim(),
                currentStock,
                minimumStock,
                source,
                source === 'CLIENT' ? clientId : null,
            ]
        );

        const [rows] = await db.query("SELECT m.*, c.name AS client_name FROM materials m LEFT JOIN clients c ON c.id = m.client_id WHERE m.id = ?", [result.insertId]);
        res.status(201).json(mapMaterial(rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to add material." });
    }
};

exports.updateMaterial = async(req, res) => {
    const { id } = req.params;
    const { material_code, material_name, category, unit, current_stock, minimum_stock, material_source, client_id } = req.body;
    const { errors, currentStock, minimumStock, source, clientId } = validateMaterial({
        material_code,
        material_name,
        category,
        unit,
        current_stock,
        minimum_stock,
        material_source,
        client_id,
    });

    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") });
    }

    try {
        const [existing] = await db.query("SELECT id FROM materials WHERE id = ?", [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: "Material not found." });
        }

        if (await materialCodeExists(material_code, id)) {
            return res.status(400).json({ message: "Material code must be unique." });
        }
        if (clientId && !(await clientExists(clientId))) return res.status(400).json({ message: "Client is invalid." });

        await db.query(
            "UPDATE materials SET material_code = ?, material_name = ?, category = ?, unit = ?, current_stock = ?, minimum_stock = ?, material_source = ?, client_id = ? WHERE id = ?", [
                material_code.toString().trim(),
                material_name.toString().trim(),
                category.toString().trim(),
                unit.toString().trim(),
                currentStock,
                minimumStock,
                source,
                source === 'CLIENT' ? clientId : null,
                id,
            ]
        );

        const [rows] = await db.query("SELECT m.*, c.name AS client_name FROM materials m LEFT JOIN clients c ON c.id = m.client_id WHERE m.id = ?", [id]);
        res.json(mapMaterial(rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to update material." });
    }
};

exports.deleteMaterial = async(req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query("SELECT id, is_active FROM materials WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Material not found." });
        }
        if (!rows[0].is_active) {
            return res.status(400).json({ message: "Material is already archived." });
        }

        const [result] = await db.query("UPDATE materials SET is_active = 0 WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Material not found." });
        }

        res.json({ message: "Material archived." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to archive material." });
    }
};

exports.restoreMaterial = async(req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query("SELECT id FROM materials WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Material not found." });
        }

        await db.query("UPDATE materials SET is_active = 1 WHERE id = ?", [id]);
        res.json({ message: "Material restored." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to restore material." });
    }
};

exports.permanentlyDeleteMaterial = async(req, res) => {
    const { id } = req.params;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [materials] = await connection.query(
            "SELECT id, is_active FROM materials WHERE id = ? FOR UPDATE", [id]
        );
        if (materials.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Material not found." });
        }
        if (Number(materials[0].is_active) === 1) {
            await connection.rollback();
            return res.status(400).json({ message: "Archive the material before permanently deleting it." });
        }

        const [references] = await connection.query(
            "SELECT COUNT(*) AS count FROM production_items WHERE material_id = ?", [id]
        );
        if (Number(references[0].count) > 0) {
            await connection.rollback();
            return res.status(400).json({
                message: "Cannot permanently delete this material because production history references it. It will remain archived.",
            });
        }

        const [result] = await connection.query("DELETE FROM materials WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Material not found." });
        }

        await connection.commit();
        res.json({ message: "Material permanently deleted." });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: "Unable to permanently delete material." });
    } finally {
        if (connection) connection.release();
    }
};