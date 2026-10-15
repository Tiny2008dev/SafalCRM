const db = require("../config/db");

const parseNumber = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const mapOrder = (row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    quantity: row.quantity,
    status: row.status,
    production_date: row.production_date,
    created_at: row.created_at,
});

const mapOrderItem = (row) => ({
    id: row.id,
    production_id: row.production_id,
    material_id: row.material_id,
    required_quantity: row.required_quantity,
    consumed_quantity: row.consumed_quantity,
    status: row.status,
    material_name: row.material_name,
    material_code: row.material_code,
    unit: row.unit,
    available_stock: row.available_stock,
    shortage: row.shortage,
    stock_status: row.stock_status,
});

const productExists = async(id) => {
    const [rows] = await db.query(
        "SELECT id FROM products WHERE id = ?", [id]
    );

    return rows.length > 0;
};

const getBomForProduct = async(productId) => {
    const [rows] = await db.query(
        `SELECT
            b.id,
            b.product_id,
            b.material_id,
            b.quantity AS quantity_required,
            m.material_name,
            m.material_code,
            m.unit,
            m.current_stock,
            m.is_active
         FROM bom b
         LEFT JOIN materials m ON m.id = b.material_id
         WHERE b.product_id = ?
         ORDER BY b.id ASC`, [productId]
    );

    return rows;
};

const calculateRequirements = (bomRows, productionQuantity) => {
    return bomRows.map((row) => {
        const requiredQuantity =
            Number(row.quantity_required || 0) *
            Number(productionQuantity || 0);

        const availableStock =
            Number(row.current_stock || 0);

        const shortage = Math.max(
            0,
            requiredQuantity - availableStock
        );

        return {
            id: row.id,
            product_id: row.product_id,
            material_id: row.material_id,
            required_quantity: requiredQuantity,
            material_name: row.material_name,
            material_code: row.material_code,
            unit: row.unit,
            available_stock: availableStock,
            shortage,
            stock_status: requiredQuantity <= availableStock ?
                "Sufficient" : "Insufficient",
        };
    });
};

const getProductionItems = async(productionId) => {
    const [rows] = await db.query(
        `SELECT
            pi.id,
            pi.production_order_id AS production_id,
            pi.material_id,
            pi.required_quantity,
            pi.consumed_quantity,
            pi.status,
            m.material_name,
            m.material_code,
            m.unit
         FROM production_items pi
         LEFT JOIN materials m
            ON m.id = pi.material_id
         WHERE pi.production_order_id = ?
         ORDER BY pi.id ASC`, [productionId]
    );

    return rows;
};

exports.getProductionOrders = async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                po.*,
                p.product_name
             FROM production_orders po
             LEFT JOIN products p
                ON p.id = po.product_id
             ORDER BY po.created_at DESC`
        );

        res.json(rows.map(mapOrder));
    } catch (error) {
        console.error("GET PRODUCTION ORDERS ERROR:", error);

        res.status(500).json({
            message: "Unable to load production orders.",
        });
    }
};

exports.getProductionOrderById = async(req, res) => {
    const { id } = req.params;

    try {
        const [orderRows] = await db.query(
            `SELECT
                po.*,
                p.product_name
             FROM production_orders po
             LEFT JOIN products p
                ON p.id = po.product_id
             WHERE po.id = ?`, [id]
        );

        if (orderRows.length === 0) {
            return res.status(404).json({
                message: "Production order not found.",
            });
        }

        const itemRows = await getProductionItems(id);

        res.json({
            ...mapOrder(orderRows[0]),
            items: itemRows.map(mapOrderItem),
        });
    } catch (error) {
        console.error("GET PRODUCTION ORDER ERROR:", error);

        res.status(500).json({
            message: "Unable to load production order.",
        });
    }
};

exports.createProductionOrder = async(req, res) => {
    const {
        product_id,
        quantity,
        production_date,
        status,
    } = req.body;

    const parsedQuantity = parseNumber(quantity);
    const parsedProductId = Number(product_id);

    if (!parsedProductId || parsedProductId <= 0) {
        return res.status(400).json({
            message: "Product is required.",
        });
    }

    if (
        parsedQuantity === null ||
        parsedQuantity <= 0
    ) {
        return res.status(400).json({
            message: "Production quantity must be greater than 0.",
        });
    }
    if (status !== undefined && status !== "Pending") {
        return res.status(400).json({ message: "New production orders must start in Pending status." });
    }

    try {
        if (!(await productExists(parsedProductId))) {
            return res.status(400).json({
                message: "Product is invalid.",
            });
        }

        const bomRows = await getBomForProduct(
            parsedProductId
        );

        if (!bomRows.length) {
            return res.status(400).json({
                message: "Product must have a BOM before production can be created.",
            });
        }

        const archivedMaterial = bomRows.find((row) => !row.is_active);
        if (archivedMaterial) {
            return res.status(400).json({
                message: `Cannot start production because ${archivedMaterial.material_name} is archived. Update the BOM first.`,
            });
        }

        const requirements = calculateRequirements(
            bomRows,
            parsedQuantity
        );

        const insufficient = requirements.filter(
            (item) => item.shortage > 0
        );

        if (insufficient.length > 0) {
            const first = insufficient[0];

            return res.status(400).json({
                message: `Insufficient stock for ${first.material_name}. ` +
                    `Required: ${first.required_quantity} ${first.unit || "units"}, ` +
                    `Available: ${first.available_stock} ${first.unit || "units"}, ` +
                    `Shortage: ${first.shortage} ${first.unit || "units"}.`,
            });
        }

        const safeStatus = "Pending";

        const productionDate =
            production_date ||
            new Date().toISOString().slice(0, 10);

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO production_orders
                    (product_id, quantity, production_date, status)
                 VALUES (?, ?, ?, ?)`, [
                    parsedProductId,
                    parsedQuantity,
                    productionDate,
                    safeStatus,
                ]
            );

            const productionId = result.insertId;

            for (const item of requirements) {
                await connection.query(
                    `INSERT INTO production_items
                        (production_order_id,
                         material_id,
                         required_quantity,
                         consumed_quantity,
                         status)
                     VALUES (?, ?, ?, ?, ?)`, [
                        productionId,
                        item.material_id,
                        item.required_quantity,
                        0,
                        "Pending",
                    ]
                );
            }

            await connection.commit();

            const [orderRows] = await db.query(
                `SELECT
                    po.*,
                    p.product_name
                 FROM production_orders po
                 LEFT JOIN products p
                    ON p.id = po.product_id
                 WHERE po.id = ?`, [productionId]
            );

            const itemRows =
                await getProductionItems(productionId);

            res.status(201).json({
                ...mapOrder(orderRows[0]),
                items: itemRows.map(mapOrderItem),
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(
            "CREATE PRODUCTION ORDER ERROR:",
            error
        );

        res.status(500).json({
            message: "Unable to create production order.",
        });
    }
};

