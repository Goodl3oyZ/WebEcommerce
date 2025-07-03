import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

export function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminAPI
      .getSettings?.()
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch settings");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(settings, null, 2)}
        </pre>
      )}
    </div>
  );
}
