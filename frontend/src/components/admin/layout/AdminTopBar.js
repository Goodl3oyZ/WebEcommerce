"use client";

import Link from "next/link";
import { FaBars, FaSearch, FaStore } from "react-icons/fa";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getAdminNavItem } from "@/components/admin/adminNav";
import { useTabs } from "@/components/ui/Tabs";

export function AdminTopBar({ onOpenSidebar, onOpenSearch }) {
  const { value } = useTabs();
  const current = getAdminNavItem(value);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-3 py-3 backdrop-blur sm:px-4">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-fg md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        onClick={onOpenSidebar}
        aria-label="เปิดเมนู"
      >
        <FaBars />
      </button>
      <nav aria-label="breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-sm">
          <li className="text-fg-muted">แอดมิน</li>
          <li className="text-fg-subtle" aria-hidden>
            /
          </li>
          <li className="truncate font-semibold text-fg">{current.label}</li>
        </ol>
      </nav>
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-fg-muted transition-colors duration-150 hover:bg-border sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <FaSearch className="h-3.5 w-3.5" />
        ค้นหา
        <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-fg-subtle">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={onOpenSearch}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-fg sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="ค้นหา"
      >
        <FaSearch />
      </button>
      <Link
        href="/"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-fg transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="กลับหน้าร้าน"
      >
        <FaStore className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">หน้าร้าน</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
