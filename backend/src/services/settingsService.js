import { db } from "../config/db.js";
import { appSettings } from "../models/schema.js";
import { sql } from "drizzle-orm";

export const DEFAULT_SETTINGS = {
  siteName: "My Shop",
  maintenance: false,
  theme: "light",
  currency: "THB",
};

/** Settings anyone may read (the storefront needs them before login). */
const PUBLIC_KEYS = ["siteName", "maintenance", "theme", "currency"];

export const settingsService = {
  /** Stored values over defaults. Persisted, so they survive restarts and are shared by every instance. */
  async getSettings() {
    const rows = await db.select().from(appSettings);
    return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  },

  async getPublicSettings() {
    const all = await this.getSettings();
    return Object.fromEntries(PUBLIC_KEYS.map((key) => [key, all[key]]));
  },

  async updateSettings(changes) {
    const entries = Object.entries(changes);
    if (entries.length) {
      await db
        .insert(appSettings)
        .values(entries.map(([key, value]) => ({ key, value, updatedAt: new Date() })))
        .onConflictDoUpdate({ target: appSettings.key, set: { value: sql`excluded.value`, updatedAt: new Date() } });
    }
    return this.getSettings();
  },
};
