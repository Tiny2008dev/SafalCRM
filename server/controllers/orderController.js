const db = require("../config/db");

const validStatuses = ["Pending", "Processing", "Completed", "Cancelled"];

const parseNumber = (value) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const clientExists = async(id) => {
    const [rows] = await db.query(
        "SELECT id FROM clients WHERE id = ?", [id]
    );

    return rows.length > 0;
};

const productExists = async(id) => {
    const [rows] = await db.query(
        "SELECT id FROM products WHERE id = ?", [id]
    );

    return rows.length > 0;
};

const validateOrder = ({
    client_id,
    product_id,
    quantity,
    total_amount,
    status
}) => {
    const errors = [];

    if (!client_id || Number(client_id) <= 0) {
        errors.push("Client is required.");
    }

    if (!product_id || Number(product_id) <= 0) {
        errors.push("Product is required.");
    }

    const parsedQuantity = parseNumber(quantity);

    if (parsedQuantity === null || parsedQuantity <= 0) {
        errors.push("Quantity must be greater than 0.");
    }

    const parsedAmount = parseNumber(total_amount);

    if (parsedAmount === null || parsedAmount < 0) {
        errors.push("Amount cannot be negative.");
    }

    if (!status || !validStatuses.includes(status)) {
        errors.push("Status is required.");
    }

    return {
        errors,
        parsedQuantity,
        parsedAmount
    };
};

const getOrderQuery = `
    SELECT
        so.id,
        so.client_id,
        si.product_id,
        si.quantity,
        so.total_amount,
        so.order_date,
        so.status,
        so.created_at,
        c.name AS client_name,
        p.product_name,
        p.product_code
    FROM sales_orders so
    LEFT JOIN clients c
        ON c.id = so.client_id
    LEFT JOIN sales_items si
        ON si.sales_order_id = so.id
    LEFT JOIN products p
        ON p.id = si.product_id
`;

exports.getOrders = async(req, res) => {
    try {
        const [rows] = await db.query(
            `${getOrderQuery}
             ORDER BY so.created_at DESC`
        );

        res.json(rows);
    } catch (error) {
        console.error("GET ORDERS ERROR:", error);

        res.status(500).json({
            message: "Unable to load orders."
        });
    }
};

exports.getOrderById = async(req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            `${getOrderQuery}
             WHERE so.id = ?`, [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("GET ORDER ERROR:", error);

        res.status(500).json({
            message: "Unable to load order."
        });
    }
};

exports.createOrder = async(req, res) => {
    const {
        client_id,
        product_id,
        quantity,
        total_amount,
        order_date,
        status
    } = req.body;

    const {
        errors,
        parsedQuantity,
        parsedAmount
    } = validateOrder({
        client_id,
        product_id,
        quantity,
        total_amount,
        status
    });

    if (errors.length > 0) {
        return res.status(400).json({
            message: errors.join(" ")
        });
    }

    try {
        if (!(await clientExists(client_id))) {
            return res.status(400).json({
                message: "Client is invalid."
            });
        }

        if (!(await productExists(product_id))) {
            return res.status(400).json({
                message: "Product is invalid."
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [orderResult] = await connection.query(
                `INSERT INTO sales_orders
                (client_id, order_date, total_amount, status)
                VALUES (?, ?, ?, ?)`, [
                    Number(client_id),
                    order_date || new Date().toISOString().slice(0, 10),
                    parsedAmount,
                    status
                ]
            );

            await connection.query(
                `INSERT INTO sales_items
                (sales_order_id, product_id, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?)`, [
                    orderResult.insertId,
                    Number(product_id),
                    parsedQuantity,
                    parsedAmount / parsedQuantity,
                    parsedAmount
                ]
            );

            await connection.commit();

            const [rows] = await db.query(
                `${getOrderQuery}
                 WHERE so.id = ?`, [orderResult.insertId]
            );

            res.status(201).json(rows[0]);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("CREATE ORDER ERROR:", error);

        res.status(500).json({
            message: "Unable to add order."
        });
    }
};

exports.updateOrder = async(req, res) => {
    const { id } = req.params;

    const {
        client_id,
        product_id,
        quantity,
        total_amount,
        order_date,
        status
    } = req.body;

    try {
        const [existingRows] = await db.query(
            `${getOrderQuery}
             WHERE so.id = ?`, [id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        const existing = existingRows[0];

        const nextClientId =
            client_id !== undefined ?
            Number(client_id) :
            existing.client_id;

        const nextProductId =
            product_id !== undefined ?
            Number(product_id) :
            existing.product_id;

        const nextQuantity =
            quantity !== undefined ?
            parseNumber(quantity) :
            existing.quantity;

        const nextTotalAmount =
            total_amount !== undefined ?
            parseNumber(total_amount) :
            existing.total_amount;

        const nextStatus =
            status !== undefined ?
            status :
            existing.status;

        const nextDate =
            order_date || existing.order_date;

        const { errors } = validateOrder({
            client_id: nextClientId,
            product_id: nextProductId,
            quantity: nextQuantity,
            total_amount: nextTotalAmount,
            status: nextStatus
        });

        if (errors.length > 0) {
            return res.status(400).json({
                message: errors.join(" ")
            });
        }

        if (!(await clientExists(nextClientId))) {
            return res.status(400).json({
                message: "Client is invalid."
            });
        }

        if (!(await productExists(nextProductId))) {
            return res.status(400).json({
                message: "Product is invalid."
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(
                `UPDATE sales_orders
                 SET client_id = ?,
                     order_date = ?,
                     total_amount = ?,
                     status = ?
                 WHERE id = ?`, [
                    nextClientId,
                    nextDate,
                    nextTotalAmount,
                    nextStatus,
                    id
                ]
            );

            const [items] = await connection.query(
                `SELECT id
                 FROM sales_items
                 WHERE sales_order_id = ?
                 ORDER BY id ASC
                 LIMIT 1`, [id]
            );

            if (items.length > 0) {
                await connection.query(
                    `UPDATE sales_items
                     SET product_id = ?,
                         quantity = ?,
                         unit_price = ?,
                         total_price = ?
                     WHERE id = ?`, [
                        nextProductId,
                        nextQuantity,
                        nextTotalAmount / nextQuantity,
                        nextTotalAmount,
                        items[0].id
                    ]
                );
            } else {
                await connection.query(
                    `INSERT INTO sales_items
                    (sales_order_id, product_id, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?)`, [
                        id,
                        nextProductId,
                        nextQuantity,
                        nextTotalAmount / nextQuantity,
                        nextTotalAmount
                    ]
                );
            }

            await connection.commit();

            const [rows] = await db.query(
                `${getOrderQuery}
                 WHERE so.id = ?`, [id]
            );

            res.json(rows[0]);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("UPDATE ORDER ERROR:", error);

        res.status(500).json({
            message: "Unable to update order."
        });
    }
};

exports.deleteOrder = async(req, res) => {
    const { id } = req.params;

    try {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            await connection.query(
                "DELETE FROM sales_items WHERE sales_order_id = ?", [id]
            );

            const [result] = await connection.query(
                "DELETE FROM sales_orders WHERE id = ?", [id]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();

                return res.status(404).json({
                    message: "Order not found."
                });
            }

            await connection.commit();

            res.json({
                message: "Order deleted."
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("DELETE ORDER ERROR:", error);

        res.status(500).json({
            message: "Unable to delete order."
        });
    }
};