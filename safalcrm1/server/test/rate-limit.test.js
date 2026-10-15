const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter, loginLimiter, publicEnquiryLimiter } = require("../middleware/rateLimit");

test("rate limiter caps attempts per caller and window", () => {
    const limit = createRateLimiter({ limit: 2, windowMs: 60000, message: "limited" });
    let passed = 0;
    let status;
    const request = { ip: `test-${Math.random()}`, socket: {} };
    const response = { status(code) { status = code; return this; }, json() { return this; } };
    limit(request, response, () => { passed += 1; });
    limit(request, response, () => { passed += 1; });
    limit(request, response, () => { passed += 1; });
    assert.equal(passed, 2);
    assert.equal(status, 429);
});

test("login and enquiry budgets are isolated for the same caller", () => {
    const ip = `shared-test-${Math.random()}`;
    const request = { ip, socket: {} };
    let loginPasses = 0;
    let enquiryPasses = 0;
    const response = { status() { return this; }, json() { return this; } };
    for (let i = 0; i < 5; i += 1) publicEnquiryLimiter(request, response, () => { enquiryPasses += 1; });
    for (let i = 0; i < 6; i += 1) loginLimiter(request, response, () => { loginPasses += 1; });
    assert.equal(enquiryPasses, 5);
    assert.equal(loginPasses, 6);
});
