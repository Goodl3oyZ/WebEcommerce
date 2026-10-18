"use client";

import { useEffect } from "react";
import { handleSessionExpired, refreshSession } from "@/lib/api/sessionRefresh";

const LAST_TRY_KEY = "auth:last-refresh";

const safePath = (path) => (path && path.startsWith("/") && !path.startsWith("//") ? path : "/");

/**
 * The middleware sends protected pages here when the access token has expired
 * but a refresh token is still present: renew the session, then go back.
 */
export default function RefreshSessionPage() {
  useEffect(() => {
    const next = safePath(new URLSearchParams(window.location.search).get("redirect"));
    const toLogin = () => {
      handleSessionExpired();
      window.location.replace(`/auth/login?expired=1&redirect=${encodeURIComponent(next)}`);
    };

    // A second visit within seconds means the new token was not accepted: stop looping.
    let lastTry = 0;
    try {
      lastTry = Number(sessionStorage.getItem(LAST_TRY_KEY)) || 0;
      sessionStorage.setItem(LAST_TRY_KEY, String(Date.now()));
    } catch {}
    if (Date.now() - lastTry < 10_000) return toLogin();

    refreshSession()
      .then(() => window.location.replace(next))
      .catch(toLogin);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">
      กำลังตรวจสอบการเข้าสู่ระบบ…
    </div>
  );
}
