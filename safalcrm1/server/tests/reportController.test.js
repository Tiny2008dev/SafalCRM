const test = require('node:test');
const assert = require('node:assert/strict');

const reportController = require('../controllers/reportController');

const requiredExports = [
    'getOrdersAnalytics',
    'getOrdersTimeSeries',
    'getClientAnalytics',
    'getOrderAnalytics',
    'getProductAnalytics',
    'getProductionAnalytics',
    'getInventoryAnalytics',
    'getReportsOverview',
    'buildReportFilters',
];

test('report controller exposes the analytics endpoints expected by the dashboard', () => {
    for (const name of requiredExports) {
        assert.equal(typeof reportController[name], 'function', `${name} should be defined`);
    }
});