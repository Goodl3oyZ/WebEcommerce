import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

export function ReportsPanel() {
  const [sales, setSales] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminAPI.getSalesReport?.().catch(() => null),
      adminAPI.getProductReport?.().catch(() => null),
      adminAPI.getCustomerReport?.().catch(() => null),
      adminAPI.getSupplierReport?.().catch(() => null),
    ])
      .then(([sales, inventory, customer, supplier]) => {
        setSales(sales);
        setInventory(inventory);
        setCustomer(customer);
        setSupplier(supplier);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch reports");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Reports</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Sales Report</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(sales, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold">Inventory Report</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(inventory, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold">Customer Report</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(customer, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold">Supplier Report</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(supplier, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
