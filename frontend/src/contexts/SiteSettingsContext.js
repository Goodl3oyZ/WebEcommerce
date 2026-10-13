"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axiosInstance from "@/lib/api/axiosInstance";

const DEFAULTS = { siteName: "CHALLENGE", maintenance: false, currency: "THB", logoUrl: null };

/** The browser-tab icon: the uploaded logo, else the generated monogram. */
export const faviconHref = (settings) =>
  settings?.logoUrl || `/brand-icon?name=${encodeURIComponent(settings?.siteName || "")}`;
const SiteSettingsContext = createContext({ ...DEFAULTS, reload: () => {} });

/** Public store settings (name, maintenance) for every page. */
export function SiteSettingsProvider({ children, initial }) {
  const [settings, setSettings] = useState({ ...DEFAULTS, ...(initial || {}) });
  const reload = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/settings/public");
      const data = res.data?.data ?? res.data;
      if (data && typeof data === "object") setSettings((s) => ({ ...s, ...data }));
    } catch {
      // keep the last known values
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  // Keep the tab icon in step when an admin changes the logo or name (no reload needed).
  useEffect(() => {
    const href = faviconHref(settings);
    const links = document.querySelectorAll('link[rel~="icon"]');
    if (links.length) links.forEach((l) => l.getAttribute("href") !== href && l.setAttribute("href", href));
    else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = href;
      document.head.appendChild(link);
    }
  }, [settings.logoUrl, settings.siteName]); // eslint-disable-line react-hooks/exhaustive-deps
  return <SiteSettingsContext.Provider value={{ ...settings, reload }}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
