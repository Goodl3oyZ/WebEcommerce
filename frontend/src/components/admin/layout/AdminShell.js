"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminTopBar } from "@/components/admin/layout/AdminTopBar";
import { AdminCommandPalette } from "@/components/admin/layout/AdminCommandPalette";

export function AdminShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="admin-shell font-admin min-h-screen bg-canvas text-fg">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4">
            <p className="mb-4 px-2 text-lg font-bold text-fg">Admin</p>
            <AdminSidebar />
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="ปิดเมนู"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative z-10 h-full w-[min(18rem,86vw)] overflow-y-auto bg-surface p-4 shadow-card-hover">
              <p className="mb-4 px-2 text-lg font-bold text-fg">Admin</p>
              <AdminSidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopBar
            onOpenSidebar={() => setMobileOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />
          <div className="flex-1 p-3 sm:p-4 lg:p-6">{children}</div>
        </div>
      </div>
      <AdminCommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
