/**
 * GET from the API during server rendering (straight to the backend container
 * in production). Returns null on any failure so pages can show a fallback.
 */
export async function serverGet(path, { revalidate = 60 } = {}) {
  const base = process.env.BACKEND_URL || "http://localhost:5000";
  try {
    const res = await fetch(`${base}/api${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
