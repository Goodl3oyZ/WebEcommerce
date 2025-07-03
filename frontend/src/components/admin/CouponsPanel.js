import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

export function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminAPI.getCouponStatistics(),
      adminAPI.getCouponStatistics().catch(() => null), // fallback
    ])
      .then(([stats]) => {
        setStatistics(stats);
        return adminAPI.getCouponStatistics(); // ใช้ getCouponStatistics แทน getCoupons (สมมุติไม่มี getCoupons)
      })
      .then((data) => {
        setCoupons(data.coupons || []); // สมมุติ response มี coupons
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch coupons");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Coupons Management</h2>
        {/* TODO: Add create coupon form/button */}
      </div>
      {statistics && (
        <div className="mb-4 text-sm text-gray-600">
          Statistics: {JSON.stringify(statistics)}
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Code</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Value</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4">
                    No coupons found.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td className="p-2 border">{coupon.code}</td>
                    <td className="p-2 border">{coupon.type}</td>
                    <td className="p-2 border">{coupon.value}</td>
                    <td className="p-2 border">
                      {coupon.isActive ? "Active" : "Inactive"}
                    </td>
                    <td className="p-2 border">
                      {/* TODO: Add actions: edit, activate/deactivate, delete */}
                      <button className="text-blue-600 hover:underline mr-2">
                        Edit
                      </button>
                      {coupon.isActive ? (
                        <button className="text-yellow-600 hover:underline mr-2">
                          Deactivate
                        </button>
                      ) : (
                        <button className="text-green-600 hover:underline mr-2">
                          Activate
                        </button>
                      )}
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
    </div>
  );
}
