const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../app");
const { issueToken } = require("../middleware/auth");
const db = require("../config/db");

let server;
let baseUrl;
test.before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => new Promise((resolve) => server.close(resolve)));

test("local CRM frontend origin is allowed for API requests", { skip: Boolean(process.env.CORS_ORIGINS) }, async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "OPTIONS",
        headers: {
            Origin: "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
});

test("duplicate public enquiry request returns the original record", async () => {
    const originalQuery = db.query;
    let inserts = 0;
    db.query = async (sql) => {
        if (sql.startsWith("INSERT INTO b2b_enquiries")) {
            inserts += 1;
            if (inserts > 1) { const error = new Error("duplicate"); error.code = "ER_DUP_ENTRY"; throw error; }
            return [{ insertId: 91 }];
        }
        if (sql.includes("WHERE submission_key")) return [[{ id: 91 }]];
        throw new Error("Unexpected database call in enquiry test.");
    };
    const payload = { companyName: "Acme", contactPerson: "Buyer", email: "buyer@example.com", productInterest: "Perfume", message: "Please contact me", idempotencyKey: "request-key-123456789" };
    try {
        const submit = () => fetch(`${baseUrl}/api/enquiries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const first = await submit();
        const second = await submit();
        assert.equal(first.status, 201);
        assert.equal(second.status, 200);
        assert.equal((await second.json()).id, 91);
        assert.equal(inserts, 2);
    } finally { db.query = originalQuery; }
});

test("public enquiry rejects invalid input before database access", async () => {
    const response = await fetch(`${baseUrl}/api/enquiries`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: "", email: "invalid" }),
    });
    assert.equal(response.status, 400);
});

test("CRM enquiry list rejects unauthenticated requests", async () => {
    const response = await fetch(`${baseUrl}/api/enquiries`);
    assert.equal(response.status, 401);
});

test("CRM enquiry list filters results and returns a total for pagination", async () => {
    const originalQuery = db.query;
    const token = issueToken({ id: 1, role: "admin" });
    const calls = [];
    db.query = async (sql, values) => {
        calls.push({ sql, values });
        if (sql.startsWith("SELECT COUNT(*)")) return [[{ total: 1 }]];
        if (sql.startsWith("SELECT id, company_name")) return [[{
            id: 91, company_name: "Acme", contact_person: "Buyer", email: "buyer@example.com",
            phone: null, product_interest: "Perfume", quantity: 100, message: "Please contact me",
            status: "New", created_at: "2026-10-16 10:00:00",
        }]];
        throw new Error("Unexpected database call in enquiry list test.");
    };
    try {
        const response = await fetch(`${baseUrl}/api/enquiries?limit=25&offset=0&status=New&search=acme`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            enquiries: [{
                id: 91, company_name: "Acme", contact_person: "Buyer", email: "buyer@example.com",
                phone: null, product_interest: "Perfume", quantity: 100, message: "Please contact me",
                status: "New", created_at: "2026-10-16 10:00:00",
            }],
            limit: 25,
            offset: 0,
            total: 1,
        });
        assert.deepEqual(calls[0].values, ["New", "%acme%", "%acme%", "%acme%", "%acme%"]);
        assert.deepEqual(calls[1].values, ["New", "%acme%", "%acme%", "%acme%", "%acme%", 25, 0]);
    } finally { db.query = originalQuery; }
});

test("CRM enquiry list rejects unsupported status filters", async () => {
    const token = issueToken({ id: 1, role: "admin" });
    const response = await fetch(`${baseUrl}/api/enquiries?status=Archived`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 400);
});

test("non-admin CRM users cannot write through business APIs", async () => {
    const token = issueToken({ id: 2, role: "staff" });
    const response = await fetch(`${baseUrl}/api/clients`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}",
    });
    assert.equal(response.status, 403);
});
