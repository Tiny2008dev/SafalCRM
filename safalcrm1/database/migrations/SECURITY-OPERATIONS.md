# Security operations and database access plan

## Least-privilege application account (reviewed plan; not executed)

The runtime uses parameterized operations on CRM tables. Login needs `SELECT, UPDATE` on `users` to read and upgrade legacy hashes. The one-time administrator provisioner uses a separate identity with `SELECT, INSERT` on `users`. Runtime CRUD tables are `clients`, `materials`, `products`, `bom`, `sales_orders`, and `sales_items`. Production needs `SELECT, INSERT, UPDATE` on `production_orders` and `production_items`; enquiry intake needs `SELECT, INSERT, UPDATE` on `b2b_enquiries`. No runtime feature needs `DELETE` on the user, production, or enquiry tables. Schema changes must use a separate migration operator account.

After confirming the database name and application host with the database owner, provision a dedicated account with a long random password held in a secret manager. Replace the placeholders below before running anything:

```sql
CREATE USER 'safalcrm_app'@'<application-host>' IDENTIFIED BY '<random-secret-from-secret-manager>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `safal_crm`.`clients` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `safal_crm`.`materials` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `safal_crm`.`products` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `safal_crm`.`bom` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE ON `safal_crm`.`production_orders` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE ON `safal_crm`.`production_items` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `safal_crm`.`sales_orders` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `safal_crm`.`sales_items` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, INSERT, UPDATE ON `safal_crm`.`b2b_enquiries` TO 'safalcrm_app'@'<application-host>';
GRANT SELECT, UPDATE ON `safal_crm`.`users` TO 'safalcrm_app'@'<application-host>';
SHOW GRANTS FOR 'safalcrm_app'@'<application-host>';
```

Provision administrators with a distinct short-lived account granted only `SELECT, INSERT` on `safal_crm.users`; set `PROVISION_DB_HOST`, `PROVISION_DB_USER`, `PROVISION_DB_PASSWORD`, and `PROVISION_DB_NAME` for that one-time command. Do not grant those provisioning credentials to the web process.

```sql
CREATE USER 'safalcrm_provision'@'<operator-host>' IDENTIFIED BY '<one-time-secret-from-secret-manager>';
GRANT SELECT, INSERT ON `safal_crm`.`users` TO 'safalcrm_provision'@'<operator-host>';
SHOW GRANTS FOR 'safalcrm_provision'@'<operator-host>';
```

Do not grant global privileges, `GRANT OPTION`, `FILE`, account administration, or DDL to the application account. Give a separate, temporary migration identity only the DDL privileges needed for an approved migration, then remove those privileges after the change.

### Safe account transition

1. Confirm the target database/schema and application host; take and verify a restorable backup.
2. Create the new account and schema-scoped grants. Do not modify or revoke the existing account yet.
3. Test the new identity from the application host against a staging copy first. Verify login, core CRM reads and writes, report reads, and enquiry intake. Confirm denied DDL and denied access outside the schema.
4. Set `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in the production secret manager. Restart one application instance and check health, login, dashboard, order, inventory and enquiry paths.
5. Keep the prior deployment serving traffic until the canary is verified. If checks fail, route traffic back to that still-running deployment. The hardened server intentionally refuses `DB_USER=root`; if same-version restart rollback is needed, provision and verify a second dedicated non-root rollback account with the same table-scoped grants first. Do not set the hardened server back to root or drop either dedicated account during diagnosis.
6. After an agreed observation period and backup, have the DBA remove the old account's global grants or retire that account. This audit/remediation did not execute any account or privilege statement.

## Schema migrations

The legacy `server/scripts/apply_schema_migration.js` helper now requires `MIGRATION_DB_HOST`, `MIGRATION_DB_USER`, `MIGRATION_DB_PASSWORD`, and `MIGRATION_DB_NAME` from protected configuration. Do not set these to the application identity. Prefer the reviewed version-controlled SQL files below for new deployments.

The connected database was observed without `b2b_enquiries`. Review `2026-10-15-b2b-enquiries.sql` followed by `2026-10-15-b2b-enquiry-idempotency.sql`, back up the target, verify `DB_NAME`, and apply them in order with a migration identity only after approval. The first DDL creates a standalone intake table; the second adds and backfills an opaque unique submission key. Neither changes CRM business rows. The runtime application account needs ordinary DML privileges on the new table.

Example with an interactive password prompt (run from the CRM repository root):

```sh
mysql --host="$DB_HOST" --user="$MIGRATION_DB_USER" --password --database="$DB_NAME" < database/migrations/2026-10-15-b2b-enquiries.sql
```

PowerShell equivalent:

```powershell
Get-Content .\database\migrations\2026-10-15-b2b-enquiries.sql | mysql --host=$env:DB_HOST --user=$env:MIGRATION_DB_USER --password --database=$env:DB_NAME
```

The password is prompted for; do not add it to the command line or source control. Repeat the command with `2026-10-15-b2b-enquiry-idempotency.sql`. Verify the table and unique index with `SHOW CREATE TABLE b2b_enquiries` and a schema-only check. Do not insert test records in production. `2026-10-15-remove-user-role-default.sql` is a separate migration to remove the schema's default admin role for future inserts; it preserves current users and should be applied only after inspecting the target `users.role` definition.

`2026-10-15-client-address-columns.sql` is only for legacy `clients` tables missing one or more of `gstin`, `office_address`, or `godown_address`. The canonical `safal_crm.sql` already defines these columns. Check `SHOW COLUMNS FROM clients` first and run only missing statements; this migration is not an unconditional script for the current schema.

## Administrator provisioning

Fresh database imports no longer seed a shared administrator password. To create a new administrator, set `ADMIN_USERNAME`, `ADMIN_EMAIL`, a unique `ADMIN_PASSWORD` of at least 16 characters, and the `PROVISION_DB_*` values in protected environment configuration, then run `node scripts/provision_admin.js` from `safalcrm1/server`. The script only inserts a new account and refuses to modify an existing username or email. Clear the temporary password and provisioning credentials after use. Existing accounts are not reset or deleted.

## HTTPS and reverse proxy

Terminate TLS at a managed load balancer or reverse proxy and configure it to overwrite forwarded protocol headers. Set `TRUST_PROXY_HOPS` to the exact trusted proxy hop count and `CORS_ORIGINS` to comma-separated HTTPS frontend origins. The Express app rejects production requests that do not arrive as HTTPS through that trusted proxy. Do not expose the development ports directly to the public internet.

For production frontend builds, set `REACT_APP_API_URL` in the CRM client build environment and `VITE_API_URL` in the B2B build environment to the real HTTPS API URL you control. Both build scripts reject missing, HTTP, and localhost production API URLs. Vite values are public browser configuration; never place database, JWT, migration, or provisioning credentials in either frontend environment.
