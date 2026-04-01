// [C1] predictPower.js — client only sends `datetime` (ISO 8601).
// All 30 feature columns are now engineered server-side in views/predict.py.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Fetch a power prediction for a given datetime string.
 * @param {string} isoString  — ISO 8601 datetime, e.g. "2026-03-30T14:00:00"
 * @returns {Promise<object>} prediction result from the server
 */
export async function predictPower(isoString) {
  const url = new URL(`${API_BASE}/api/predict/time/`);
  url.searchParams.set("datetime", isoString);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Prediction failed (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch a power prediction based on completely custom sensor features.
 * @param {object} payload - The feature dictionary matching the model.
 */
export async function predictCustomPower(payload) {
  const res = await fetch(`${API_BASE}/api/predict/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Custom prediction failed (HTTP ${res.status})`);
  }
  return await res.json();
}
