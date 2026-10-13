"use client";

import { usePathname } from "next/navigation";
import { Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import Container from "@/components/shop/Container";

const STAFF = ["admin", "super_admin", "moderator"];

/** Shows a "closed for maintenance" page to customers while maintenance is on. */
export default function MaintenanceGate({ children }) {
  const { maintenance, siteName } = useSiteSettings();
  const { user } = useAuth();
  const pathname = usePathname() || "";
  // Policy pages stay readable: login providers (e.g. Facebook) check them.
  const exempt =
    ["/admin", "/auth", "/privacy", "/data-deletion"].some((p) => pathname.startsWith(p)) || STAFF.includes(user?.role);

  if (!maintenance || exempt) {
    return (
      <>
        {maintenance && STAFF.includes(user?.role) && !pathname.startsWith("/admin") && (
          <p className="bg-warning-soft py-2 text-center text-xs font-medium text-warning">
            โหมดปิดปรับปรุงเปิดอยู่: ลูกค้าจะเห็นหน้าปิดปรับปรุงและสั่งซื้อไม่ได้
          </p>
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
