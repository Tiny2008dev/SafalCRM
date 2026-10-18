-- Run once after 2026-10-15-b2b-enquiries.sql.
-- Backfill legacy rows with distinct opaque keys before enforcing NOT NULL/UNIQUE.

USE railway;
ALTER TABLE b2b_enquiries ADD COLUMN submission_key CHAR(64) NULL AFTER message;
UPDATE b2b_enquiries
SET submission_key = SHA2(CONCAT('legacy:', id), 256)
WHERE submission_key IS NULL;
ALTER TABLE b2b_enquiries MODIFY submission_key CHAR(64) NOT NULL;
ALTER TABLE b2b_enquiries ADD UNIQUE KEY uniq_b2b_enquiries_submission_key (submission_key);
