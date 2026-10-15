# Database migrations

Review target schema and take a restorable backup before applying migration DDL. Never use the normal application account for migrations. The connected database was observed without `b2b_enquiries`; migrations were not applied during remediation.

For B2B enquiries, apply `2026-10-15-b2b-enquiries.sql` first and `2026-10-15-b2b-enquiry-idempotency.sql` second. The first creates the intake table; the second adds a unique key so request retries do not create duplicate rows. See [SECURITY-OPERATIONS.md](SECURITY-OPERATIONS.md) for safe command examples and the least-privilege account transition plan.

`2026-10-15-client-address-columns.sql` applies only to legacy `clients` tables missing one or more optional address columns. The canonical schema already includes them. Inspect `SHOW COLUMNS FROM clients` and run only missing statements.

`2026-10-15-remove-user-role-default.sql` removes the existing schema's default administrator role from future direct inserts. It preserves all existing users and roles. Inspect the target definition before applying it.
