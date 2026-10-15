-- Removes the implicit administrator role from future direct inserts.
-- Existing users and their role values are unchanged.
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
