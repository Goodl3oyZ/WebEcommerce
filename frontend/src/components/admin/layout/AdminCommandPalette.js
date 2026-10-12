"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { ADMIN_NAV } from "@/components/admin/adminNav";
import { useTabs } from "@/components/ui/Tabs";

export function AdminCommandPalette({ open, onClose }) {
  const { setValue } = useTabs();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_NAV;
    return ADMIN_NAV.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const go = (value) => {
    setValue(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="ปิดการค้นหา"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหาเมนูแอดมิน"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-card-hover"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <FaSearch className="h-4 w-4 text-fg-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเมนู... (⌘K)"
            className="w-full bg-transparent py-3 text-sm text-fg outline-none placeholder:text-fg-subtle"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results[0]) go(results[0].value);
            }}
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-fg-muted">
              ไม่พบเมนูที่ตรงกัน
            </li>
          ) : (
            results.map((item) => (
              <li key={item.value}>
                <button
                  type="button"
                  onClick={() => go(item.value)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-fg transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-fg-subtle">{item.group}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