exports.updateProductionOrder = async(req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Completed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Only a Pending order can transition to Completed or Cancelled.' });
    }

    let connection;
    let transactionOpen = false;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionOpen = true;

        // The parent row is locked first so concurrent status changes serialize here.
        const [orders] = await connection.query(
            'SELECT id, status FROM production_orders WHERE id = ? FOR UPDATE', [id]
        );
        if (!orders.length) {
            await connection.rollback();
            transactionOpen = false;
            return res.status(404).json({ message: 'Production order not found.' });
        }
        if (orders[0].status !== 'Pending') {
            await connection.rollback();
            transactionOpen = false;
            return res.status(409).json({ message: `Order in ${orders[0].status} status cannot transition to ${status}.` });
        }

        if (status === 'Completed') {
            const [items] = await connection.query(
                `SELECT pi.id, pi.material_id, pi.required_quantity, pi.consumed_quantity, pi.status AS item_status,
                        m.material_name, m.material_code, m.unit, m.current_stock
                 FROM production_items pi
                 INNER JOIN materials m ON m.id = pi.material_id
                 WHERE pi.production_order_id = ?
                 ORDER BY m.id ASC
                 FOR UPDATE`, [id]
            );
            if (items.some((item) => item.item_status === 'Completed' || Number(item.consumed_quantity || 0) !== 0)) {
                await connection.rollback();
                transactionOpen = false;
                return res.status(409).json({ message: 'Inventory for this production order has already been consumed.' });
            }
            const shortages = items.filter((item) => Number(item.required_quantity || 0) > Number(item.current_stock || 0)).map((item) => ({
                material_name: item.material_name,
                material_code: item.material_code,
                required: Number(item.required_quantity || 0),
                available: Number(item.current_stock || 0),
                shortage: Number(item.required_quantity || 0) - Number(item.current_stock || 0),
                unit: item.unit,
            }));
            if (shortages.length) {
                await connection.rollback();
                transactionOpen = false;
                const first = shortages[0];
                return res.status(400).json({
                    message: `Insufficient stock for ${first.material_name}. Required: ${first.required} ${first.unit}, Available: ${first.available} ${first.unit}, Shortage: ${first.shortage} ${first.unit}.`,
                    shortages,
                });
            }
            for (const item of items) {
                const [stockUpdate] = await connection.query(
                    'UPDATE materials SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ?',
                    [item.required_quantity, item.material_id, item.required_quantity]
                );
                if (stockUpdate.affectedRows !== 1) throw new Error('Material stock changed during production completion.');
                const [itemUpdate] = await connection.query(
                    "UPDATE production_items SET consumed_quantity = ?, status = 'Completed' WHERE id = ? AND status <> 'Completed' AND (consumed_quantity = 0 OR consumed_quantity IS NULL)",
                    [item.required_quantity, item.id]
                );
                if (itemUpdate.affectedRows !== 1) throw new Error('Production item was already consumed.');
            }
        }

        const [orderUpdate] = await connection.query(
            'UPDATE production_orders SET status = ? WHERE id = ? AND status = \'Pending\'', [status, id]
        );
        if (orderUpdate.affectedRows !== 1) throw new Error('Production order status changed during update.');
        await connection.commit();
        transactionOpen = false;

        const [updatedOrders] = await db.query(
            `SELECT po.*, p.product_name FROM production_orders po
             LEFT JOIN products p ON p.id = po.product_id WHERE po.id = ?`, [id]
        );
        const updatedItems = await getProductionItems(id);
        return res.json({ ...mapOrder(updatedOrders[0]), items: updatedItems.map(mapOrderItem) });
    } catch (error) {
        if (connection && transactionOpen) {
            try { await connection.rollback(); } catch (rollbackError) { console.error('Production transaction rollback failed:', rollbackError.message); }
        }
        console.error('UPDATE PRODUCTION ORDER ERROR:', error.message);
        return res.status(500).json({ message: 'Unable to update production order.' });
    } finally {
        if (connection) connection.release();
    }
};
