import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

export function ShippingPanel() {
  const [methods, setMethods] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([adminAPI.getShippingMethods(), adminAPI.getShippingZones()])
      .then(([methodsData, zonesData]) => {
        setMethods(methodsData || []);
        setZones(zonesData || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch shipping data");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Shipping Management</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Shipping Methods</h3>
            <table className="min-w-full border text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Price</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {methods.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-4">
                      No methods found.
                    </td>
                  </tr>
                ) : (
                  methods.map((m) => (
                    <tr key={m.id}>
                      <td className="p-2 border">{m.name}</td>
                      <td className="p-2 border">{m.price}</td>
                      <td className="p-2 border">
                        {m.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="p-2 border">
                        {/* TODO: Add actions: edit, delete */}
                        <button className="text-blue-600 hover:underline mr-2">
                          Edit
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
          <div>
            <h3 className="font-semibold mb-2">Shipping Zones</h3>
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Base Cost</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-4">
                      No zones found.
                    </td>
                  </tr>
                ) : (
                  zones.map((z) => (
                    <tr key={z.id}>
                      <td className="p-2 border">{z.name}</td>
                      <td className="p-2 border">{z.baseCost}</td>
                      <td className="p-2 border">
                        {z.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="p-2 border">
                        {/* TODO: Add actions: edit, delete */}
                        <button className="text-blue-600 hover:underline mr-2">
                          Edit
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
        </>
      )}
    </div>
  );
}
