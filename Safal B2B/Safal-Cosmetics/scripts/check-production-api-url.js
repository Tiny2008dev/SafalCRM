import { loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "VITE_");
const value = process.env.VITE_API_URL || env.VITE_API_URL;
if (!value) throw new Error("Set VITE_API_URL to the deployed HTTPS API URL before building for production.");
let url;
try { url = new URL(value); } catch { throw new Error("VITE_API_URL must be a valid absolute URL."); }
if (url.protocol !== "https:" || /^(localhost|127\.0\.0\.1)$/i.test(url.hostname)) {
  throw new Error("VITE_API_URL must use the deployed HTTPS API origin in production.");
}
