import process from "node:process";
import { loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "VITE_");
const name = "VITE_CRM_URL";
const value = process.env[name] || env[name];
if (!value) throw new Error(`Set ${name} to the deployed HTTPS CRM website URL before building for production.`);
let url;
try { url = new URL(value); } catch { throw new Error(`${name} must be a valid absolute URL.`); }
if (url.protocol !== "https:" || /^(localhost|127\.0\.0\.1)$/i.test(url.hostname)) {
  throw new Error(`${name} must use a deployed HTTPS URL in production.`);
}
