const db = require("../config/db");

const statuses = ["Pending", "Completed", "Cancelled"];
const asNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const normaliseDateTime = (value) => value ? String(value).replace("T", " ") + (String(value).length === 16 ? ":00" : "") : new Date().toISOString().slice(0, 19).replace("T", " ");

const getOrder = async(id, connection = db) => {
    const [orders] = await connection.query(`SELECT so.*, c.name AS client_name FROM sales_orders so JOIN clients c ON c.id = so.client_id WHERE so.id = ?`, [id]);
    if (!orders.length) return null;
    const [items] = await connection.query(`SELECT si.*, p.product_name, p.product_code FROM sales_items si JOIN products p ON p.id = si.product_id WHERE si.sales_order_id = ? ORDER BY si.id`, [id]);
    return {...orders[0], product_id: items.length ? items[0].product_id : null, product_name: items.length ? items[0].product_name : null, quantity: items.reduce((sum, item) => sum + Number(item.quantity), 0), items };
};

const validate = async(body) => {
    const clientId = asNumber(body.client_id);
    const fallbackUnitPrice = asNumber(body.total_amount) / asNumber(body.quantity);
    const unitPrice = body.unit_price !== undefined && body.unit_price !== null ? body.unit_price : fallbackUnitPrice;
    const rawItems = Array.isArray(body.items) && body.items.length ? body.items : [{ product_id: body.product_id, quantity: body.quantity, unit_price: unitPrice }];
    if (!Number.isInteger(clientId) || clientId <= 0) return { error: "Client is required." };
    if (!statuses.includes(body.status || "Pending")) return { error: "Status must be Pending, Completed, or Cancelled." };
    const items = rawItems.map((item) => ({ product_id: asNumber(item.product_id), quantity: asNumber(item.quantity), unit_price: asNumber(item.unit_price) }));
    if (items.some((item) => !Number.isInteger(item.product_id) || item.product_id <= 0 || !item.quantity || item.quantity <= 0 || item.unit_price === null || item.unit_price < 0)) return { error: "Every order item needs a valid product, quantity, and unit price." };
    const [
        [client]
    ] = await db.query("SELECT id FROM clients WHERE id = ?", [clientId]);
    if (!client) return { error: "Client is invalid." };
    const uniqueProductIds = [...new Set(items.map((item) => item.product_id))];
    const [products] = await db.query(`SELECT id, client_id FROM products WHERE id IN (${uniqueProductIds.map(() => "?").join(",")})`, uniqueProductIds);
    if (products.length !== uniqueProductIds.length) return { error: "One or more products are invalid." };
    if (products.some((product) => product.client_id && Number(product.client_id) !== clientId)) return { error: "A client-specific product can only be ordered for its linked client." };
    if ((body.status || "Pending") !== "Cancelled") {
        const [bomRows] = await db.query(
            `SELECT b.product_id, b.material_id, b.quantity AS quantity_required,
                            m.material_name, m.unit, m.current_stock, m.is_active
       FROM bom b
       JOIN materials m ON m.id = b.material_id
       WHERE b.product_id IN (${uniqueProductIds.map(() => "?").join(",")})`,
            uniqueProductIds
        );
        const bomByProduct = new Map();
        for (const row of bomRows) {
            const productRows = bomByProduct.get(Number(row.product_id)) || [];
            productRows.push(row);
            bomByProduct.set(Number(row.product_id), productRows);
        }
        if (uniqueProductIds.some((productId) => !bomByProduct.has(productId))) {
            return { error: "Every product needs a bill of materials before it can be ordered." };
        }
        const archivedMaterial = bomRows.find((row) => !row.is_active);
        if (archivedMaterial) {
            return { error: `Cannot place this order because ${archivedMaterial.material_name} is archived. Update the BOM first.` };
        }

        const materialNeeds = new Map();
        for (const item of items) {
            for (const row of bomByProduct.get(item.product_id)) {
                const materialId = Number(row.material_id);
                const current = materialNeeds.get(materialId) || {
                    name: row.material_name,
                    unit: row.unit,
                    required: 0,
                    available: Number(row.current_stock || 0),
                };
                current.required += Number(row.quantity_required || 0) * item.quantity;
                materialNeeds.set(materialId, current);
            }
        }
        for (const material of materialNeeds.values()) {
            if (material.required > material.available) {
                return {
                    error: `Insufficient ${material.name} stock: ${material.required} ${material.unit} required, ${material.available} ${material.unit} available.`,
                };
            }
        }
    }
    return { clientId, items, total: items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) };
};

exports.getOrders = async(req, res) => {
    try {
        const [rows] = await db.query("SELECT id FROM sales_orders ORDER BY created_at DESC");
        res.json(await Promise.all(rows.map((row) => getOrder(row.id))));
    } catch (error) {
        console.error("GET ORDERS ERROR:", error);
        res.status(500).json({ message: "Unable to load orders." });
    }
};

exports.getOrderById = async(req, res) => {
    try {
        const order = await getOrder(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found." });
        res.json(order);
    } catch (error) {
        console.error("GET ORDER ERROR:", error);
        res.status(500).json({ message: "Unable to load order." });
    }
};

const writeOrder = async(connection, orderId, input) => {
    if (orderId) await connection.query("UPDATE sales_orders SET client_id = ?, order_date = ?, total_amount = ?, status = ? WHERE id = ?", [input.clientId, normaliseDateTime(input.order_date), input.total, input.status || "Pending", orderId]);
    else {
        const [result] = await connection.query("INSERT INTO sales_orders (client_id, order_date, total_amount, status) VALUES (?, ?, ?, ?)", [input.clientId, normaliseDateTime(input.order_date), input.total, input.status || "Pending"]);
        orderId = result.insertId;
    }
    await connection.query("DELETE FROM sales_items WHERE sales_order_id = ?", [orderId]);
    for (const item of input.items) await connection.query("INSERT INTO sales_items (sales_order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)", [orderId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);
    return orderId;
};

exports.createOrder = async(req, res) => {
    try {
        const input = await validate(req.body);
        if (input.error) return res.status(400).json({ message: input.error });
        input.order_date = req.body.order_date;
        input.status = req.body.status;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const id = await writeOrder(connection, null, input);
            await connection.commit();
            res.status(201).json(await getOrder(id));
        } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    } catch (error) {
        console.error("CREATE ORDER ERROR:", error);
        res.status(500).json({ message: "Unable to add order." });
    }
};

exports.updateOrder = async(req, res) => {
    try {
        if (!(await getOrder(req.params.id))) return res.status(404).json({ message: "Order not found." });
        const input = await validate(req.body);
        if (input.error) return res.status(400).json({ message: input.error });
        input.order_date = req.body.order_date;
        input.status = req.body.status;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await writeOrder(connection, req.params.id, input);
            await connection.commit();
            res.json(await getOrder(req.params.id));
        } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    } catch (error) {
        console.error("UPDATE ORDER ERROR:", error);
        res.status(500).json({ message: "Unable to update order." });
    }
};

exports.deleteOrder = async(req, res) => {
    try {
        const [result] = await db.query("DELETE FROM sales_orders WHERE id = ?", [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: "Order not found." });
        res.json({ message: "Order deleted." });
    } catch (error) {
        console.error("DELETE ORDER ERROR:", error);
        res.status(500).json({ message: "Unable to delete order." });
    }
};