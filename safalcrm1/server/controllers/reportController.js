const db = require("../config/db");

const safeNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildReportFilters = (query = {}) => {
  const dateMode = String(query.dateMode || "allTime").toLowerCase();
  return {
    clientId: query.clientId ? Number(query.clientId) : null,
    productId: query.productId ? Number(query.productId) : null,
    orderId: query.orderId ? Number(query.orderId) : null,
    status: query.status && query.status !== "All" ? String(query.status) : "All",
    dateMode,
    month: query.month ? Number(query.month) : new Date().getMonth() + 1,
    year: query.year ? Number(query.year) : new Date().getFullYear(),
    fromDate: query.fromDate || "",
    toDate: query.toDate || "",
    fromTime: query.fromTime || "00:00",
    toTime: query.toTime || "23:59:59",
  };
};

const buildDateClauses = (filterState, columnName) => {
  const clauses = [];
  const params = [];

  if (filterState.dateMode === "month") {
    clauses.push(`MONTH(${columnName}) = ?`, `YEAR(${columnName}) = ?`);
    params.push(Number(filterState.month || 1), Number(filterState.year || new Date().getFullYear()));
  } else if (filterState.dateMode === "year") {
    clauses.push(`YEAR(${columnName}) = ?`);
    params.push(Number(filterState.year || new Date().getFullYear()));
  } else if (filterState.dateMode === "custom") {
    const asTime = (value, fallback) => {
      const time = value || fallback;
      return /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
    };
    if (filterState.fromDate) {
      clauses.push(`${columnName} >= ?`);
      params.push(`${filterState.fromDate} ${asTime(filterState.fromTime, "00:00")}`);
    }
    if (filterState.toDate) {
      clauses.push(`${columnName} <= ?`);
      params.push(`${filterState.toDate} ${asTime(filterState.toTime, "23:59:59")}`);
    }
  }

  return { clauses, params };
};

const buildSalesOrderFilters = (filterState, options = {}) => {
  const clauses = [];
  const params = [];

  if (filterState.clientId) {
    clauses.push("so.client_id = ?");
    params.push(Number(filterState.clientId));
  }

  if (options.includeProductFilter && filterState.productId) {
    clauses.push("si.product_id = ?");
    params.push(Number(filterState.productId));
  }

  if (filterState.orderId) {
    clauses.push("so.id = ?");
    params.push(Number(filterState.orderId));
  }

  if (filterState.status && filterState.status !== "All") {
    clauses.push("so.status = ?");
    params.push(filterState.status);
  }

  const dateFilter = buildDateClauses(filterState, "so.order_date");
  clauses.push(...dateFilter.clauses);
  params.push(...dateFilter.params);

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

const buildProductionFilters = (filterState) => {
  const clauses = [];
  const params = [];

  if (filterState.productId) {
    clauses.push("po.product_id = ?");
    params.push(Number(filterState.productId));
  }

  if (filterState.status && filterState.status !== "All") {
    clauses.push("po.status = ?");
    params.push(filterState.status);
  }

  const dateFilter = buildDateClauses(filterState, "po.production_date");
  clauses.push(...dateFilter.clauses);
  params.push(...dateFilter.params);

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

const buildInventoryFilters = (filterState) => {
  const clauses = [];
  const params = [];

  if (filterState.productId) {
    clauses.push("id = ?");
    params.push(Number(filterState.productId));
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
};

exports.buildReportFilters = buildReportFilters;

exports.getClientReport = async (req, res) => {
  try {
    const [[{ totalClients }]] = await db.query("SELECT COUNT(*) AS totalClients FROM clients");
    const [clients] = await db.query(
      "SELECT id, name, email, phone, company_name, created_at FROM clients ORDER BY created_at DESC"
    );

    res.json({ totalClients: safeNumber(totalClients), clients });
  } catch (error) {
    console.error("Client Report Error:", error);
    res.status(500).json({ message: "Unable to load client report." });
  }
};

exports.getInventoryReport = async (req, res) => {
  try {
    const [[{ totalMaterials }]] = await db.query("SELECT COUNT(*) AS totalMaterials FROM materials");
    const [[{ currentStock }]] = await db.query(
      "SELECT COALESCE(SUM(current_stock), 0) AS currentStock FROM materials"
    );
    const [[{ minimumStock }]] = await db.query(
      "SELECT COALESCE(SUM(minimum_stock), 0) AS minimumStock FROM materials"
    );
    const [lowStockMaterials] = await db.query(
      `SELECT id, material_code, material_name, current_stock, minimum_stock, unit, category
       FROM materials
       WHERE current_stock <= minimum_stock
       ORDER BY current_stock ASC, material_name ASC`
    );

    res.json({
      totalMaterials: safeNumber(totalMaterials),
      currentStock: safeNumber(currentStock),
      minimumStock: safeNumber(minimumStock),
      lowStockMaterials,
    });
  } catch (error) {
    console.error("Inventory Report Error:", error);
    res.status(500).json({ message: "Unable to load inventory report." });
  }
};

exports.getProductReport = async (req, res) => {
  try {
    const [[{ totalProducts }]] = await db.query("SELECT COUNT(*) AS totalProducts FROM products");
    const [products] = await db.query(
      `SELECT id, product_code, product_name, size, selling_price, description, created_at
       FROM products
       ORDER BY created_at DESC`
    );

    res.json({ totalProducts: safeNumber(totalProducts), products });
  } catch (error) {
    console.error("Product Report Error:", error);
    res.status(500).json({ message: "Unable to load product report." });
  }
};

exports.getProductionReport = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `SELECT
        COUNT(*) AS totalProduction,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(quantity), 0) AS totalUnitsProduced
      FROM production_orders`
    );

    res.json({
      totalProduction: safeNumber(summary && summary.totalProduction),
      pending: safeNumber(summary && summary.pending),
      completed: safeNumber(summary && summary.completed),
      cancelled: safeNumber(summary && summary.cancelled),
      totalUnitsProduced: safeNumber(summary && summary.totalUnitsProduced),
    });
  } catch (error) {
    console.error("Production Report Error:", error);
    res.status(500).json({ message: "Unable to load production report." });
  }
};

