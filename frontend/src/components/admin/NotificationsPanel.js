import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminAPI
      .getNotifications?.()
      .then((data) => {
        setNotifications(data.notifications || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch notifications");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Notifications Management</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Title</th>
              <th className="p-2 border">Message</th>
              <th className="p-2 border">Created</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-4">
                  No notifications found.
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id}>
                  <td className="p-2 border">{n.title}</td>
                  <td className="p-2 border">{n.message}</td>
                  <td className="p-2 border">
                    {new Date(n.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2 border">
                    {/* TODO: Add actions: delete */}
                    <button className="text-red-600 hover:underline">
                      Delete
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
