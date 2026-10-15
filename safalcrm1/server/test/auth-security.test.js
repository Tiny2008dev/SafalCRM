const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { authenticateToken, issueToken, validateAuthConfig } = require("../middleware/auth");

const secret = crypto.randomBytes(48).toString("hex");
const previous = { NODE_ENV: process.env.NODE_ENV, JWT_SECRET: process.env.JWT_SECRET };
process.env.NODE_ENV = "production";
process.env.JWT_SECRET = secret;

function signedToken(claims, key = secret) {
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const signature = crypto.createHmac("sha256", key).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

function verify(token) {
    let status;
    let body;
    let nextCalled = false;
    const response = { status(code) { status = code; return this; }, json(value) { body = value; return this; } };
    authenticateToken({ headers: { authorization: `Bearer ${token}` } }, response, () => { nextCalled = true; });
    return { status, body, nextCalled };
}

test.after(() => {
    if (previous.NODE_ENV === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.NODE_ENV;
    if (previous.JWT_SECRET === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous.JWT_SECRET;
});

test("production auth config rejects missing, placeholder and short secrets", () => {
    assert.throws(() => validateAuthConfig({ NODE_ENV: "production", JWT_SECRET: "" }), /JWT_SECRET/);
    assert.throws(() => validateAuthConfig({ NODE_ENV: "production", JWT_SECRET: "replace-this-with-a-strong-secret-12345" }), /JWT_SECRET/);
    assert.throws(() => validateAuthConfig({ NODE_ENV: "production", JWT_SECRET: "short" }), /JWT_SECRET/);
    assert.doesNotThrow(() => validateAuthConfig({ NODE_ENV: "production", JWT_SECRET: secret }));
});

test("valid signed admin token is accepted", () => {
    const token = issueToken({ id: 12, role: "admin" });
    assert.equal(verify(token).nextCalled, true);
});

test("forged signature is rejected", () => {
    const token = signedToken({ id: 12, role: "admin", exp: Date.now() + 60000 }, "attacker-controlled-key");
    assert.equal(verify(token).status, 401);
});

test("token signed with empty secret and missing configured secret is rejected", () => {
    const token = signedToken({ id: 12, role: "admin", exp: Date.now() + 60000 }, "");
    process.env.JWT_SECRET = "";
    assert.equal(verify(token).status, 401);
    assert.throws(() => issueToken({ id: 12, role: "admin" }), /JWT_SECRET/);
    process.env.JWT_SECRET = secret;
});

test("expired tokens and tokens with invalid claims are rejected", () => {
    assert.equal(verify(signedToken({ id: 12, role: "admin", exp: Date.now() - 1 })).status, 401);
    assert.equal(verify(signedToken({ id: 0, role: "admin", exp: Date.now() + 60000 })).status, 401);
    assert.equal(verify(signedToken({ id: 12.5, role: "admin", exp: Date.now() + 60000 })).status, 401);
    assert.equal(verify(signedToken({ id: 12, role: "bad role", exp: Date.now() + 60000 })).status, 401);
    assert.equal(verify(signedToken({ id: 12, role: "staff", exp: Date.now() + 60000, admin: true })).status, 401);
});
