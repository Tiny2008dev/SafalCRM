const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../config/db");
const controller = require("../controllers/productionController");

function setupDatabase({ failItemUpdate = false } = {}) {
    const state = { orderStatus: "Pending", stock: 10, consumed: 0, itemStatus: "Pending" };
    let tail = Promise.resolve();
    const original = { query: db.query, getConnection: db.getConnection };
    db.getConnection = async () => {
        let releaseLock;
        let snapshot;
        return {
            async beginTransaction() {
                const prior = tail;
                tail = new Promise((resolve) => { releaseLock = resolve; });
                await prior;
                snapshot = { ...state };
            },
            async query(sql, params) {
                if (/SELECT id, status FROM production_orders/.test(sql)) return [state.orderStatus ? [{ id: 4, status: state.orderStatus }] : []];
                if (/FROM production_items pi/.test(sql)) return [[{ id: 7, material_id: 2, required_quantity: 4, consumed_quantity: state.consumed, item_status: state.itemStatus, material_name: "Base", material_code: "B-1", unit: "kg", current_stock: state.stock }]];
                if (/UPDATE materials SET current_stock/.test(sql)) { state.stock -= params[0]; return [{ affectedRows: 1 }]; }
                if (/UPDATE production_items SET consumed_quantity/.test(sql)) {
                    if (failItemUpdate) throw new Error("simulated persistence failure");
                    state.consumed = params[0]; state.itemStatus = "Completed"; return [{ affectedRows: 1 }];
                }
                if (/UPDATE production_orders SET status/.test(sql)) { state.orderStatus = params[0]; return [{ affectedRows: 1 }]; }
                throw new Error(`Unexpected transactional query: ${sql}`);
            },
            async commit() { releaseLock(); },
            async rollback() { Object.assign(state, snapshot); releaseLock(); },
            release() {},
        };
    };
    db.query = async (sql) => {
        if (/SELECT po\.\*/.test(sql)) return [[{ id: 4, product_id: 1, product_name: "Sample", quantity: 2, status: state.orderStatus, production_date: "2026-10-15", created_at: new Date() }]];
        if (/SELECT\s+pi\.id/.test(sql)) return [[{ id: 7, production_id: 4, material_id: 2, required_quantity: 4, consumed_quantity: state.consumed, status: state.itemStatus, material_name: "Base", material_code: "B-1", unit: "kg" }]];
        throw new Error(`Unexpected pool query: ${sql}`);
    };
    return { state, restore() { db.query = original.query; db.getConnection = original.getConnection; } };
}

function invoke(status) {
    let responseCode = 200;
    let body;
    const res = { status(code) { responseCode = code; return this; }, json(value) { body = value; return this; } };
    return controller.updateProductionOrder({ params: { id: "4" }, body: { status } }, res).then(() => ({ responseCode, body }));
}

test("concurrent completion requests deduct inventory once and reject the second transition", async () => {
    const fake = setupDatabase();
    try {
        const results = await Promise.all([invoke("Completed"), invoke("Completed")]);
        assert.equal(results.filter((result) => result.responseCode === 200).length, 1);
        assert.equal(results.filter((result) => result.responseCode === 409).length, 1);
        assert.equal(fake.state.stock, 6);
        assert.equal(fake.state.orderStatus, "Completed");
        assert.equal(fake.state.consumed, 4);
    } finally { fake.restore(); }
});

test("inventory changes roll back when a transactional write fails", async () => {
    const fake = setupDatabase({ failItemUpdate: true });
    try {
        const result = await invoke("Completed");
        assert.equal(result.responseCode, 500);
        assert.equal(fake.state.stock, 10);
        assert.equal(fake.state.orderStatus, "Pending");
        assert.equal(fake.state.consumed, 0);
    } finally { fake.restore(); }
});

test("completed orders cannot be reopened or transition to Cancelled", async () => {
    const fake = setupDatabase();
    fake.state.orderStatus = "Completed";
    try {
        const result = await invoke("Pending");
        assert.equal(result.responseCode, 400);
        assert.equal(fake.state.orderStatus, "Completed");
        const cancel = await invoke("Cancelled");
        assert.equal(cancel.responseCode, 409);
        assert.equal(fake.state.orderStatus, "Completed");
        const retry = await invoke("Completed");
        assert.equal(retry.responseCode, 409);
        assert.equal(fake.state.stock, 10);
    } finally { fake.restore(); }
});
