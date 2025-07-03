import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

const STATUS_OPTIONS = [
  "all",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState("all");
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = {
      page,
      limit,
      ...(status !== "all" ? { status } : {}),
    };
    adminAPI
      .getAllOrders(params)
      .then((data) => {
        setOrders(data.orders || data.items || []);
        setPagination(data.pagination || data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch orders");
        setLoading(false);
      });
  }, [page, limit, status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Orders Management</h2>
        <select
          className="border rounded px-2 py-1"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Order #</th>
                <th className="p-2 border">User</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="p-2 border">{order.orderNumber}</td>
                    <td className="p-2 border">
                      {order.user?.name || order.userId}
                    </td>
                    <td className="p-2 border">{order.status}</td>
                    <td className="p-2 border">
                      {order.totalAmount || order.total}
                    </td>
                    <td className="p-2 border">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2 border">
                      {/* TODO: Add actions: view, change status, refund, delete */}
                      <button className="text-blue-600 hover:underline mr-2">
                        View
                      </button>
                      <button className="text-green-600 hover:underline mr-2">
                        Change Status
                      </button>
                      <button className="text-yellow-600 hover:underline mr-2">
                        Refund
                      </button>
                      <button className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-between items-center mt-4">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span>
          Page {page} of {pagination.pages || 1}
        </span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
          disabled={page >= (pagination.pages || 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
