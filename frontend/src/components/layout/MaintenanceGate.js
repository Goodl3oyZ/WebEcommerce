"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import Container from "@/components/shop/Container";

const STAFF = ["admin", "super_admin", "moderator"];

// Policy pages stay readable: login providers (e.g. Facebook) check them.
const OPEN_PATHS = ["/admin", "/auth", "/privacy", "/data-deletion"];

/**
 * True when this visitor sees the maintenance page instead of the current
 * page. The header and footer use it to drop the home page's dark,
 * transparent styling, which only suits the home hero.
 */
export function useMaintenanceBlocked() {
  const { maintenance } = useSiteSettings();
  const { user } = useAuth();
  const pathname = usePathname() || "";
  return Boolean(maintenance) && !OPEN_PATHS.some((p) => pathname.startsWith(p)) && !STAFF.includes(user?.role);
}

/** Shows a "closed for maintenance" page to customers while maintenance is on. */
export default function MaintenanceGate({ children }) {
  const { maintenance, siteName } = useSiteSettings();
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const blocked = useMaintenanceBlocked();

  if (!blocked) {
    return (
      <>
        {/* Floating, so it never shifts the page (the home hero sits under
            the transparent header). */}
        {maintenance && STAFF.includes(user?.role) && !pathname.startsWith("/admin") && (
          <Link
            href="/admin"
            role="status"
            className="fixed bottom-4 left-4 z-[104] flex max-w-[calc(100vw-6rem)] items-center gap-2 rounded-full border border-warning/30 bg-warning-soft px-4 py-2 text-xs font-semibold text-warning shadow-lg sm:bottom-6 sm:left-6"
          >
            <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">ปิดปรับปรุงอยู่ ลูกค้าเห็นหน้าปิดปรับปรุง · ไปหน้าตั้งค่า</span>
          </Link>
        )}
        {children}
      </>
    );
  }
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
        <Wrench className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold">{siteName} ปิดปรับปรุงชั่วคราว</h1>
      <p className="mt-3 max-w-md text-sm text-fg-muted">
        เรากำลังปรับปรุงระบบเพื่อประสบการณ์ที่ดีขึ้น กรุณากลับมาใหม่อีกครั้งในภายหลัง ขออภัยในความไม่สะดวก
      </p>
    </Container>
  );
}
