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

        const safeStatus = [
                "Pending",
                "Completed",
                "Cancelled",
            ].includes(status) ?
            status :
            "Pending";

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

    try {
        // Get the production order
        const [orders] = await db.query(
            `SELECT
                po.*,
                p.product_name
             FROM production_orders po
             LEFT JOIN products p
                ON p.id = po.product_id
             WHERE po.id = ?`, [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Production order not found.",
            });
        }

        const order = orders[0];

        /*
         * Only perform inventory deduction when
         * changing a Pending order to Completed.
         */
        if (status === "Completed") {

            // Prevent duplicate inventory deduction
            if (order.status === "Completed") {
                return res.status(400).json({
                    message: "Production order is already completed.",
                });
            }

            if (order.status === "Cancelled") {
                return res.status(400).json({
                    message: "Cancelled production orders cannot be completed.",
                });
            }

            const connection = await db.getConnection();

            try {
                await connection.beginTransaction();

                /*
                 * Get production items and lock the corresponding
                 * material rows while checking stock.
                 */
                const [items] = await connection.query(
                    `SELECT
                        pi.id,
                        pi.material_id,
                        pi.required_quantity,
                        pi.consumed_quantity,
                        m.material_name,
                        m.material_code,
                        m.unit,
                        m.current_stock
                     FROM production_items pi
                     INNER JOIN materials m
                        ON m.id = pi.material_id
                     WHERE pi.production_order_id = ?
                     FOR UPDATE`, [id]
                );

                if (items.length === 0) {
                    await connection.query(
                        `UPDATE production_orders
                         SET status = 'Completed'
                         WHERE id = ?`, [id]
                    );

                    await connection.commit();

                    const [updatedOrders] = await db.query(
                        `SELECT
                            po.*,
                            p.product_name
                         FROM production_orders po
                         LEFT JOIN products p
                            ON p.id = po.product_id
                         WHERE po.id = ?`, [id]
                    );

                    const updatedItems =
                        await getProductionItems(id);

                    return res.json({
                        ...mapOrder(updatedOrders[0]),
                        items: updatedItems.map(mapOrderItem),
                    });
                }

                /*
                 * Check ALL materials before deducting anything.
                 */
                const shortages = [];

                for (const item of items) {
                    const required = Number(
                        item.required_quantity || 0
                    );

                    const available = Number(
                        item.current_stock || 0
                    );

                    if (required > available) {
                        shortages.push({
                            material_name: item.material_name,
                            material_code: item.material_code,
                            required,
                            available,
                            shortage: required - available,
                            unit: item.unit,
                        });
                    }
                }

                /*
                 * If even one material is short,
                 * cancel the entire operation.
                 */
                if (shortages.length > 0) {
                    await connection.rollback();

                    const first = shortages[0];

                    return res.status(400).json({
                        message: `Insufficient stock for ${first.material_name}. ` +
                            `Required: ${first.required} ${first.unit}, ` +
                            `Available: ${first.available} ${first.unit}, ` +
                            `Shortage: ${first.shortage} ${first.unit}.`,
                        shortages,
                    });
                }

                /*
                 * Deduct inventory.
                 */
                for (const item of items) {
                    const required = Number(
                        item.required_quantity || 0
                    );

                    await connection.query(
                        `UPDATE materials
                         SET current_stock = current_stock - ?
                         WHERE id = ?`, [
                            required,
                            item.material_id,
                        ]
                    );

                    /*
                     * Mark material consumption as completed.
                     */
                    await connection.query(
                        `UPDATE production_items
                         SET consumed_quantity = ?,
                             status = 'Completed'
                         WHERE id = ?`, [
                            required,
                            item.id,
                        ]
                    );
                }

                /*
                 * Mark production order as Completed.
                 */
                await connection.query(
                    `UPDATE production_orders
                     SET status = 'Completed'
                     WHERE id = ?`, [id]
                );

                await connection.commit();

                /*
                 * Return updated production order.
                 */
                const [updatedOrders] = await db.query(
                    `SELECT
                        po.*,
                        p.product_name
                     FROM production_orders po
                     LEFT JOIN products p
                        ON p.id = po.product_id
                     WHERE po.id = ?`, [id]
                );

                const updatedItems =
                    await getProductionItems(id);

                return res.json({
                    ...mapOrder(updatedOrders[0]),
                    items: updatedItems.map(mapOrderItem),
                });

            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }

        /*
         * Normal status update.
         * Used for Cancelled or other allowed status changes.
         */
        const validStatuses = [
            "Pending",
            "Completed",
            "Cancelled",
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Status is invalid.",
            });
        }

        const [result] = await db.query(
            `UPDATE production_orders
             SET status = ?
             WHERE id = ?`, [
                status,
                id,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Production order not found.",
            });
        }

        const [updatedOrders] = await db.query(
            `SELECT
                po.*,
                p.product_name
             FROM production_orders po
             LEFT JOIN products p
                ON p.id = po.product_id
             WHERE po.id = ?`, [id]
        );

        const updatedItems =
            await getProductionItems(id);

        res.json({
            ...mapOrder(updatedOrders[0]),
            items: updatedItems.map(mapOrderItem),
        });

    } catch (error) {
        console.error(
            "UPDATE PRODUCTION ORDER ERROR:",
            error
        );

        res.status(500).json({
            message: "Unable to update production order.",
        });
    }
};;