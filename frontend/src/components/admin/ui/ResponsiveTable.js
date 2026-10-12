"use client";

import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import EmptyState from "@/components/EmptyState";

export function ResponsiveTable({
  columns = [],
  data = [],
  rowKey = "id",
  emptyTitle = "ยังไม่มีข้อมูล",
  emptyDescription = "เมื่อมีข้อมูลจะแสดงที่นี่",
  emptyActionLabel,
  onEmptyAction,
  searchPlaceholder = "ค้นหาในตาราง...",
  enableSearch = true,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const raw = col.searchValue ? col.searchValue(row) : row[col.key];
        return String(raw ?? "").toLowerCase().includes(q);
      })
    );
  }, [columns, data, query]);

  const getKey = (row, index) =>
    typeof rowKey === "function" ? rowKey(row, index) : row[rowKey] ?? index;

  return (
    <div className="space-y-3">
      {enableSearch && (
        <label className="relative block">
          <span className="sr-only">{searchPlaceholder}</span>
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-150 focus:border-fg focus:outline-none focus:ring-2 focus:ring-fg"
          />
        </label>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {filtered.map((row, index) => (
              <li
                key={getKey(row, index)}
                className="rounded-2xl border border-border bg-surface p-4 shadow-card"
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0 last:pb-0 first:pt-0"
                  >
                    <span className="text-xs font-medium text-fg-muted">
                      {col.header}
                    </span>
                    <div className="text-right text-sm text-fg">
                      {col.render ? col.render(row) : row[col.key]}
                    </div>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          <div className="hidden max-h-[70vh] overflow-auto rounded-2xl border border-border md:block">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-muted">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted ${col.headerClassName || ""}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filtered.map((row, index) => (
                  <tr
                    key={getKey(row, index)}
                    className="transition-colors duration-150 hover:bg-surface-muted/70"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-fg ${col.className || ""}`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