exports.getOrderReport = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Processing' THEN 1 ELSE 0 END) AS processing,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(total_amount), 0) AS totalOrderAmount,
        COUNT(DISTINCT client_id) AS totalCustomersWithOrders
      FROM sales_orders`
    );

    res.json({
      totalOrders: safeNumber(summary && summary.totalOrders),
      pending: safeNumber(summary && summary.pending),
      processing: safeNumber(summary && summary.processing),
      completed: safeNumber(summary && summary.completed),
      cancelled: safeNumber(summary && summary.cancelled),
      totalOrderAmount: safeNumber(summary && summary.totalOrderAmount),
      totalCustomersWithOrders: safeNumber(summary && summary.totalCustomersWithOrders),
    });
  } catch (error) {
    console.error("Order Report Error:", error);
    res.status(500).json({ message: "Unable to load order report." });
  }
};

exports.getOrdersAnalytics = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const { whereSql, params } = buildSalesOrderFilters(filterState, { includeProductFilter: true });

    const [[summary]] = await db.query(
      `SELECT
        COUNT(DISTINCT so.id) AS totalOrders,
        COALESCE(SUM(so.total_amount), 0) AS totalSalesAmount,
        COALESCE(AVG(so.total_amount), 0) AS averageOrderValue,
        COALESCE(SUM(si.quantity), 0) AS totalItemsSold,
        SUM(CASE WHEN so.status = 'Completed' THEN 1 ELSE 0 END) AS completedOrders,
        SUM(CASE WHEN so.status = 'Pending' THEN 1 ELSE 0 END) AS pendingOrders,
        SUM(CASE WHEN so.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
        COUNT(DISTINCT so.client_id) AS totalCustomersWithOrders
      FROM sales_orders so
      LEFT JOIN sales_items si ON si.sales_order_id = so.id ${whereSql}`,
      params
    );

    res.json({
      filters: filterState,
      totalOrders: safeNumber(summary && summary.totalOrders),
      totalSalesAmount: safeNumber(summary && summary.totalSalesAmount),
      averageOrderValue: safeNumber(summary && summary.averageOrderValue),
      totalItemsSold: safeNumber(summary && summary.totalItemsSold),
      completedOrders: safeNumber(summary && summary.completedOrders),
      pendingOrders: safeNumber(summary && summary.pendingOrders),
      cancelledOrders: safeNumber(summary && summary.cancelledOrders),
      totalCustomersWithOrders: safeNumber(summary && summary.totalCustomersWithOrders),
    });
  } catch (error) {
    console.error("Orders analytics error:", error);
    res.status(500).json({ message: "Unable to load sales analytics." });
  }
};

exports.getOrdersTimeSeries = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const { whereSql, params } = buildSalesOrderFilters(filterState, { includeProductFilter: true });

    const [rows] = await db.query(
      `SELECT
        DATE_FORMAT(so.order_date, '%Y-%m') AS period,
        COUNT(DISTINCT so.id) AS orders,
        COALESCE(SUM(so.total_amount), 0) AS sales
      FROM sales_orders so
      LEFT JOIN sales_items si ON si.sales_order_id = so.id ${whereSql}
      GROUP BY DATE_FORMAT(so.order_date, '%Y-%m')
      ORDER BY DATE_FORMAT(so.order_date, '%Y-%m') ASC`,
      params
    );

    res.json(rows.map((row) => ({
      period: row.period || "",
      orders: safeNumber(row.orders),
      sales: safeNumber(row.sales),
    })));
  } catch (error) {
    console.error("Orders time series error:", error);
    res.status(500).json({ message: "Unable to load sales time series." });
  }
};

exports.getOrdersByClient = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const { whereSql, params } = buildSalesOrderFilters(filterState, { includeProductFilter: true });

    const [rows] = await db.query(
      `SELECT
        c.name AS clientName,
        c.company_name AS companyName,
        COUNT(DISTINCT so.id) AS orders,
        COALESCE(SUM(so.total_amount), 0) AS salesAmount
      FROM sales_orders so
      LEFT JOIN clients c ON c.id = so.client_id
      LEFT JOIN sales_items si ON si.sales_order_id = so.id ${whereSql}
      GROUP BY c.id, c.name, c.company_name
      ORDER BY salesAmount DESC, c.name ASC`,
      params
    );

    res.json(rows.map((row) => ({
      clientName: row.clientName || "Unknown",
      companyName: row.companyName || "",
      orders: safeNumber(row.orders),
      salesAmount: safeNumber(row.salesAmount),
    })));
  } catch (error) {
    console.error("Orders by client error:", error);
    res.status(500).json({ message: "Unable to load client sales report." });
  }
};

exports.getOrdersByProduct = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const { whereSql, params } = buildSalesOrderFilters(filterState, { includeProductFilter: true });

    const [rows] = await db.query(
      `SELECT
        p.product_name AS productName,
        COALESCE(SUM(si.quantity), 0) AS unitsSold,
        COALESCE(SUM(si.total_price), 0) AS revenue,
        COUNT(DISTINCT so.id) AS orders
      FROM sales_orders so
      LEFT JOIN sales_items si ON si.sales_order_id = so.id
      LEFT JOIN products p ON p.id = si.product_id ${whereSql}
      GROUP BY p.id, p.product_name
      ORDER BY revenue DESC, unitsSold DESC`,
      params
    );

    res.json(rows.map((row) => ({
      productName: row.productName || "Unknown",
      unitsSold: safeNumber(row.unitsSold),
      revenue: safeNumber(row.revenue),
      orders: safeNumber(row.orders),
    })));
  } catch (error) {
    console.error("Orders by product error:", error);
    res.status(500).json({ message: "Unable to load product sales report." });
  }
};

exports.getFilteredOrders = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const { whereSql, params } = buildSalesOrderFilters(filterState, { includeProductFilter: true });
    const [rows] = await db.query(
      `SELECT so.id AS orderId, c.name AS clientName, so.order_date AS orderDate,
              so.total_amount AS amount, so.status,
              GROUP_CONCAT(CONCAT(p.product_name, ' x', si.quantity) ORDER BY p.product_name SEPARATOR ', ') AS products,
              COALESCE(SUM(si.quantity), 0) AS quantity
       FROM sales_orders so
       LEFT JOIN clients c ON c.id = so.client_id
       LEFT JOIN sales_items si ON si.sales_order_id = so.id
       LEFT JOIN products p ON p.id = si.product_id
       ${whereSql}
       GROUP BY so.id, c.name, so.order_date, so.total_amount, so.status
       ORDER BY so.order_date DESC, so.id DESC`, params
    );
    res.json(rows.map((row) => ({
      orderId: row.orderId,
      clientName: row.clientName || "Unknown",
      orderDate: row.orderDate,
      amount: safeNumber(row.amount),
      status: row.status,
      products: row.products || "—",
      quantity: safeNumber(row.quantity),
    })));
  } catch (error) {
    console.error("Filtered orders report error:", error);
    res.status(500).json({ message: "Unable to load filtered orders." });
  }
};

exports.getClientAnalytics = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId || req.query.clientId);
    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required." });
    }

    const filterState = buildReportFilters(req.query);
    const dateFilter = buildDateClauses(filterState, "so.order_date");
    const dateSuffix = dateFilter.clauses.length ? `AND ${dateFilter.clauses.join(" AND ")}` : "";
    const dateParams = dateFilter.params;

    const [[clientSummary]] = await db.query(
      `SELECT
        c.id,
        c.name,
        c.company_name AS company,
        c.phone,
        c.email,
        COUNT(DISTINCT so.id) AS totalOrders,
        COALESCE(SUM(so.total_amount), 0) AS totalPurchaseAmount,
        COALESCE(AVG(so.total_amount), 0) AS averageOrderValue,
        COALESCE(SUM(si.quantity), 0) AS totalProductsPurchased,
        MAX(so.order_date) AS lastOrderDate
      FROM clients c
      LEFT JOIN sales_orders so ON so.client_id = c.id
      LEFT JOIN sales_items si ON si.sales_order_id = so.id
      WHERE c.id = ? ${dateSuffix}
      GROUP BY c.id, c.name, c.company_name, c.phone, c.email`,
      [clientId, ...dateParams]
    );

    if (!clientSummary) {
      return res.status(404).json({ message: "Client not found." });
    }

    const [timeSeries] = await db.query(
      `SELECT
        DATE_FORMAT(so.order_date, '%Y-%m') AS period,
        COUNT(DISTINCT so.id) AS orders,
        COALESCE(SUM(so.total_amount), 0) AS sales
      FROM sales_orders so
      LEFT JOIN sales_items si ON si.sales_order_id = so.id
      WHERE so.client_id = ? ${dateSuffix}
      GROUP BY DATE_FORMAT(so.order_date, '%Y-%m')
      ORDER BY DATE_FORMAT(so.order_date, '%Y-%m') ASC`,
      [clientId, ...dateParams]
    );

    const [productBreakdown] = await db.query(
      `SELECT
        p.product_name AS productName,
        COALESCE(SUM(si.quantity), 0) AS quantity,
        COALESCE(SUM(si.total_price), 0) AS revenue
      FROM sales_items si
      JOIN sales_orders so ON so.id = si.sales_order_id
      JOIN products p ON p.id = si.product_id
      WHERE so.client_id = ? ${dateSuffix}
      GROUP BY p.id, p.product_name
      ORDER BY revenue DESC`,
      [clientId, ...dateParams]
    );

    const [statusRows] = await db.query(
      `SELECT
        so.status,
        COUNT(*) AS count
      FROM sales_orders so
      WHERE so.client_id = ? ${dateSuffix}
      GROUP BY so.status`,
      [clientId, ...dateParams]
    );

    const [historyRows] = await db.query(
      `SELECT
        so.id AS orderId,
        so.order_date AS orderDate,
        so.status,
        so.total_amount AS amount,
        COALESCE(SUM(si.quantity), 0) AS quantity,
        GROUP_CONCAT(CONCAT(p.product_name, ' x', si.quantity) ORDER BY p.product_name SEPARATOR ', ') AS products
      FROM sales_orders so
      LEFT JOIN sales_items si ON si.sales_order_id = so.id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE so.client_id = ? ${dateSuffix}
      GROUP BY so.id, so.order_date, so.status, so.total_amount
      ORDER BY so.order_date DESC`,
      [clientId, ...dateParams]
    );

    res.json({
      client: {
        id: clientSummary.id,
        name: clientSummary.name,
        company: clientSummary.company,
        phone: clientSummary.phone,
        email: clientSummary.email,
        totalOrders: safeNumber(clientSummary.totalOrders),
        totalPurchaseAmount: safeNumber(clientSummary.totalPurchaseAmount),
        averageOrderValue: safeNumber(clientSummary.averageOrderValue),
        totalProductsPurchased: safeNumber(clientSummary.totalProductsPurchased),
        lastOrderDate: clientSummary.lastOrderDate || null,
      },
      salesTrend: timeSeries.map((row) => ({
        period: row.period,
        orders: safeNumber(row.orders),
        sales: safeNumber(row.sales),
      })),
      productBreakdown: productBreakdown.map((row) => ({
        productName: row.productName || "Unknown",
        quantity: safeNumber(row.quantity),
        revenue: safeNumber(row.revenue),
      })),
      orderStatus: statusRows.map((row) => ({
        status: row.status,
        count: safeNumber(row.count),
      })),
      orderHistory: historyRows.map((row) => ({
        orderId: row.orderId,
        date: row.orderDate,
        products: row.products || "",
        quantity: safeNumber(row.quantity),
        amount: safeNumber(row.amount),
        status: row.status,
      })),
    });
  } catch (error) {
    console.error("Client analytics error:", error);
    res.status(500).json({ message: "Unable to load client analytics." });
  }
};

exports.getOrderAnalytics = async (req, res) => {
  try {
    const orderId = Number(req.params.orderId || req.query.orderId);
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required." });
    }

    const [[orderSummary]] = await db.query(
      `SELECT
        so.id AS orderId,
        c.name AS clientName,
        so.order_date AS orderDate,
        so.status,
        so.total_amount AS totalAmount,
        COUNT(DISTINCT si.id) AS numberOfProducts,
        COALESCE(SUM(si.quantity), 0) AS totalQuantity
      FROM sales_orders so
      LEFT JOIN clients c ON c.id = so.client_id
      LEFT JOIN sales_items si ON si.sales_order_id = so.id
      WHERE so.id = ?
      GROUP BY so.id, c.name, so.order_date, so.status, so.total_amount`,
      [orderId]
    );

    if (!orderSummary) {
      return res.status(404).json({ message: "Order not found." });
    }

    const [items] = await db.query(
      `SELECT
        p.product_name AS productName,
        si.quantity,
        si.unit_price AS unitPrice,
        si.total_price AS totalPrice
      FROM sales_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sales_order_id = ?
      ORDER BY p.product_name ASC`,
      [orderId]
    );

    res.json({
      order: {
        orderId: orderSummary.orderId,
        client: orderSummary.clientName,
        orderDate: orderSummary.orderDate,
        status: orderSummary.status,
        totalAmount: safeNumber(orderSummary.totalAmount),
        numberOfProducts: safeNumber(orderSummary.numberOfProducts),
        totalQuantity: safeNumber(orderSummary.totalQuantity),
      },
      items: items.map((row) => ({
        productName: row.productName || "Unknown",
        quantity: safeNumber(row.quantity),
        unitPrice: safeNumber(row.unitPrice),
        totalPrice: safeNumber(row.totalPrice),
      })),
    });
  } catch (error) {
    console.error("Order analytics error:", error);
    res.status(500).json({ message: "Unable to load order analytics." });
  }
};

exports.getProductAnalytics = async (req, res) => {
  try {
    const productId = Number(req.params.productId || req.query.productId);
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required." });
    }

    const [[product]] = await db.query(
      `SELECT
        p.id,
        p.product_name AS productName,
        p.product_code AS productCode,
        p.selling_price AS sellingPrice
      FROM products p
      WHERE p.id = ?`,
      [productId]
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const [[summary]] = await db.query(
      `SELECT
        COALESCE(SUM(si.quantity), 0) AS totalUnitsSold,
        COALESCE(SUM(si.total_price), 0) AS totalRevenue,
        COUNT(DISTINCT so.id) AS numberOfOrders,
        COUNT(DISTINCT so.client_id) AS numberOfClients
      FROM sales_items si
      LEFT JOIN sales_orders so ON so.id = si.sales_order_id
      WHERE si.product_id = ?`,
      [productId]
    );

    const [salesTrend] = await db.query(
      `SELECT
        DATE_FORMAT(so.order_date, '%Y-%m') AS period,
        COALESCE(SUM(si.quantity), 0) AS unitsSold,
        COALESCE(SUM(si.total_price), 0) AS revenue
      FROM sales_items si
      JOIN sales_orders so ON so.id = si.sales_order_id
      WHERE si.product_id = ?
      GROUP BY DATE_FORMAT(so.order_date, '%Y-%m')
      ORDER BY DATE_FORMAT(so.order_date, '%Y-%m') ASC`,
      [productId]
    );

    const [customers] = await db.query(
      `SELECT
        c.name AS customerName,
        COUNT(DISTINCT so.id) AS orders,
        COALESCE(SUM(si.quantity), 0) AS unitsBought,
        COALESCE(SUM(si.total_price), 0) AS revenue
      FROM sales_items si
      JOIN sales_orders so ON so.id = si.sales_order_id
      JOIN clients c ON c.id = so.client_id
      WHERE si.product_id = ?
      GROUP BY c.id, c.name
      ORDER BY revenue DESC`,
      [productId]
    );

    res.json({
      product: {
        id: product.id,
        productName: product.productName,
        productCode: product.productCode,
        sellingPrice: safeNumber(product.sellingPrice),
        totalUnitsSold: safeNumber(summary && summary.totalUnitsSold),
        totalRevenue: safeNumber(summary && summary.totalRevenue),
        numberOfOrders: safeNumber(summary && summary.numberOfOrders),
        numberOfClients: safeNumber(summary && summary.numberOfClients),
      },
      salesTrend: salesTrend.map((row) => ({
        period: row.period,
        unitsSold: safeNumber(row.unitsSold),
        revenue: safeNumber(row.revenue),
      })),
      customers: customers.map((row) => ({
        customerName: row.customerName || "Unknown",
        orders: safeNumber(row.orders),
        unitsBought: safeNumber(row.unitsBought),
        revenue: safeNumber(row.revenue),
      })),
    });
  } catch (error) {
    console.error("Product analytics error:", error);
    res.status(500).json({ message: "Unable to load product analytics." });
  }
};

exports.getProductionAnalytics = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const { whereSql, params } = buildProductionFilters(filterState);

    const [[summary]] = await db.query(
      `SELECT
        COUNT(*) AS totalProductionOrders,
        COALESCE(SUM(quantity), 0) AS totalUnitsProduced,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingProduction,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedProduction,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelledProduction
      FROM production_orders po ${whereSql}`,
      params
    );

    const [timeSeries] = await db.query(
      `SELECT
        DATE_FORMAT(po.production_date, '%Y-%m') AS period,
        COUNT(*) AS orders,
        COALESCE(SUM(po.quantity), 0) AS unitsProduced
      FROM production_orders po ${whereSql}
      GROUP BY DATE_FORMAT(po.production_date, '%Y-%m')
      ORDER BY DATE_FORMAT(po.production_date, '%Y-%m') ASC`,
      params
    );

    const [byProduct] = await db.query(
      `SELECT
        p.product_name AS productName,
        COALESCE(SUM(po.quantity), 0) AS unitsProduced
      FROM production_orders po
      LEFT JOIN products p ON p.id = po.product_id ${whereSql}
      GROUP BY p.id, p.product_name
      ORDER BY unitsProduced DESC`,
      params
    );

    const [statusRows] = await db.query(
      `SELECT
        po.status,
        COUNT(*) AS count
      FROM production_orders po ${whereSql}
      GROUP BY po.status`,
      params
    );

    res.json({
      summary: {
        totalProductionOrders: safeNumber(summary && summary.totalProductionOrders),
        totalUnitsProduced: safeNumber(summary && summary.totalUnitsProduced),
        pendingProduction: safeNumber(summary && summary.pendingProduction),
        completedProduction: safeNumber(summary && summary.completedProduction),
        cancelledProduction: safeNumber(summary && summary.cancelledProduction),
      },
      timeSeries: timeSeries.map((row) => ({
        period: row.period,
        orders: safeNumber(row.orders),
        unitsProduced: safeNumber(row.unitsProduced),
      })),
      byProduct: byProduct.map((row) => ({
        productName: row.productName || "Unknown",
        unitsProduced: safeNumber(row.unitsProduced),
      })),
      statusBreakdown: statusRows.map((row) => ({
        status: row.status,
        count: safeNumber(row.count),
      })),
    });
  } catch (error) {
    console.error("Production analytics error:", error);
    res.status(500).json({ message: "Unable to load production analytics." });
  }
};

exports.getInventoryAnalytics = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const inventoryFilter = buildInventoryFilters(filterState);

    const [[summary]] = await db.query(
      `SELECT
        COUNT(*) AS totalMaterials,
        COALESCE(SUM(current_stock), 0) AS totalStock,
        SUM(CASE WHEN current_stock <= minimum_stock THEN 1 ELSE 0 END) AS lowStockMaterials,
        SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END) AS outOfStockMaterials
      FROM materials ${inventoryFilter.whereSql}`,
      inventoryFilter.params
    );

    const [stockByMaterial] = await db.query(
      `SELECT
        material_name AS materialName,
        category,
        current_stock AS currentStock,
        minimum_stock AS minimumStock
      FROM materials ${inventoryFilter.whereSql}
      ORDER BY currentStock ASC, materialName ASC`,
      inventoryFilter.params
    );

    const [stockByCategory] = await db.query(
      `SELECT
        category,
        COALESCE(SUM(current_stock), 0) AS totalStock
      FROM materials ${inventoryFilter.whereSql}
      GROUP BY category
      ORDER BY totalStock DESC`,
      inventoryFilter.params
    );

    const [lowStockRows] = await db.query(
      `SELECT
        material_name AS materialName,
        current_stock AS currentStock,
        minimum_stock AS minimumStock,
        category
      FROM materials
      WHERE current_stock <= minimum_stock
      ORDER BY currentStock ASC`
    );

    res.json({
      summary: {
        totalMaterials: safeNumber(summary && summary.totalMaterials),
        totalStock: safeNumber(summary && summary.totalStock),
        lowStockMaterials: safeNumber(summary && summary.lowStockMaterials),
        outOfStockMaterials: safeNumber(summary && summary.outOfStockMaterials),
      },
      stockByMaterial: stockByMaterial.map((row) => ({
        materialName: row.materialName || "Unknown",
        category: row.category || "",
        currentStock: safeNumber(row.currentStock),
        minimumStock: safeNumber(row.minimumStock),
      })),
      stockByCategory: stockByCategory.map((row) => ({
        category: row.category || "Unknown",
        totalStock: safeNumber(row.totalStock),
      })),
      lowStockMaterials: lowStockRows.map((row) => ({
        materialName: row.materialName || "Unknown",
        currentStock: safeNumber(row.currentStock),
        minimumStock: safeNumber(row.minimumStock),
        category: row.category || "",
      })),
    });
  } catch (error) {
    console.error("Inventory analytics error:", error);
    res.status(500).json({ message: "Unable to load inventory analytics." });
  }
};

exports.getAllAlerts = async (req, res) => {
  try {
    const [clients] = await db.query("SELECT id, name, company_name FROM clients ORDER BY name ASC");
    const [products] = await db.query(
      "SELECT id, product_name, product_code FROM products ORDER BY product_name ASC"
    );
    res.json({ clients, products });
  } catch (error) {
    console.error("Report lookup error:", error);
    res.status(500).json({ message: "Unable to load lookup data." });
  }
};

exports.getReportsOverview = async (req, res) => {
  try {
    const filterState = buildReportFilters(req.query);
    const { whereSql, params } = buildSalesOrderFilters(filterState, { includeProductFilter: true });
    const [[ordersSummary]] = await db.query(
      `SELECT
        COUNT(DISTINCT so.id) AS totalOrders,
        COALESCE(SUM(so.total_amount), 0) AS totalSalesAmount
      FROM sales_orders so ${whereSql}`,
      params
    );

    res.json({
      filters: filterState,
      orders: {
        totalOrders: safeNumber(ordersSummary && ordersSummary.totalOrders),
        totalSalesAmount: safeNumber(ordersSummary && ordersSummary.totalSalesAmount),
      },
    });
  } catch (error) {
    console.error("Report overview error:", error);
    res.status(500).json({ message: "Unable to load report overview." });
  }
};
