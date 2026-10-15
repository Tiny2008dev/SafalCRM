-- Apply manually to the Safal CRM database after reviewing the target database.
-- This creates a separate intake table and does not modify existing CRM records.
CREATE TABLE IF NOT EXISTS b2b_enquiries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(40) NULL,
  product_interest VARCHAR(200) NOT NULL,
  quantity INT UNSIGNED NULL,
  message VARCHAR(3000) NOT NULL,
  status ENUM('New', 'Contacted', 'Qualified', 'Closed') NOT NULL DEFAULT 'New',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_b2b_enquiries_created (created_at, id),
  KEY idx_b2b_enquiries_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
