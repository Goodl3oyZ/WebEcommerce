import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

export function PaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // สมมุติ adminAPI มี getAllTransactions (ควรเพิ่มใน adminAPI ถ้ายังไม่มี)
    adminAPI
      .getAllTransactions?.()
      .then((data) => {
        setPayments(data.transactions || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch payments");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Payments Management</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Order</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-4">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.id}</td>
                  <td className="p-2 border">{p.orderId}</td>
                  <td className="p-2 border">{p.amount}</td>
                  <td className="p-2 border">{p.status}</td>
                  <td className="p-2 border">
                    {/* TODO: Add actions: update status, refund */}
                    <button className="text-green-600 hover:underline mr-2">
                      Update Status
                    </button>
                    <button className="text-yellow-600 hover:underline">
                      Refund
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
