const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "")).replace(/\/$/, "");
if (!API_BASE_URL) throw new Error("VITE_API_URL must be configured for production builds.");

export async function submitEnquiry(payload) {
  const response = await fetch(`${API_BASE_URL}/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Unable to submit your enquiry.");
  return data;
}
