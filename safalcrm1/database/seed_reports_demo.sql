USE safal_crm;

INSERT INTO clients (id, name, company_name, gstin, office_address, godown_address, phone, email, address, city, created_at)
VALUES
  (1, 'Rahul Enterprises', 'Rahul Enterprises', '27ABCDE1234F1Z5', 'Andheri East, Mumbai', 'Andheri West, Mumbai', '9876543210', 'rahul@example.com', 'Andheri East', 'Mumbai', '2026-08-01 10:00:00'),
  (2, 'Devam Pvt Ltd', 'Devamltd', '27FGHIJ5678K2Z6', 'Powai, Mumbai', 'Taloja, Mumbai', '901653458', 'devam@1234.com', '', 'Mumbai', '2026-09-23 04:12:54'),
  (3, 'Riya Patel', 'Riya Perfume Studio', '27LMNOP9012Q3Z7', 'Borivali, Mumbai', 'Dahisar, Mumbai', '9645879455', 'riya@gmail.com', 'Borivali', 'Mumbai', '2026-09-28 05:14:19'),
  (4, 'Aarav Boutique', 'Aarav Salon & Aroma', '36QRSTU3456V4Z8', 'Banjara Hills, Hyderabad', 'Madhapur, Hyderabad', '9874512360', 'aarav@fragrancehub.com', 'Banjara Hills', 'Hyderabad', '2026-09-15 08:30:00'),
  (5, 'Zoya Retail', 'Zoya Beauty House', '07WXYZA7890B5Z9', 'Connaught Place, Delhi', 'Dwarka, Delhi', '9988776655', 'zoya@beautyhouse.in', 'Connaught Place', 'Delhi', '2026-09-18 09:10:00')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  company_name = VALUES(company_name),
  gstin = VALUES(gstin),
  office_address = VALUES(office_address),
  godown_address = VALUES(godown_address),
  phone = VALUES(phone),
  email = VALUES(email),
  address = VALUES(address),
  city = VALUES(city);

INSERT INTO products (id, product_code, product_name, size, description, selling_price, product_date, expiry_date, client_id, created_at)
VALUES
  (1, 'PRF-001', 'Velvet Bloom', '100ml', 'Floral musk perfume', 2499.00, '2026-08-01', '2027-08-01', NULL, '2026-08-16 19:47:41'),
  (2, 'PRF-002', 'Noir Saffron', '75ml', 'Warm oriental fragrance', 2999.00, '2026-08-10', '2027-08-10', 1, '2026-08-20 12:00:00'),
  (3, 'PRF-003', 'Rose Alchemy', '50ml', 'Elegant rose accord', 1899.00, '2026-08-15', '2027-08-15', 2, '2026-08-25 09:30:00'),
  (4, 'PRF-004', 'Amber Veil', '120ml', 'Long-lasting amber blend', 3499.00, '2026-09-01', '2027-09-01', 3, '2026-09-01 15:15:00'),
  (5, 'PRF-005', 'Citrus Muse', '100ml', 'Fresh citrus opening', 2199.00, '2026-08-20', '2027-08-20', 4, '2026-09-12 11:20:00'),
  (6, 'PRF-006', 'Pearl Mist', '50ml', 'Light airy perfume mist', 1799.00, '2026-09-10', '2027-09-10', 5, '2026-09-20 14:00:00')
ON DUPLICATE KEY UPDATE
  product_code = VALUES(product_code),
  product_name = VALUES(product_name),
  size = VALUES(size),
  description = VALUES(description),
  selling_price = VALUES(selling_price),
  product_date = VALUES(product_date),
  expiry_date = VALUES(expiry_date),
  client_id = VALUES(client_id);

INSERT INTO materials (id, material_code, material_name, category, unit, current_stock, minimum_stock, vendor_name, material_rate, material_source, client_id, created_at)
VALUES
  (1, 'MAT-001', 'Rose Absolute', 'Essential Oil', 'ML', 150.00, 50.00, 'Aroma Supply Co.', 180.00, 'OWN', NULL, '2026-08-10 08:00:00'),
  (2, 'MAT-002', 'Sandalwood Oil', 'Base Oil', 'L', 90.00, 35.00, 'Forest Extracts', 260.00, 'OWN', NULL, '2026-08-11 08:00:00'),
  (3, 'MAT-003', 'Alcohol Base', 'Alcohol Blend', 'L', 120.00, 40.00, 'Rahul Enterprises', 110.00, 'CLIENT', 1, '2026-08-12 08:00:00'),
  (4, 'MAT-004', 'Amber Accord', 'Fragrance Compound', 'KG', 60.00, 25.00, 'Saffron Labs', 420.00, 'OWN', NULL, '2026-08-13 08:00:00'),
  (5, 'MAT-005', 'Glass Bottle', 'Packaging', 'PCS', 500.00, 150.00, 'Packaging Hub', 24.00, 'OWN', NULL, '2026-08-15 09:00:00')
ON DUPLICATE KEY UPDATE
  material_code = VALUES(material_code),
  material_name = VALUES(material_name),
  category = VALUES(category),
  unit = VALUES(unit),
  current_stock = VALUES(current_stock),
  minimum_stock = VALUES(minimum_stock),
  vendor_name = VALUES(vendor_name),
  material_rate = VALUES(material_rate),
  material_source = VALUES(material_source),
  client_id = VALUES(client_id);

INSERT INTO sales_orders (id, client_id, order_date, total_amount, status, created_at)
VALUES
  (1, 1, '2026-08-12 10:30:00', 2498.00, 'Completed', '2026-08-12 10:30:00'),
  (2, 2, '2026-08-20 14:10:00', 2198.00, 'Pending', '2026-08-20 14:10:00'),
  (3, 3, '2026-09-15 11:00:00', 2997.00, 'Completed', '2026-09-15 11:00:00'),
  (4, 1, '2026-09-22 16:20:00', 1898.00, 'Cancelled', '2026-09-22 16:20:00'),
  (5, 2, '2026-09-28 10:45:00', 3897.00, 'Completed', '2026-09-28 10:45:00')
ON DUPLICATE KEY UPDATE
  client_id = VALUES(client_id),
  order_date = VALUES(order_date),
  total_amount = VALUES(total_amount),
  status = VALUES(status);

INSERT INTO sales_items (id, sales_order_id, product_id, quantity, unit_price, total_price, created_at)
VALUES
  (1, 1, 2, 1, 1499.00, 1499.00, '2026-08-12 10:30:00'),
  (2, 1, 1, 1, 999.00, 999.00, '2026-08-12 10:30:00'),
  (3, 2, 3, 2, 799.00, 1598.00, '2026-08-20 14:10:00'),
  (4, 2, 1, 1, 999.00, 999.00, '2026-08-20 14:10:00'),
  (5, 3, 4, 1, 1299.00, 1299.00, '2026-09-15 11:00:00'),
  (6, 3, 2, 1, 1499.00, 1499.00, '2026-09-15 11:00:00'),
  (7, 3, 3, 1, 799.00, 799.00, '2026-09-15 11:00:00'),
  (8, 4, 1, 1, 999.00, 999.00, '2026-09-22 16:20:00'),
  (9, 4, 3, 1, 799.00, 799.00, '2026-09-22 16:20:00'),
  (10, 5, 4, 3, 1299.00, 3897.00, '2026-09-28 10:45:00')
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  quantity = VALUES(quantity),
  unit_price = VALUES(unit_price),
  total_price = VALUES(total_price);
