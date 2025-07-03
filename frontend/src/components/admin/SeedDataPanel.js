import { useState } from "react";
import { adminAPI } from "@/lib/api";

export function SeedDataPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSeed = async (type) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res;
      if (type === "orders") res = await adminAPI.seedFakeOrders();
      else if (type === "users") res = await adminAPI.seedFakeUsers();
      else if (type === "products") res = await adminAPI.seedFakeProducts();
      setResult(res);
    } catch (err) {
      setError(err.message || "Failed to seed data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Seed/Fake Data</h2>
      <div className="flex gap-4 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => handleSeed("orders")}
          disabled={loading}
        >
          Seed Orders
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => handleSeed("users")}
          disabled={loading}
        >
          Seed Users
        </button>
        <button
          className="px-4 py-2 bg-purple-600 text-white rounded"
          onClick={() => handleSeed("products")}
          disabled={loading}
        >
          Seed Products
        </button>
      </div>
      {loading && <div>Seeding...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {result && (
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
