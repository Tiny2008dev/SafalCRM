-- Run this migration once against an existing safal_crm database.
-- It preserves existing rows and IDs. Back up the database before production changes.
ALTER TABLE materials
  ADD COLUMN material_source ENUM('CLIENT', 'OWN') NOT NULL DEFAULT 'OWN' AFTER minimum_stock,
  ADD COLUMN client_id INT NULL AFTER material_source,
  ADD CONSTRAINT fk_materials_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE products
  ADD COLUMN client_id INT NULL AFTER selling_price,
  ADD CONSTRAINT fk_products_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE bom
  ADD COLUMN client_id INT NULL AFTER unit,
  ADD CONSTRAINT fk_bom_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- DATE values become midnight on their existing date; no order data is lost.
ALTER TABLE sales_orders MODIFY COLUMN order_date DATETIME NOT NULL;

CREATE INDEX idx_materials_client_source ON materials (client_id, material_source);
CREATE INDEX idx_products_client ON products (client_id);
CREATE INDEX idx_sales_orders_datetime ON sales_orders (order_date);
