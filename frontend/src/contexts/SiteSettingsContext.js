"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axiosInstance from "@/lib/api/axiosInstance";

const DEFAULTS = { siteName: "CHALLENGE", maintenance: false, currency: "THB" };
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
  return <SiteSettingsContext.Provider value={{ ...settings, reload }}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
