const test = require("node:test");
const assert = require("node:assert/strict");
const { validateDatabaseConfig } = require("../config/db");

test("production database config rejects missing fields and root", () => {
    assert.throws(() => validateDatabaseConfig({ NODE_ENV: "production", DB_HOST: "db", DB_USER: "app", DB_NAME: "crm", DB_PASSWORD: "" }), /DB_PASSWORD/);
    assert.throws(() => validateDatabaseConfig({ NODE_ENV: "production", DB_HOST: "db", DB_USER: "root", DB_NAME: "crm", DB_PASSWORD: "secret" }), /non-root/);
});

test("production database config accepts explicit dedicated credentials", () => {
    assert.doesNotThrow(() => validateDatabaseConfig({ NODE_ENV: "production", DB_HOST: "db.internal", DB_USER: "crm_app", DB_NAME: "safal_crm", DB_PASSWORD: "configured" }));
});
