-- For legacy databases whose clients table predates these optional fields.
-- Inspect SHOW COLUMNS FROM clients first; run only the missing ADD COLUMN statements.
ALTER TABLE clients ADD COLUMN gstin VARCHAR(20) AFTER company_name;
ALTER TABLE clients ADD COLUMN office_address VARCHAR(255) AFTER gstin;
ALTER TABLE clients ADD COLUMN godown_address VARCHAR(255) AFTER office_address;
