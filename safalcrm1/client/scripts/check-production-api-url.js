const dotenv = require("dotenv");
for (const path of [".env.production.local", ".env.local", ".env.production", ".env"]) dotenv.config({ path, override: false, quiet: true });
const value = process.env.REACT_APP_API_URL;
if (!value) throw new Error("Set REACT_APP_API_URL to the deployed HTTPS API URL before building for production.");
let url;
try { url = new URL(value); } catch { throw new Error("REACT_APP_API_URL must be a valid absolute URL."); }
if (url.protocol !== "https:" || /^(localhost|127\.0\.0\.1)$/i.test(url.hostname)) {
    throw new Error("REACT_APP_API_URL must use the deployed HTTPS API origin in production.");
}