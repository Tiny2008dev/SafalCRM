const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Abc@123456789',
    database: process.env.DB_NAME || 'safal_crm',
    waitForConnections: true,
    connectionLimit: 10,
});

const q = pool.promise();

const getColumns = async(tableName) => {
    const [rows] = await q.query('DESCRIBE ??', [tableName]);
    return rows.map((row) => row.Field);
};

const addColumnIfMissing = async(tableName, columnName, definition) => {
    const columns = await getColumns(tableName);
    if (columns.includes(columnName)) {
        console.log('SKIP:', tableName, columnName, 'already exists');
        return;
    }

    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`;
    await q.query(sql);
    console.log('OK:', sql);
};

const ensureIndex = async(indexName, tableName, columns) => {
    const [rows] = await q.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [tableName, indexName]);
    if (rows.length > 0) {
        console.log('SKIP:', indexName, 'already exists');
        return;
    }

    const sql = `CREATE INDEX ${indexName} ON ${tableName} (${columns})`;
    await q.query(sql);
    console.log('OK:', sql);
};

(async() => {
    await addColumnIfMissing('clients', 'gstin', 'VARCHAR(20) AFTER company_name');
    await addColumnIfMissing('clients', 'office_address', 'VARCHAR(255) AFTER gstin');
    await addColumnIfMissing('clients', 'godown_address', 'VARCHAR(255) AFTER office_address');
    await addColumnIfMissing('materials', 'material_source', "ENUM('CLIENT','OWN') NOT NULL DEFAULT 'OWN' AFTER minimum_stock");
    await addColumnIfMissing('materials', 'client_id', 'INT NULL AFTER material_source');
    await addColumnIfMissing('materials', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER client_id');
    await addColumnIfMissing('materials', 'vendor_name', 'VARCHAR(150) AFTER minimum_stock');
    await addColumnIfMissing('materials', 'material_rate', 'DECIMAL(14,4) AFTER vendor_name');
    await addColumnIfMissing('products', 'client_id', 'INT NULL AFTER selling_price');
    await addColumnIfMissing('products', 'product_date', 'DATE AFTER selling_price');
    await addColumnIfMissing('products', 'expiry_date', 'DATE AFTER product_date');
    await addColumnIfMissing('bom', 'client_id', 'INT NULL AFTER unit');

    const [salesColumns] = await q.query('DESCRIBE sales_orders');
    const hasDateTimeOrderDate = salesColumns.some((column) => column.Field === 'order_date' && /datetime/i.test(column.Type));
    if (!hasDateTimeOrderDate) {
        await q.query('ALTER TABLE sales_orders MODIFY COLUMN order_date DATETIME NOT NULL');
        console.log('OK: ALTER TABLE sales_orders MODIFY COLUMN order_date DATETIME NOT NULL');
    }

    await ensureIndex('idx_materials_client_source', 'materials', 'client_id, material_source');
    await ensureIndex('idx_products_client', 'products', 'client_id');
    await ensureIndex('idx_sales_orders_datetime', 'sales_orders', 'order_date');

    const [products] = await q.query('DESCRIBE products');
    const [materials] = await q.query('DESCRIBE materials');
    const [sales] = await q.query('DESCRIBE sales_orders');

    console.log('PRODUCTS:', JSON.stringify(products.map((field) => ({ field: field.Field, type: field.Type })), null, 2));
    console.log('MATERIALS:', JSON.stringify(materials.map((field) => ({ field: field.Field, type: field.Type })), null, 2));
    console.log('SALES_ORDERS:', JSON.stringify(sales.map((field) => ({ field: field.Field, type: field.Type })), null, 2));

    await pool.end();
})().catch((error) => {
    console.error('Migration failed:', error.sqlMessage || error.message);
    pool.end();
    process.exit(1);
});