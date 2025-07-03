import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";

export function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = {
      page,
      limit,
      ...(search ? { search } : {}),
    };
    adminAPI
      .getUsers(params)
      .then((data) => {
        setUsers(data.users || data.items || []);
        setPagination(data.pagination || data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch users");
        setLoading(false);
      });
  }, [page, limit, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Users Management</h2>
        <input
          className="border rounded px-2 py-1"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
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
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Role</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="p-2 border">{user.id}</td>
                    <td className="p-2 border">{user.name || user.username}</td>
                    <td className="p-2 border">{user.email}</td>
                    <td className="p-2 border">
                      {user.role || (user.roles && user.roles[0]?.role)}
                    </td>
                    <td className="p-2 border">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2 border">
                      {/* TODO: Add actions: edit, change role, delete, ban/unban */}
                      <button className="text-blue-600 hover:underline mr-2">
                        Edit
                      </button>
                      <button className="text-green-600 hover:underline mr-2">
                        Change Role
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
