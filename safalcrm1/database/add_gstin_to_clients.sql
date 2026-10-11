USE safal_crm;

ALTER TABLE clients
  ADD COLUMN gstin VARCHAR(20) AFTER company_name,
  ADD COLUMN office_address VARCHAR(255) AFTER gstin,
  ADD COLUMN godown_address VARCHAR(255) AFTER office_address;

ALTER TABLE materials
  ADD COLUMN vendor_name VARCHAR(150) AFTER minimum_stock,
  ADD COLUMN material_rate DECIMAL(14,4) AFTER vendor_name;

ALTER TABLE products
  ADD COLUMN product_date DATE AFTER selling_price,
  ADD COLUMN expiry_date DATE AFTER product_date;
